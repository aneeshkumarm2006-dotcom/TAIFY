import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { submissionsCollection, toolsCollection } from "@/lib/db/mongo";
import { sendSubmitterEmail } from "@/lib/email";
import {
  canPublish,
  checkDraft,
  draftFromSubmission,
  normalizeDraft,
} from "@/lib/submissions/draft";
import { buildToolDoc, findToolByUrl, uniqueSlug } from "@/lib/tools/create";
import type { Tool } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Publish a reviewed submission.
 *
 * Replaces the old one-click approve, which inserted a listing straight from
 * the raw submission - no tags, no strengths, no watch-outs, an assumed
 * freemium price and a favicon for an image - and then deleted the submission,
 * leaving no record that we had ever seen the tool.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const subs = await submissionsCollection();
  const tools = await toolsCollection();
  if (!subs || !tools)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }

  const sub = await subs.findOne({ _id: oid });
  if (!sub) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (sub.status === "approved")
    return NextResponse.json(
      { error: "Already published.", slug: sub.publishedSlug },
      { status: 409 },
    );

  const body = (await req.json().catch(() => ({}))) as { draft?: Partial<Tool> };
  const draft = normalizeDraft(
    body.draft ?? sub.draft ?? draftFromSubmission(sub),
  );

  // The same check the review screen runs, enforced here too: the button can be
  // bypassed, the route cannot.
  if (!canPublish(draft))
    return NextResponse.json(
      {
        error: "This listing isn't ready to publish.",
        issues: checkDraft(draft).filter((i) => i.blocking),
      },
      { status: 400 },
    );

  // Is this tool already in the catalog under another name? Checked by host,
  // because the slug check below cannot see it: "Verbixa" submitted while
  // /tool/verbixa was live would simply have become verbixa-2.
  const listed = await findToolByUrl(tools, draft.url ?? "");
  if (listed)
    return NextResponse.json(
      {
        error: `${listed.name} is already listed at /tool/${listed.slug}.`,
        existingSlug: listed.slug,
      },
      { status: 409 },
    );

  const slug = await uniqueSlug(tools, draft.slug || draft.name || "");
  if (!slug)
    return NextResponse.json({ error: "Could not derive a slug." }, { status: 400 });

  await tools.insertOne(buildToolDoc(slug, draft));

  const now = new Date().toISOString();
  await subs.updateOne(
    { _id: oid },
    {
      $set: {
        status: "approved",
        publishedSlug: slug,
        draft,
        reviewedAt: now,
        updatedAt: now,
      },
    },
  );

  const mail = sub.submitterEmail
    ? await sendSubmitterEmail({
        to: sub.submitterEmail,
        subject: `${draft.name} is live on TAIFY`,
        heading: `${draft.name} is listed`,
        body: [
          "Your tool is now in the catalog: verified, indexed, and eligible to show up in AI Match results when it fits someone's task.",
          "Every listing carries a watch-outs section next to its strengths. That's what makes readers trust the catalog enough to click anything, and it tends to send better-qualified traffic your way.",
          "If anything on the listing is wrong or out of date, reply to this email and we'll fix it.",
        ],
        cta: { label: "See your listing", url: `${siteOrigin(req)}/tool/${slug}` },
      })
    : null;

  return NextResponse.json({ ok: true, slug, mail });
}

function siteOrigin(req: Request): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = req.headers.get("host");
  return host ? `https://${host}` : "";
}
