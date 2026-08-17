import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { contactsCollection } from "@/lib/db/mongo";

export const runtime = "nodejs";

// Toggle read / unread.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const col = await contactsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });

  const { read } = (await req.json().catch(() => ({}))) as { read?: boolean };

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }

  const res = await col.updateOne({ _id: oid }, { $set: { read: Boolean(read) } });
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
