import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  submissionsCollection,
  type Submission,
  type SubmissionStatus,
} from "@/lib/db/mongo";
import { sendSubmitterEmail } from "@/lib/email";
import { serializeSubmission } from "@/lib/submissions/serialize";
import type { Tool } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const DECIDABLE: SubmissionStatus[] = ["pending", "rejected", "spam"];

/** One submission, for the review screen. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const col = await submissionsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  const oid = toObjectId(id);
  if (!oid) return NextResponse.json({ error: "Bad id." }, { status: 400 });

  const doc = await col.findOne({ _id: oid });
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ submission: serializeSubmission(doc) });
}

/**
 * Save the draft listing being built from this submission.
 *
 * Called on every edit in the review screen, so a half-finished review survives
 * a reload and the preview always has something current to render.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const col = await submissionsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  const oid = toObjectId(id);
  if (!oid) return NextResponse.json({ error: "Bad id." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { draft?: Partial<Tool> };
  if (!body.draft || typeof body.draft !== "object")
    return NextResponse.json({ error: "No draft supplied." }, { status: 400 });

  const res = await col.updateOne(
    { _id: oid },
    { $set: { draft: body.draft, updatedAt: new Date().toISOString() } },
  );
  if (res.matchedCount === 0)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/**
 * Decide on a submission without publishing it: reject, mark as spam, or put it
 * back in the queue. The record stays either way - a rejected tool coming back
 * a third time should meet the reason we turned it down the first time.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const col = await submissionsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  const oid = toObjectId(id);
  if (!oid) return NextResponse.json({ error: "Bad id." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as {
    status?: SubmissionStatus;
    reviewNote?: string;
    notify?: boolean;
  };
  if (!body.status || !DECIDABLE.includes(body.status))
    return NextResponse.json(
      { error: "Status must be pending, rejected or spam." },
      { status: 400 },
    );

  const sub = await col.findOne({ _id: oid });
  if (!sub) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const set: Partial<Submission> = {
    status: body.status,
    reviewNote: (body.reviewNote ?? "").trim(),
    updatedAt: new Date().toISOString(),
  };
  if (body.status === "pending") set.reviewedAt = undefined;
  else set.reviewedAt = new Date().toISOString();

  await col.updateOne({ _id: oid }, { $set: set });

  // Spam never gets a reply - answering it confirms the address is live.
  const mail =
    body.status === "rejected" && body.notify !== false && sub.submitterEmail
      ? await sendSubmitterEmail({
          to: sub.submitterEmail,
          subject: `About your TAIFY submission: ${sub.name}`,
          heading: `We didn't list ${sub.name}`,
          body: [
            "Thanks for sending it in. We read every submission, and this one isn't a fit for the catalog right now.",
            set.reviewNote || "We weren't able to verify enough about the tool to write an honest listing for it.",
            "If that changes, reply to this email and we'll take another look.",
          ],
        })
      : null;

  return NextResponse.json({ ok: true, mail });
}

/**
 * Hard delete. Reserved for spam: a real submission that was turned down is
 * kept, so the same URL arriving again is recognised instead of re-reviewed.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const col = await submissionsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  const oid = toObjectId(id);
  if (!oid) return NextResponse.json({ error: "Bad id." }, { status: 400 });

  const res = await col.deleteOne({ _id: oid });
  if (res.deletedCount === 0)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

function toObjectId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}
