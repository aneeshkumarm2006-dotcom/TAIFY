import { NextResponse } from "next/server";
import { turnstileSiteKey } from "@/lib/spam/turnstile";

export const runtime = "nodejs";
// Read from the environment on every request. A cached response would mean
// adding the keys in Vercel still did nothing until the next deploy, which is
// exactly the surprise this endpoint exists to avoid.
export const dynamic = "force-dynamic";

/**
 * Public runtime config for the forms.
 *
 * The site key is served from here rather than baked into the page markup on
 * purpose. This repo generates pages from the database, renders a sitemap and
 * an llms.txt from the same data, and has committed schema checks over the
 * output; hard-coding a key into the markup would make turning Turnstile on a
 * content migration. An env var costs nothing and changes no generated file.
 *
 * `turnstileSiteKey` is null until the key is set, and the client treats null
 * as "do not inject the widget at all", so this ships completely dark.
 */
export async function GET() {
  return NextResponse.json(
    { turnstileSiteKey: turnstileSiteKey() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
