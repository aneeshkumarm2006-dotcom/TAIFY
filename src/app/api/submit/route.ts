import { NextResponse } from "next/server";
import {
  formLogCollection,
  submissionsCollection,
  toolsCollection,
  type Submission,
  type SubmissionRevision,
} from "@/lib/db/mongo";
import { findToolByUrl } from "@/lib/tools/create";
import { sendLeadNotification, sendSubmitterEmail } from "@/lib/email";
import { canonicalUrlKey, urlHost } from "@/lib/utils";
import { CATEGORIES } from "@/data/tools";
import { binRejected, guard, noteAttempt, toSpamRecord } from "@/lib/spam/guard";
import { isSilentReject } from "@/lib/spam/classify";
import { turnstileEnabled, verifyTurnstile } from "@/lib/spam/turnstile";

// nodemailer needs a real TCP socket, which the Edge runtime does not have.
export const runtime = "nodejs";
// The default 10s is tight once an SMTP handshake is in the path.
export const maxDuration = 30;

const WINDOW_MS = 60 * 60 * 1000; // 1h
const MAX_PER_EMAIL = 3;
const MAX_PER_DOMAIN = 5;

/** The only values the category dropdown can emit. Anything else is a script. */
const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

/**
 * Shared inboxes. The per-domain cap skips these: four people submitting from
 * gmail.com in an hour is a normal Tuesday, and locking the fourth one out
 * because of the other three would be our bug, not their abuse. The per-address
 * cap still applies to them, which is what actually catches a repeat submitter.
 */
const FREEMAIL = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
  "yahoo.com", "yahoo.co.uk", "icloud.com", "me.com", "aol.com", "gmx.com",
  "gmx.de", "mail.com", "proton.me", "protonmail.com", "yandex.com",
  "qq.com", "163.com", "126.com", "t-online.de", "web.de",
]);

