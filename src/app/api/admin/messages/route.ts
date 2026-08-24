import { NextResponse } from "next/server";
import { contactsCollection } from "@/lib/db/mongo";

export const runtime = "nodejs";

// Auth is enforced upstream by src/proxy.ts, whose matcher covers /api/admin/:path*.

/**
 * The contact inbox, split three ways.
 *
 * "inbox" is everything a person should read. "spam" is what the classifier
 * quarantined, kept in full with its reasoning attached so an operator can
 * disagree with it. The third view, Blocked, lives at /api/admin/blocked
 * because those payloads never became contact messages at all.
 */
export async function GET(req: Request) {
  const col = await contactsCollection();
  if (!col) return NextResponse.json({ messages: [], counts: { inbox: 0, spam: 0 } });

  const view = new URL(req.url).searchParams.get("view") === "spam" ? "spam" : "inbox";

  // A message is spam only while the machine's call still stands. Anything a
  // human cleared comes back to the inbox and stays there.
  const isSpam = {
    "spam.verdict": "quarantine",
    $or: [
      { "spam.clearedByHuman": { $exists: false } },
      { "spam.clearedByHuman": false },
    ],
  };
  const notSpam = { $nor: [isSpam] };

  const [docs, spamCount, inboxCount, unread] = await Promise.all([
    col
      .find(view === "spam" ? isSpam : notSpam)
      .sort({ createdAt: -1 })
      .toArray(),
    col.countDocuments(isSpam),
    col.countDocuments(notSpam),
    // The unread badge counts the inbox only. A badge that counts bots is one
    // nobody trusts within a week.
    col.countDocuments({ ...notSpam, read: false }),
  ]);

  const messages = docs.map((d) => ({ ...d, id: String(d._id), _id: undefined }));
  return NextResponse.json({
    messages,
    counts: { inbox: inboxCount, spam: spamCount, unread },
  });
}

/**
 * Purge the spam view.
 *
 * Scoped to quarantined messages the machine still owns, so a message a person
 * has already rescued can never be swept up by a bulk purge.
 */
export async function DELETE(req: Request) {
  const col = await contactsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });

  if (new URL(req.url).searchParams.get("view") !== "spam")
    return NextResponse.json(
      { error: "Only the spam view can be purged." },
      { status: 400 },
    );

  const res = await col.deleteMany({
    "spam.verdict": "quarantine",
    $or: [
      { "spam.clearedByHuman": { $exists: false } },
      { "spam.clearedByHuman": false },
    ],
  });
  return NextResponse.json({ ok: true, deleted: res.deletedCount });
}
