import { NextResponse } from "next/server";
import { postsCollection } from "@/lib/db/mongo";
import { getPostForEdit } from "@/lib/blog/data";
import type { Post } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = await getPostForEdit(slug);
  if (!post) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ post });
}

// Update post content.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const col = await postsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as Partial<Post>;
  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  const fields: (keyof Post)[] = [
    "title", "template", "body", "excerpt", "metaTitle",
    "coverImage", "keywords", "linkFirstOnly", "author",
  ];
  for (const f of fields) if (body[f] !== undefined) set[f] = body[f];
  if (!set.metaTitle && body.title) set.metaTitle = body.title;

  const res = await col.updateOne({ slug }, { $set: set });
  if (res.matchedCount === 0)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Publish / unpublish.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const col = await postsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });

  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  const existing = await col.findOne({ slug });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const now = new Date().toISOString();
  const set: Record<string, unknown> = { updatedAt: now };
  if (action === "publish") {
    set.status = "published";
    set.publishedAt = existing.publishedAt ?? now;
  } else if (action === "unpublish") {
    set.status = "draft";
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  await col.updateOne({ slug }, { $set: set });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const col = await postsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  const res = await col.deleteOne({ slug });
  if (res.deletedCount === 0)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