/**
 * Throwaway inboxes. Not a block - a flag on the record, because a submission
 * from an address that stops existing tomorrow cannot be verified or followed
 * up, and that is worth knowing before spending review time on it.
 *
 * It stays a flag and never becomes a score, on the evidence: armandabe@
 * agentmail.to became the published Operator listing and sjvduetp@163cc.online
 * became JPG2Excel. Both look synthetic. Both were real.
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
  "agentmail.to",
  "163cc.online",
];

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const name = String(b.name ?? "").trim();
  const url = String(b.url ?? "").trim();
  const tagline = String(b.tagline ?? "").trim();
  const description = String(b.description ?? "").trim();
  const category = String(b.category ?? "").trim();
  const submitterEmail = String(b.submitterEmail ?? "").trim();
  const trap = String(b.company_website ?? "").trim();
  const urlKey = canonicalUrlKey(url);
  const emailDomain = submitterEmail.split("@")[1]?.toLowerCase() ?? "";
  const email = submitterEmail.toLowerCase();

  // A stamp of 0 means the client had no render time to report - an old cached
  // bundle, or a direct POST. That is not the same as "submitted instantly", so
  // it must not arrive at the classifier looking like it.
  const rawElapsed = Number(b.elapsedMs ?? 0);
  const elapsedMs =
    Number.isFinite(rawElapsed) && rawElapsed > 0 ? rawElapsed : undefined;

  const ctx = await guard(
    req,
    {
      form: "submit",
      name,
      email: submitterEmail,
      // The tagline and description are the only prose on this form.
      message: [tagline, description].filter(Boolean).join("\n"),
      // Never scored as a link: on this form the URL is the submission.
      url,
      category,
      allowedCategories: CATEGORY_IDS,
      honeypot: trap,
      elapsedMs,
    },
    [name, tagline, description],
  );

  const { assessment } = ctx;
  const note = (outcome: string) =>
    noteAttempt(ctx, { form: "submit", email, urlKey, outcome });

  // Turnstile first, and the one check that does not fail open.
  if (turnstileEnabled()) {
    const check = await verifyTurnstile(String(b.turnstileToken ?? ""), ctx.ip);
    if (!check.ok) {
      console.warn("[submit] turnstile rejected:", check.errors?.join(", "));
      await note("turnstile-failed");
      return NextResponse.json(
        { error: "That verification didn't go through. Please try again." },
        { status: 403 },
      );
    }
  }

  // Rejected payloads are copied to the 30-day bin and answered exactly as a
  // real submission is answered, so an author tuning their script learns
  // nothing from the response. Nothing reaches the submissions collection.
  //
  // isSilentReject keeps a typo out of this branch: a malformed email rejects,
  // but it is the one reject a person can cause by typing, so it falls through
  // to the 400 below where they can see it and fix it.
  if (isSilentReject(assessment)) {
    await binRejected(ctx, "submit", {
      name, url, tagline, description, category, submitterEmail,
      images: b.images, video: b.video, honeypot: trap,
    });
    await note(`rejected-${assessment.category}`);
    return NextResponse.json({ ok: true });
  }

  const col = await submissionsCollection();
  const tools = await toolsCollection();
  const log = await formLogCollection();
  if (!col || !tools)
    return NextResponse.json(
      { error: "Submissions are temporarily unavailable." },
      { status: 503 },
    );

  if (!name || !url)
    return NextResponse.json(
      { error: "Tool name and website are required." },
      { status: 400 },
    );
  if (!urlKey)
    return NextResponse.json(
      { error: "That website address doesn't look right." },
      { status: 400 },
    );
  if (!looksLikeEmail(submitterEmail))
    return NextResponse.json(
      {
        error:
          "A valid email is required so we can reach you about the listing.",
      },
      { status: 400 },
    );

  // Rate limits live in the database, not in memory. The Map this replaces
  // lived on one serverless instance and died with it, so every cold start
  // handed the same submitter a fresh allowance - which is how one tool arrived
  // four times in six hours. The IP and network caps are checked inside
  // guard(); these two are specific to this form.
  if (ctx.rateLimited) {
    await note(`rate-limited-${ctx.rateLimitScope}`);
    return NextResponse.json(
      { error: "Too many submissions. Try again later." },
      { status: 429 },
    );
  }
  if (log) {
    const since = new Date(Date.now() - WINDOW_MS);
    const [byEmail, byDomain] = await Promise.all([
      log.countDocuments({ email, at: { $gt: since } }),
      emailDomain && !FREEMAIL.has(emailDomain)
        ? log.countDocuments({ emailDomain, at: { $gt: since } })
        : Promise.resolve(0),
    ]);
    if (byEmail >= MAX_PER_EMAIL || byDomain >= MAX_PER_DOMAIN) {
      await note("rate-limited-email");
      return NextResponse.json(
        { error: "Too many submissions. Try again later." },
        { status: 429 },
      );
    }
  }

  // Already in the catalog? Compared by host, so a trailing slash or a utm tag
  // cannot get a second copy of a live listing into the queue.
  const listed = await findToolByUrl(tools, url);
  if (listed) {
    await note("already-listed");
    return NextResponse.json(
      {
        error: `${listed.name} is already listed on TAIFY.`,
        existingSlug: listed.slug,
      },
      { status: 409 },
    );
  }

  const head = {
    name,
    url,
    tagline,
    description,
    category,
    images: Array.isArray(b.images)
      ? (b.images as string[]).filter(Boolean).slice(0, 8)
      : [],
    video: String(b.video ?? "").trim(),
    submitterEmail,
  };

  const existing = await col.findOne({ urlKey });
  if (existing) {
    // One document per URL, always. A repeat submission refreshes the copy we
    // will review and keeps the previous one, rather than adding a row.
    const prior: SubmissionRevision = {
      at: existing.updatedAt || existing.createdAt,
      name: existing.name,
      url: existing.url,
      tagline: existing.tagline,
      description: existing.description,
      category: existing.category,
      images: existing.images ?? [],
      video: existing.video ?? "",
      submitterEmail: existing.submitterEmail ?? "",
    };

    if (existing.status === "pending") {
      await col.updateOne(
        { _id: existing._id },
        {
          $set: { ...head, updatedAt: new Date().toISOString() },
          $inc: { attempts: 1 },
          $push: { revisions: { $each: [prior], $slice: -20 } },
        },
      );
      await note("duplicate-pending");
      return NextResponse.json(
        {
          error:
            "This tool is already in our review queue - we've updated it with the details you just sent.",
          duplicate: true,
        },
        { status: 409 },
      );
    }

    // Decided already: keep the decision and its reason intact.
    await col.updateOne({ _id: existing._id }, { $inc: { attempts: 1 } });
    await note(`duplicate-${existing.status}`);
    if (existing.status === "approved")
      return NextResponse.json(
        {
          error: "This tool is already listed on TAIFY.",
          existingSlug: existing.publishedSlug,
        },
        { status: 409 },
      );
    return NextResponse.json(
      {
        error:
          "We've reviewed this tool before and didn't list it. Reply to our email if something has changed since.",
      },
      { status: 409 },
    );
  }

  // Quarantine is stored exactly like anything else, just parked in the Spam
  // tab with its reasoning attached and nobody emailed about it. It is a place
  // a human looks, not a bin.
  const quarantined = assessment.verdict === "quarantine";

  const stamp = new Date().toISOString();
  const doc: Submission = {
    urlKey,
    urlHost: urlHost(url),
    ...head,
    status: quarantined ? "spam" : "pending",
    attempts: 1,
    revisions: [],
    flags: await initialFlags(url, emailDomain),
    ipHash: ctx.ipHash,
    createdAt: stamp,
    updatedAt: stamp,
    spam: toSpamRecord(assessment),
  };

  // Persist first: a mail failure must never cost us the lead.
  await col.insertOne(doc);
  await note(quarantined ? `quarantined-${assessment.category}` : "accepted");

  // A quarantined submission gets the ordinary success response - the submitter
  // is not told they tripped a filter - but no notification goes out and no
  // acknowledgement is sent, because replying to a bot confirms the address.
  if (quarantined) return NextResponse.json({ ok: true });

  // Awaited on purpose. Vercel freezes the function the moment the response is
  // returned, so a fire-and-forget send has its SMTP handshake killed
  // mid-flight: it works in dev and silently sends nothing in production.
  // Neither send throws; the catch is belt-and-braces so that awaiting them
  // still cannot fail the submission.
  try {
    await sendLeadNotification({
      subject: `New tool submission: ${doc.name}`,
      heading: "A new tool was submitted for review",
      replyTo: doc.submitterEmail,
      fields: [
        { label: "Tool name", value: doc.name },
        { label: "Website", value: doc.url },
        { label: "Tagline", value: doc.tagline },
        { label: "What it solves", value: doc.description },
        { label: "Category", value: doc.category },
        { label: "Screenshots", value: doc.images.join("\n") },
        { label: "Demo video", value: doc.video },
        { label: "Submitter email", value: doc.submitterEmail },
        { label: "Flags", value: doc.flags.join(", ") },
        { label: "Submitted at", value: doc.createdAt },
        { label: "Review it", value: `${siteOrigin(req)}/admin/submissions` },
      ],
    });
    await sendSubmitterEmail({
      to: doc.submitterEmail,
      subject: `We got your submission: ${doc.name}`,
      heading: `Thanks for submitting ${doc.name}`,
      body: [
        "A person reads every submission before anything goes live, so this takes a few days rather than a few minutes.",
        "We check that the link works, that the price matches your own pricing page, and that the tool does what the tagline claims. If something doesn't line up we'll come back to you rather than publish it wrong.",
        "You'll hear from us either way: a link to your listing, or the reason we didn't list it.",
      ],
    });
  } catch {
    // Already logged inside the mail module.
  }

  return NextResponse.json({ ok: true });
}

/** Deliberately loose: rejecting a real address is worse than taking a fake one. */
function looksLikeEmail(v: string): boolean {
  const at = v.indexOf("@");
  if (at <= 0 || at !== v.lastIndexOf("@")) return false;
  if (v.includes(" ")) return false;
  const domain = v.slice(at + 1);
  return domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".");
}

/** What the reviewer should know before opening this one. */
async function initialFlags(url: string, emailDomain: string): Promise<string[]> {
  const flags: string[] = [];
  if (DISPOSABLE.includes(emailDomain)) flags.push("disposable-email");
  if (!(await urlResponds(url))) flags.push("dead-link");
  return flags;
}

/** True when the submitted site answers at all. Never throws, never blocks long. */
async function urlResponds(url: string): Promise<boolean> {
  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await fetch(target, {
        method,
        redirect: "follow",
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) return true;
    } catch {
      // Try the next method, then give up.
    }
  }
  return false;
}

/** Origin of the deployment handling this request, for the admin deep link. */
function siteOrigin(req: Request): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = req.headers.get("host");
  return host ? `https://${host}` : "";
}
