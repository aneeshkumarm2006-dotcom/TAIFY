import { NextResponse } from "next/server";
import { postsCollection } from "@/lib/db/mongo";
import { getPostForEdit } from "@/lib/blog/data";
import { pingIndexNow } from "@/lib/indexnow";
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

  // findOneAndUpdate rather than updateOne so the ping below can tell whether
  // the post it just edited is actually live: submitting a draft's URL earns a
  // crawl of a 404 and teaches Bing the URL is dead.
  const updated = await col.findOneAndUpdate(
    { slug },
    { $set: set },
    { returnDocument: "after" },
  );
  if (!updated) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (updated.status === "published") pingIndexNow(`/blog/${slug}`);
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
  // Both directions are worth submitting: an unpublish wants the crawler back
  // to see the 404 and drop the URL, and /blog itself gained or lost an entry.
  pingIndexNow([`/blog/${slug}`, "/blog"]);
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
  pingIndexNow([`/blog/${slug}`, "/blog"]);
  return NextResponse.json({ ok: true });
}
