import { NextResponse } from "next/server";
import { contactsCollection } from "@/lib/db/mongo";

export const runtime = "nodejs";

// Auth is enforced upstream by src/proxy.ts, whose matcher covers /api/admin/:path*.
export async function GET() {
  const col = await contactsCollection();
  if (!col) return NextResponse.json({ messages: [] });
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
  const messages = docs.map((d) => ({ ...d, id: String(d._id), _id: undefined }));
  return NextResponse.json({ messages });
}
