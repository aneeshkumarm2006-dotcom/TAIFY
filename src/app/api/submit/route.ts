import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  submissionsCollection,
  submitLogCollection,
  toolsCollection,
  type Submission,
  type SubmissionRevision,
} from "@/lib/db/mongo";
import { findToolByUrl } from "@/lib/tools/create";
import { sendLeadNotification, sendSubmitterEmail } from "@/lib/email";
import { canonicalUrlKey, urlHost } from "@/lib/utils";

// nodemailer needs a real TCP socket, which the Edge runtime does not have.
export const runtime = "nodejs";
// The default 10s is tight once an SMTP handshake is in the path.
export const maxDuration = 30;

const WINDOW_MS = 60 * 60 * 1000; // 1h
const MAX_PER_IP = 5;
const MAX_PER_EMAIL = 3;
const MAX_PER_DOMAIN = 5;
/** A human cannot read the form and fill it in faster than this. */
const MIN_FILL_MS = 3_000;

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

  const col = await submissionsCollection();
  const tools = await toolsCollection();
  const log = await submitLogCollection();
  if (!col || !tools)
    return NextResponse.json(
      { error: "Submissions are temporarily unavailable." },
      { status: 503 },
    );

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ipHash = hashIp(ip);

  const name = String(b.name ?? "").trim();
  const url = String(b.url ?? "").trim();
  const submitterEmail = String(b.submitterEmail ?? "").trim();
  const urlKey = canonicalUrlKey(url);
  const emailDomain = submitterEmail.split("@")[1]?.toLowerCase() ?? "";

  const email = submitterEmail.toLowerCase();
  const note = (outcome: string) =>
    log
      ?.insertOne({ ipHash, email, emailDomain, urlKey, outcome, at: new Date() })
      .catch(() => {});

  // A bot fills every field it can see, including the one nobody can, and it
  // submits the instant the page parses. Both get the same answer a real
  // submission gets, so an author tuning their script learns nothing from it.
  const trap = String(b.company_website ?? "").trim();
  const elapsed = Number(b.elapsedMs ?? 0);
  if (trap || (elapsed > 0 && elapsed < MIN_FILL_MS)) {
    await note(trap ? "honeypot" : "too-fast");
    return NextResponse.json({ ok: true });
  }

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

  // Rate limit in the database, not in memory. The Map this replaces lived on
  // one serverless instance and died with it, so every cold start handed the
  // same submitter a fresh allowance - which is how one tool arrived four times
  // in six hours. Every attempt counts toward the cap, including the ones we
  // turn away, so retrying a rejected duplicate hits the ceiling sooner.
  if (log) {
    const since = new Date(Date.now() - WINDOW_MS);
    const [byIp, byEmail, byDomain] = await Promise.all([
      log.countDocuments({ ipHash, at: { $gt: since } }),
      log.countDocuments({ email, at: { $gt: since } }),
      emailDomain && !FREEMAIL.has(emailDomain)
        ? log.countDocuments({ emailDomain, at: { $gt: since } })
        : Promise.resolve(0),
    ]);
    if (
      byIp >= MAX_PER_IP ||
      byEmail >= MAX_PER_EMAIL ||
      byDomain >= MAX_PER_DOMAIN
    ) {
      await note("rate-limited");
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
    tagline: String(b.tagline ?? "").trim(),
    description: String(b.description ?? "").trim(),
    category: String(b.category ?? "").trim(),
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

  const stamp = new Date().toISOString();
  const doc: Submission = {
    urlKey,
    urlHost: urlHost(url),
    ...head,
    status: "pending",
    attempts: 1,
    revisions: [],
    flags: await initialFlags(url, emailDomain),
    ipHash,
    createdAt: stamp,
    updatedAt: stamp,
  };

  // Persist first: a mail failure must never cost us the lead.
  await col.insertOne(doc);
  await note("accepted");

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

/**
 * Salted hash of the caller's IP. Enough to count attempts in a window and to
 * spot one machine submitting ten tools, without keeping an address log.
 */
function hashIp(ip: string): string {
  const salt = process.env.SESSION_SECRET ?? "taify";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
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
