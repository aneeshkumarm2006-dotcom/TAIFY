import { NextResponse } from "next/server";
import { submissionsCollection } from "@/lib/db/mongo";
import { sendLeadNotification } from "@/lib/email";

// nodemailer needs a real TCP socket, which the Edge runtime does not have.
export const runtime = "nodejs";
// The default 10s is tight once an SMTP handshake is in the path.
export const maxDuration = 30;

// Light in-memory rate limit per IP.
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW = 60 * 60 * 1000; // 1h
const MAX = 5;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && now - rec.first < WINDOW && rec.count >= MAX) {
    return NextResponse.json(
      { error: "Too many submissions. Try again later." },
      { status: 429 },
    );
  }

  const col = await submissionsCollection();
  if (!col)
    return NextResponse.json(
      { error: "Submissions are temporarily unavailable." },
      { status: 503 },
    );

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(b.name ?? "").trim();
  const url = String(b.url ?? "").trim();
  if (!name || !url)
    return NextResponse.json(
      { error: "Tool name and website are required." },
      { status: 400 },
    );

  const doc = {
    name,
    url,
    tagline: String(b.tagline ?? "").trim(),
    description: String(b.description ?? "").trim(),
    category: String(b.category ?? "").trim(),
    images: Array.isArray(b.images) ? (b.images as string[]).filter(Boolean).slice(0, 8) : [],
    video: String(b.video ?? "").trim(),
    submitterEmail: String(b.submitterEmail ?? "").trim(),
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };

  // Persist first: a mail failure must never cost us the lead.
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
        { label: "Submitted at", value: doc.createdAt },
        { label: "Review it", value: `${siteOrigin(req)}/admin/submissions` },
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
