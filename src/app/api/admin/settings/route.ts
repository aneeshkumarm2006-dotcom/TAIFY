import { NextResponse } from "next/server";
import { settingsCollection } from "@/lib/db/mongo";
import { getSiteSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const col = await settingsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    tickerEnabled?: boolean;
    tickerMessages?: string[];
    tickerSpeed?: number;
  };

  const set = {
    tickerEnabled: Boolean(body.tickerEnabled),
    tickerMessages: Array.isArray(body.tickerMessages)
      ? body.tickerMessages.map((m) => String(m).trim()).filter(Boolean)
      : [],
    tickerSpeed: Math.min(120, Math.max(8, Number(body.tickerSpeed) || 30)),
  };

  await col.updateOne({ key: "site" }, { $set: set }, { upsert: true });
  return NextResponse.json({ ok: true });
}
