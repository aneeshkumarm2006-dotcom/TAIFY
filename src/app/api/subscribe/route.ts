import { NextResponse } from "next/server";
import {
  ensureNewsletterIndexes,
  subscribersCollection,
  type Subscriber,
} from "@/lib/db/mongo";
import { noteAttempt, rateOnly } from "@/lib/spam/guard";
import { isStructurallyEmail } from "@/lib/spam/classify";
import { clientIp, hashIp, hashNetwork } from "@/lib/spam/fingerprint";
import { FAST_FILL_MS } from "@/lib/newsletter/triggers";

// Mongo's driver wants a real socket, which the Edge runtime does not have.
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Which modal rule fired. Anything else is recorded as "unknown". */
const TRIGGERS = new Set(["tools", "dwell", "exit"]);

/**
 * Caps for this endpoint specifically, counted in its own `outcome` scope.
 *
 * Higher than the submit form's allowance and for a reason: one household or
 * one office behind a single address can legitimately produce several signups
 * in an hour, and the payload here is a single email — there is nothing to
 * flood a queue with. The cap exists to stop a script enumerating a harvested
 * list into the collection, not to ration people.
 */
const PER_IP = 8;
const PER_NET = 25;

/**
 * Free-tier addresses that exist to be thrown away.
 *
 * A flag on the record, never a rejection. That is the line the submit form
 * already draws, on evidence: two addresses that looked synthetic became
 * published listings, and a newsletter has even less to lose — an address that
 * never opens anything costs nothing and drops off the list on its own.
 */
const DISPOSABLE = [
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "sharklasers.com",
  "throwawaymail.com",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const honeypot = String(body.website ?? "").trim();
  const path = String(body.path ?? "").slice(0, 200);
  const rawTrigger = String(body.trigger ?? "");
  const source = TRIGGERS.has(rawTrigger) ? rawTrigger : "unknown";

  // Absent means the client sent no stamp at all — a direct POST, or a browser
  // running a bundle from before the stamp shipped. That is a different thing
  // from sending zero, and the distinction has to survive the parse.
  const rawElapsed =
    body.elapsedMs === undefined || body.elapsedMs === null
      ? undefined
      : Number(body.elapsedMs);
  const elapsedMs = Number.isFinite(rawElapsed) ? rawElapsed : undefined;

  // ── Honeypot ───────────────────────────────────────────────────────────────
  // The one signal here that is machine-certain: the field is display:none and
  // aria-hidden, so no person can fill it. Answered with the same success shape
  // a real signup gets — a bot that is told it failed only learns to try again.
  if (honeypot) {
    const ip = clientIp(req);
    await noteAttempt(
      { ipHash: hashIp(ip), netHash: hashNetwork(ip), fingerprint: "" },
      { form: "newsletter", email, outcome: "rejected-honeypot" },
    );
    return NextResponse.json({ ok: true });
  }

  // ── Rate limit ─────────────────────────────────────────────────────────────
  // Fails open, like the rest of the spam machinery: a Mongo blip must not cost
  // us a subscriber.
  const rate = await rateOnly(req, "newsletter", { perIp: PER_IP, perNet: PER_NET });
  if (rate.limited) {
    await noteAttempt(
      { ipHash: rate.ipHash, netHash: rate.netHash, fingerprint: "" },
      { form: "newsletter", email, outcome: "rate-limited" },
    );
    return NextResponse.json(
      { error: "Too many signups from here. Try again later." },
      { status: 429 },
    );
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  // A typo is the single most likely failure on a one-field form, so this is
  // the one thing the visitor is told about rather than silently swallowed.
  if (!email) {
    return NextResponse.json({ error: "Enter an email address." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || !isStructurallyEmail(email)) {
    return NextResponse.json(
      { error: "That email address doesn't look right." },
      { status: 400 },
    );
  }

  const emailDomain = email.split("@")[1] ?? "";

  // Notes on the record, not gates. `fast-fill` in particular: the offer is one
  // sentence and one field, so a decisive reader with autofill really can be
  // through it in a second, and dropping them would cost a genuine subscriber
  // to catch a bot the honeypot already catches.
  const flags: string[] = [];
  if (elapsedMs !== undefined && elapsedMs < FAST_FILL_MS) flags.push("fast-fill");
  if (elapsedMs === undefined) flags.push("no-timing");
  if (DISPOSABLE.includes(emailDomain)) flags.push("disposable-email");

  const col = await subscribersCollection();
  if (!col) {
    return NextResponse.json(
      { error: "Signups are temporarily unavailable." },
      { status: 503 },
    );
  }
  void ensureNewsletterIndexes();

  const now = new Date().toISOString();

  // Upsert rather than insert-and-catch-11000. Someone who subscribed from a
  // tool page in March and again from a blog post in June is one subscriber:
  // `createdAt` stays the first time, `sources` gains the second page.
  const insertOnly: Omit<Subscriber, "sources" | "flags" | "path" | "updatedAt"> = {
    email,
    emailDomain,
    status: "active",
    ipHash: rate.ipHash,
    netHash: rate.netHash,
    createdAt: now,
  };

  try {
    const result = await col.updateOne(
      { email },
      {
        $setOnInsert: insertOnly,
        // `path` is the most recent signup page, deliberately overwritten.
        $set: { path, updatedAt: now },
        // $addToSet keeps the union without duplicating a repeat trigger.
        $addToSet: { sources: source, flags: { $each: flags } },
      },
      { upsert: true },
    );

    await noteAttempt(
      { ipHash: rate.ipHash, netHash: rate.netHash, fingerprint: "" },
      {
        form: "newsletter",
        email,
        outcome: result.upsertedCount ? "subscribed" : "already-subscribed",
      },
    );

    // The client suppresses the modal forever either way. Somebody already on
    // the list who signs up again has not made a mistake and is not told they
    // have — `already` is there for analytics, not for a message.
    return NextResponse.json({ ok: true, already: result.upsertedCount === 0 });
  } catch (err) {
    console.error("[subscribe] failed to store a signup", err);
    return NextResponse.json(
      { error: "Signups are temporarily unavailable." },
      { status: 503 },
    );
  }
}
