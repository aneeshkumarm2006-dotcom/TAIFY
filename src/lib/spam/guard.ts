import "server-only";
import {
  blockedCollection,
  ensureSpamIndexes,
  formLogCollection,
  type SpamRecord,
} from "@/lib/db/mongo";
import {
  classify,
  type Assessment,
  type Candidate,
} from "@/lib/spam/classify";
import {
  clientIp,
  hashIp,
  hashNetwork,
  payloadFingerprint,
} from "@/lib/spam/fingerprint";

/**
 * The I/O half of the spam machinery: rate counters, duplicate lookups, and the
 * blocked bin. classify.ts stays pure; everything that needs the database lives
 * here.
 *
 * Every function in this file fails open. If Mongo blips, the submission is
 * allowed through. A form that drops real enquiries when a dependency hiccups
 * is worse than one that occasionally lets a bot past.
 */

/** Per-address cap, and the window it applies over. */
export const IP_WINDOW_MS = 60 * 60 * 1000; // 1h
export const MAX_PER_IP = 5;

/**
 * Per-neighbourhood cap, over a deliberately longer window.
 *
 * A per-address cap is free to evade: rent a /24 and every request looks like a
 * different visitor. Six hours across the whole block is what makes rotating
 * addresses cost money rather than time.
 */
export const NET_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h
export const MAX_PER_NET = 12;

/** Floods replay one payload across many harvested addresses. */
export const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface GuardContext {
  ip: string;
  ipHash: string;
  netHash: string;
  fingerprint: string;
  assessment: Assessment;
  /** True when this caller is over the per-IP or per-network cap. */
  rateLimited: boolean;
  /** Which cap tripped, for the message and the log line. */
  rateLimitScope: "ip" | "network" | null;
}

/**
 * Everything the routes need in one call: look up the counters, run the
 * classifier over the payload plus those counters, and hand back the verdict.
 *
 * `humanFields` is what gets fingerprinted for duplicate detection. Pass the
 * written content only and leave the email address out: a flood sends identical
 * text under a hundred different addresses, and including the address would
 * give every copy a unique fingerprint.
 */
export async function guard(
  req: Request,
  candidate: Candidate,
  humanFields: Array<string | undefined>,
): Promise<GuardContext> {
  const ip = clientIp(req);
  const ipHash = hashIp(ip);
  const netHash = hashNetwork(ip);
  const fingerprint = payloadFingerprint(humanFields);

  void ensureSpamIndexes();

  let ipCount = 0;
  let netCount = 0;
  let duplicate = false;

  try {
    const log = await formLogCollection();
    if (log) {
      const now = Date.now();
      const [ips, nets, dupes] = await Promise.all([
        log.countDocuments({ ipHash, at: { $gt: new Date(now - IP_WINDOW_MS) } }),
        netHash
          ? log.countDocuments({
              netHash,
              at: { $gt: new Date(now - NET_WINDOW_MS) },
            })
          : Promise.resolve(0),
        log.countDocuments({
          fingerprint,
          at: { $gt: new Date(now - DUPLICATE_WINDOW_MS) },
        }),
      ]);
      ipCount = ips;
      netCount = nets;
      duplicate = dupes > 0;
    }
  } catch {
    // Fail open: no counters means no rate signal, not a blocked submission.
  }

  const rateLimited = ipCount >= MAX_PER_IP || netCount >= MAX_PER_NET;

  const assessment = classify({
    ...candidate,
    duplicateWithin24h: duplicate,
    ipCount,
    subnetCount: netCount,
  });

  return {
    ip,
    ipHash,
    netHash,
    fingerprint,
    assessment,
    rateLimited,
    rateLimitScope: rateLimited
      ? ipCount >= MAX_PER_IP
        ? "ip"
        : "network"
      : null,
  };
}

