import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/auth/session";

export const runtime = "nodejs";

// Basic in-memory rate limit (per instance). Locks an IP after N fails.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 min
const attempts = new Map<string, { count: number; first: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(ip, { count: 0, first: now });
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}
function recordFail(ip: string) {
  const rec = attempts.get(ip) ?? { count: 0, first: Date.now() };
  rec.count += 1;
  attempts.set(ip, rec);
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Compare against self to keep timing uniform, then fail.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };
  const expected = process.env.SEO_DASHBOARD_PASSWORD ?? "";
  const secret = process.env.SESSION_SECRET ?? "";

  if (!expected || !secret) {
    return NextResponse.json(
      { error: "Server not configured (missing SEO_DASHBOARD_PASSWORD / SESSION_SECRET)." },
      { status: 500 },
    );
  }

  if (!password || !constantTimeEqual(password, expected)) {
    recordFail(ip);
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await signSession(secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  attempts.delete(ip);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
