import { NextResponse } from "next/server";
import { submissionsCollection } from "@/lib/db/mongo";

export const runtime = "nodejs";

export async function GET() {
  const col = await submissionsCollection();
  if (!col) return NextResponse.json({ submissions: [] });
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
  const submissions = docs.map((d) => ({ ...d, id: String(d._id), _id: undefined }));
  return NextResponse.json({ submissions });
}
