import { NextResponse } from "next/server";
import { submissionsCollection, type SubmissionStatus } from "@/lib/db/mongo";
import { serializeSubmission } from "@/lib/submissions/serialize";

export const runtime = "nodejs";

const STATUSES: SubmissionStatus[] = ["pending", "approved", "rejected", "spam"];

/**
 * The review queue. Defaults to pending, because that is the only tab with work
 * in it - the others are the record of what we decided and why.
 */
export async function GET(req: Request) {
  const col = await submissionsCollection();
  if (!col)
    return NextResponse.json({ submissions: [], counts: {}, dbEnabled: false });

  const asked = new URL(req.url).searchParams.get("status") ?? "pending";
  const filter =
    asked === "all"
      ? {}
      : { status: (STATUSES.includes(asked as SubmissionStatus)
          ? asked
          : "pending") as SubmissionStatus };

  const [docs, grouped] = await Promise.all([
    col.find(filter).sort({ updatedAt: -1, createdAt: -1 }).toArray(),
    col.aggregate<{ _id: string; n: number }>([
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]).toArray(),
  ]);

  const counts: Record<string, number> = { all: 0 };
  for (const g of grouped) {
    counts[g._id ?? "pending"] = g.n;
    counts.all += g.n;
  }

  return NextResponse.json({
    submissions: docs.map(serializeSubmission),
    counts,
    dbEnabled: true,
  });
}
