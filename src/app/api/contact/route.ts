import { NextResponse } from "next/server";
import { contactsCollection } from "@/lib/db/mongo";
import { sendLeadNotification } from "@/lib/email";

// nodemailer needs a real TCP socket, which the Edge runtime does not have.
export const runtime = "nodejs";
// The default 10s is tight once an SMTP handshake is in the path.
export const maxDuration = 30;

// Light in-memory rate limit per IP, matching /api/submit.
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW = 60 * 60 * 1000; // 1h
const MAX = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && now - rec.first < WINDOW && rec.count >= MAX) {
    return NextResponse.json(
      { error: "Too many messages. Try again later." },
      { status: 429 },
    );
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Honeypot: a hidden field no human ever fills. Bots fill everything, so a
  // value here means a bot. Return the same success shape it would have got
  // anyway - telling a spammer it was caught only teaches it to try again -
  // but store nothing and send no mail.
  if (String(b.website ?? "").trim()) {
    return NextResponse.json({ ok: true });
  }

  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim();
  const subject = String(b.subject ?? "").trim();
  const message = String(b.message ?? "").trim();

  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      { error: "Name, email, subject and message are all required." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
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

  const doc = {
    name,
    email,
    // Bounded so a pasted essay cannot bloat a document or the notification.
    subject: subject.slice(0, 200),
    message: message.slice(0, 5000),
    read: false,
    createdAt: new Date().toISOString(),
  };

  // Persist first: a mail failure must never cost us the message.
  await col.insertOne(doc);

  attempts.set(ip, {
    count: (rec && now - rec.first < WINDOW ? rec.count : 0) + 1,
    first: rec && now - rec.first < WINDOW ? rec.first : now,
  });

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
