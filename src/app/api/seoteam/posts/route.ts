import { NextResponse } from "next/server";
import { postsCollection } from "@/lib/db/mongo";
import { getAllPosts } from "@/lib/blog/data";
import { slugify } from "@/lib/utils";
import type { Post } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const posts = await getAllPosts();
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const col = await postsCollection();
  if (!col)
    return NextResponse.json(
      { error: "Database not connected (set MONGODB_URI)." },
      { status: 503 },
    );

  const body = (await req.json().catch(() => ({}))) as Partial<Post>;
  if (!body.title?.trim())
    return NextResponse.json({ error: "Title is required." }, { status: 400 });

  let slug = slugify(body.slug || body.title);
  if (!slug) return NextResponse.json({ error: "Invalid slug." }, { status: 400 });

  // Ensure unique slug.
  if (await col.findOne({ slug })) {
    let n = 2;
    while (await col.findOne({ slug: `${slug}-${n}` })) n++;
    slug = `${slug}-${n}`;
  }

  const now = new Date().toISOString();
  const publish = body.status === "published";
  const post: Post = {
    slug,
    title: body.title.trim(),
    template: body.template ?? "generic",
    body: body.body ?? "",
    excerpt: body.excerpt?.trim() ?? "",
    metaTitle: body.metaTitle?.trim() || body.title.trim(),
    coverImage: body.coverImage?.trim() ?? "",
    keywords: Array.isArray(body.keywords) ? body.keywords : [],
    linkFirstOnly: body.linkFirstOnly ?? true,
    status: publish ? "published" : "draft",
    author: body.author?.trim() ?? "",
    views: 0,
    createdAt: now,
    updatedAt: now,
    publishedAt: publish ? now : null,
  };

  await col.insertOne(post);
  return NextResponse.json({ ok: true, slug });
}
