import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { contactsCollection } from "@/lib/db/mongo";

export const runtime = "nodejs";

/**
 * Toggle read / unread, or overrule the classifier.
 *
 * `{ notSpam: true }` moves a quarantined message back to the inbox and clears
 * the machine's reasoning off it in the same write. The reasons go because a
 * stale explanation on a message a person has already vouched for is worse than
 * none: the next operator reads it as a live warning. `clearedByHuman` stays
 * behind so the backfill knows never to touch this one again.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const col = await contactsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });

  const { read, notSpam } = (await req.json().catch(() => ({}))) as {
    read?: boolean;
    notSpam?: boolean;
  };

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }

  const update = notSpam
    ? {
        $set: {
          read: false,
          spam: {
            verdict: "allow" as const,
            score: 0,
            category: "clean",
            reasons: [],
            codes: [],
            at: new Date().toISOString(),
            clearedByHuman: true,
          },
        },
      }
    : { $set: { read: Boolean(read) } };

  const res = await col.updateOne({ _id: oid }, update);
  if (res.matchedCount === 0)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Delete a message.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const col = await contactsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  try {
    await col.deleteOne({ _id: new ObjectId(id) });
  } catch {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
