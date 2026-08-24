import { NextResponse } from "next/server";
import { ObjectId, type Filter } from "mongodb";
import {
  blockedCollection,
  contactsCollection,
  ensureSpamIndexes,
  type BlockedSubmission,
} from "@/lib/db/mongo";

export const runtime = "nodejs";

// Auth is enforced upstream by src/proxy.ts, whose matcher covers /api/admin/:path*.

/**
 * The blocked bin: everything the classifier refused outright, kept 30 days.
 *
 * This view is the whole justification for having a hard filter. Without it a
 * single false positive is a destroyed customer that nobody ever finds out
 * about, and this site has already had one - ideahunter.today, dropped by the
 * old 3-second timer on 2026-08-23, payload gone with only a log line left.
 */
export async function GET(req: Request) {
  await ensureSpamIndexes();
  const col = await blockedCollection();
  if (!col) return NextResponse.json({ blocked: [], count: 0 });

  const form = new URL(req.url).searchParams.get("form");
  const filter: Filter<BlockedSubmission> =
    form === "contact" || form === "submit" ? { form } : {};

  const docs = await col.find(filter).sort({ at: -1 }).limit(200).toArray();
  return NextResponse.json({
    blocked: docs.map((d) => ({
      ...d,
      id: String(d._id),
      _id: undefined,
      // The stored hashes are for counting, not for showing to anybody.
      ipHash: undefined,
      netHash: undefined,
      at: d.at instanceof Date ? d.at.toISOString() : d.at,
    })),
    count: await col.countDocuments(filter),
  });
}

/**
 * Rescue one blocked payload, or purge the whole bin.
 *
 * `{ restore: "<id>" }` on a contact payload puts the message back in the inbox
 * as a normal, unread message with the machine's reasoning cleared and
 * `clearedByHuman` set, so nothing re-flags it later. This is the one-click
 * escape hatch that makes the reject verdict safe to use at all.
 */
export async function POST(req: Request) {
  const col = await blockedCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });

  const { restore } = (await req.json().catch(() => ({}))) as { restore?: string };
  if (!restore)
    return NextResponse.json({ error: "Nothing to restore." }, { status: 400 });

  let oid: ObjectId;
  try {
    oid = new ObjectId(restore);
  } catch {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }

  const doc = (await col.findOne({ _id: oid })) as
    | (BlockedSubmission & { _id: ObjectId })
    | null;
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (doc.form !== "contact")
    return NextResponse.json(
      {
        error:
          "Only contact messages can be restored from here. Ask the submitter to send the tool again - the submissions table is keyed on the URL and a restore would fight that.",
      },
      { status: 400 },
    );

  const contacts = await contactsCollection();
  if (!contacts)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });

  const p = doc.payload as Record<string, unknown>;
  await contacts.insertOne({
    name: String(p.name ?? "").slice(0, 200),
    email: String(p.email ?? "").slice(0, 200),
    subject: String(p.subject ?? "(restored from Blocked)").slice(0, 200),
    message: String(p.message ?? "").slice(0, 5000),
    read: false,
    createdAt: new Date().toISOString(),
    spam: {
      verdict: "allow",
      score: 0,
      category: "clean",
      reasons: [],
      codes: [],
      at: new Date().toISOString(),
      clearedByHuman: true,
    },
  });

  await col.deleteOne({ _id: oid });
  return NextResponse.json({ ok: true });
}

/** Empty the bin early. It empties itself after 30 days regardless. */
export async function DELETE() {
  const col = await blockedCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  const res = await col.deleteMany({});
  return NextResponse.json({ ok: true, deleted: res.deletedCount });
}
