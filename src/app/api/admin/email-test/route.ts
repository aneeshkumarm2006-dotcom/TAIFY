import { NextResponse } from "next/server";
import { describeMailConfig, sendTestEmail, verifyTransport } from "@/lib/email";

// nodemailer needs a real TCP socket, which the Edge runtime does not have.
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Admin-only SMTP diagnostics. Auth is enforced upstream by src/proxy.ts, whose
 * matcher covers /api/admin/:path*.
 *
 * Lead notifications swallow their failures by design, so a deploy with a
 * truncated password looks exactly like a working one from the outside. This is
 * how you tell them apart.
 *
 * GET  - report the config that actually landed, then connect and authenticate.
 *        Sends nothing.
 * POST - send one real test message to the configured recipients.
 *
 * The password is never echoed; only its length is reported, which is enough to
 * spot a value that arrived wrapped in quotes or cut short.
 */
export async function GET() {
  const config = describeMailConfig();
  const verify = await verifyTransport();
  return NextResponse.json({ config, verify });
}

export async function POST() {
  const config = describeMailConfig();
  const sent = await sendTestEmail();
  return NextResponse.json({ config, sent });
}