/**
 * Rate limiting on its own, for endpoints with no payload to classify.
 *
 * /api/match is the reason this exists. It is an unauthenticated public POST
 * that calls the Anthropic API with the whole catalog in the prompt, so a loop
 * against it spends real money rather than filling a table. Nothing is stored
 * and nothing is emailed, so there is no submission to judge - only a caller to
 * count.
 *
 * Fails open, like everything else here.
 */
export async function rateOnly(
  req: Request,
  scope: string,
  opts: { perIp: number; perNet: number },
): Promise<{ limited: boolean; ipHash: string; netHash: string }> {
  const ip = clientIp(req);
  const ipHash = hashIp(ip);
  const netHash = hashNetwork(ip);

  try {
    const log = await formLogCollection();
    if (!log) return { limited: false, ipHash, netHash };
    const now = Date.now();
    const [ips, nets] = await Promise.all([
      log.countDocuments({
        ipHash,
        outcome: scope,
        at: { $gt: new Date(now - IP_WINDOW_MS) },
      }),
      netHash
        ? log.countDocuments({
            netHash,
            outcome: scope,
            at: { $gt: new Date(now - NET_WINDOW_MS) },
          })
        : Promise.resolve(0),
    ]);
    return {
      limited: ips >= opts.perIp || nets >= opts.perNet,
      ipHash,
      netHash,
    };
  } catch {
    return { limited: false, ipHash, netHash };
  }
}

/**
 * Record one attempt in the shared ledger.
 *
 * Every attempt counts toward the caps, including the ones we turn away, so
 * retrying a rejected payload hits the ceiling sooner rather than resetting it.
 */
export async function noteAttempt(
  ctx: Pick<GuardContext, "ipHash" | "netHash" | "fingerprint">,
  fields: {
    form: "contact" | "submit" | "match" | "newsletter";
    email: string;
    urlKey?: string;
    outcome: string;
  },
): Promise<void> {
  try {
    const log = await formLogCollection();
    await log?.insertOne({
      form: fields.form,
      ipHash: ctx.ipHash,
      netHash: ctx.netHash,
      fingerprint: ctx.fingerprint,
      email: fields.email.toLowerCase(),
      emailDomain: fields.email.split("@")[1]?.toLowerCase() ?? "",
      urlKey: fields.urlKey ?? "",
      outcome: fields.outcome,
      at: new Date(),
    });
  } catch {
    // The ledger is a convenience, never a gate.
  }
}

/**
 * Copy a rejected payload into the 30-day bin.
 *
 * This is not optional and it is not best-effort in intent: it is the thing
 * that makes rejecting anything defensible. The try/catch only exists so a
 * database failure cannot turn into a 500 on a form the visitor is watching -
 * if the write fails we would rather still answer 200 than expose the filter.
 */
export async function binRejected(
  ctx: Pick<GuardContext, "ipHash" | "netHash" | "assessment">,
  form: "contact" | "submit",
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    void ensureSpamIndexes();
    const bin = await blockedCollection();
    await bin?.insertOne({
      form,
      payload,
      verdict: "reject",
      score: ctx.assessment.score,
      category: ctx.assessment.category,
      reasons: ctx.assessment.reasons,
      codes: ctx.assessment.signals.map((s) => s.code),
      ipHash: ctx.ipHash,
      netHash: ctx.netHash,
      at: new Date(),
    });
  } catch (err) {
    // Loud on the server, silent to the caller. A rejection we failed to bin is
    // exactly the thing this whole design exists to prevent, so it should be
    // visible in the logs even though the visitor still gets a 200.
    console.error("[spam] failed to bin a rejected submission", err);
  }
}

/** The assessment, in the shape stored on a submission or contact document. */
export function toSpamRecord(a: Assessment): SpamRecord {
  return {
    verdict: a.verdict,
    score: a.score,
    category: a.category,
    reasons: a.reasons,
    codes: a.signals.map((s) => s.code),
    at: new Date().toISOString(),
  };
}
