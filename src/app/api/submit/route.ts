import { NextResponse } from "next/server";
import { submissionsCollection } from "@/lib/db/mongo";

export const runtime = "nodejs";

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

  await col.insertOne({
    name,
    url,
    tagline: String(b.tagline ?? "").trim(),
    description: String(b.description ?? "").trim(),
    category: String(b.category ?? "").trim(),
    images: Array.isArray(b.images) ? (b.images as string[]).filter(Boolean).slice(0, 8) : [],
    video: String(b.video ?? "").trim(),
    submitterEmail: String(b.submitterEmail ?? "").trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  attempts.set(ip, {
    count: (rec && now - rec.first < WINDOW ? rec.count : 0) + 1,
    first: rec && now - rec.first < WINDOW ? rec.first : now,
  });

  return NextResponse.json({ ok: true });
}
