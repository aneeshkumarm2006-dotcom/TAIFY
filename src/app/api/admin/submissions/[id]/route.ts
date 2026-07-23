import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { submissionsCollection, toolsCollection } from "@/lib/db/mongo";
import { CATEGORIES } from "@/data/tools";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

// Approve → create a published tool from the submission, then remove it.
export async function POST(
  _req: Request,
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

  let slug = slugify(sub.name);
  if (await tools.findOne({ slug })) {
    let n = 2;
    while (await tools.findOne({ slug: `${slug}-${n}` })) n++;
    slug = `${slug}-${n}`;
  }
  const category = CATEGORIES.some((c) => c.slug === sub.category)
    ? sub.category
    : "productivity";

  let host = "";
  try {
    host = new URL(sub.url.startsWith("http") ? sub.url : `https://${sub.url}`).hostname;
  } catch {}

  await tools.insertOne({
    slug,
    code: `AI·${1000 + Math.floor(Math.random() * 9000)}`,
    name: sub.name,
    tagline: sub.tagline || "",
    description: sub.description || "",
    mark: sub.name.slice(0, 2),
    color: "#3a7ca5",
    logo: host ? `https://www.google.com/s2/favicons?domain=${host}&sz=128` : undefined,
    images: sub.images ?? [],
    video: sub.video || undefined,
    company: "",
    category,
    tags: [],
    pricing: "freemium",
    costPerMonth: 0,
    listingCost: "Free · promoted from $49",
    saves: 0,
    verifiedAt: new Date(),
    launched: `${new Date().getFullYear()}·${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    url: sub.url,
    featured: false,
    pros: [],
    cons: [],
    bestFor: "",
  });

  await subs.deleteOne({ _id: oid });
  return NextResponse.json({ ok: true, slug });
}

// Reject → delete the submission.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const subs = await submissionsCollection();
  if (!subs)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  try {
    await subs.deleteOne({ _id: new ObjectId(id) });
  } catch {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
