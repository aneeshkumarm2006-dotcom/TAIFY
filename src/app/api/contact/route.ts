import { NextResponse } from "next/server";
import { contactsCollection, type ContactMessage } from "@/lib/db/mongo";
import { sendLeadNotification } from "@/lib/email";
import { binRejected, guard, noteAttempt, toSpamRecord } from "@/lib/spam/guard";
import { isSilentReject, isStructurallyEmail } from "@/lib/spam/classify";
import { turnstileEnabled, verifyTurnstile } from "@/lib/spam/turnstile";

// nodemailer needs a real TCP socket, which the Edge runtime does not have.
export const runtime = "nodejs";
// The default 10s is tight once an SMTP handshake is in the path.
export const maxDuration = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim();
  const subject = String(b.subject ?? "").trim();
  const message = String(b.message ?? "").trim();
  const honeypot = String(b.website ?? "").trim();
  // Absent means the client sent no stamp at all, which is a different thing
  // from sending zero. classify() weights the two differently, so the
  // distinction has to survive the parse.
  const elapsedMs =
    b.elapsedMs === undefined || b.elapsedMs === null
      ? undefined
      : Number(b.elapsedMs);

  const ctx = await guard(
    req,
    {
      form: "contact",
      name,
      email,
      subject,
      message,
      honeypot,
      elapsedMs: Number.isFinite(elapsedMs) ? elapsedMs : undefined,
    },
    // Fingerprint the written content only. The address is deliberately left
    // out: a flood replays one message across a list of harvested addresses.
    [name, subject, message],
  );

  const { assessment } = ctx;

  // Turnstile first, and it is the one check that does not fail open. Verified
  // before the rate limit so a legitimate visitor who is merely over the cap
  // still gets the honest "try again later" rather than a CAPTCHA error.
  if (turnstileEnabled()) {
    const token = String(b.turnstileToken ?? "");
    const check = await verifyTurnstile(token, ctx.ip);
    if (!check.ok) {
      console.warn("[contact] turnstile rejected:", check.errors?.join(", "));
      await noteAttempt(ctx, { form: "contact", email, outcome: "turnstile-failed" });
      return NextResponse.json(
        { error: "That verification didn't go through. Please try again." },
        { status: 403 },
      );
    }
  }

  if (ctx.rateLimited) {
    await noteAttempt(ctx, {
      form: "contact",
      email,
      outcome: `rate-limited-${ctx.rateLimitScope}`,
    });
    return NextResponse.json(
      { error: "Too many messages. Try again later." },
      { status: 429 },
    );
  }

  // A rejected payload never reaches the contacts collection, but it is always
  // copied to the 30-day bin first, and the caller gets the same success shape a
  // real message gets. A bot that is told it failed only learns to try again.
  //
  // isSilentReject is what keeps a typo out of this branch: a malformed email
  // rejects, but it is the one reject a person can cause by typing, so it falls
  // through to the 400 below where they can see it and fix it.
  if (isSilentReject(assessment)) {
    await binRejected(ctx, "contact", { name, email, subject, message, honeypot });
    await noteAttempt(ctx, {
      form: "contact",
      email,
      outcome: `rejected-${assessment.category}`,
    });
    return NextResponse.json({ ok: true });
  }

  // Validation runs after the spam verdict so a bot cannot use the difference
  // between a 400 and a 200 to probe which of its fields we object to.
  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      { error: "Name, email, subject and message are all required." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email) || !isStructurallyEmail(email)) {
    return NextResponse.json(
      { error: "That email address doesn't look right." },
      { status: 400 },
    );
  }

  const col = await contactsCollection();
  if (!col)
    return NextResponse.json(
      { error: "Messages are temporarily unavailable." },
      { status: 503 },
    );

  const quarantined = assessment.verdict === "quarantine";

  const doc: ContactMessage = {
    name,
    email,
    // Bounded so a pasted essay cannot bloat a document or the notification.
    subject: subject.slice(0, 200),
    message: message.slice(0, 5000),
    // Quarantined messages start read, so they never touch the unread badge.
    // A badge that counts bots is one nobody trusts within a week.
    read: quarantined,
    createdAt: new Date().toISOString(),
    spam: toSpamRecord(assessment),
  };

  // Persist first: a mail failure must never cost us the message. Quarantined
  // messages are stored exactly like clean ones - the only difference is which
  // view they appear in and whether anybody is emailed about them.
  await col.insertOne(doc);
  await noteAttempt(ctx, {
    form: "contact",
    email,
    outcome: quarantined ? `quarantined-${assessment.category}` : "accepted",
  });

  if (quarantined) return NextResponse.json({ ok: true });

  // Awaited on purpose. Vercel freezes the function the moment the response is
  // returned, so a fire-and-forget send has its SMTP handshake killed
  // mid-flight: it works in dev and silently sends nothing in production.
  // sendLeadNotification never throws; the catch is belt-and-braces so that
  // awaiting it still cannot fail the submission.
  try {
    await sendLeadNotification({
      subject: `New contact enquiry from ${doc.name}: ${doc.subject}`,
      heading: "New message from the contact form",
      replyTo: doc.email,
      fields: [
        { label: "Name", value: doc.name },
        { label: "Email", value: doc.email },
        { label: "Subject", value: doc.subject },
        { label: "Message", value: doc.message },
        { label: "Sent at", value: doc.createdAt },
        { label: "Inbox", value: `${siteOrigin(req)}/admin/messages` },
      ],
    });
  } catch {
    // Already logged inside the mail module.
  }

  return NextResponse.json({ ok: true });
}

/** Origin of the deployment handling this request, for the admin deep link. */
function siteOrigin(req: Request): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = req.headers.get("host");
  return host ? `https://${host}` : "";
}
