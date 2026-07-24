import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pagesCollection } from "@/lib/db/mongo";
import { listAllPages } from "@/lib/pages/data";
import { RESERVED } from "@/lib/pages/reserved";
import { slugify } from "@/lib/utils";
import type { Page } from "@/lib/pages/types";

export const runtime = "nodejs";

export async function GET() {
  const { categories, custom } = await listAllPages();
  return NextResponse.json({ categories, custom });
}

// Create a new custom page.
export async function POST(req: Request) {
  const col = await pagesCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { title?: string; slug?: string };
  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  let slug = slugify(body.slug || title);
  if (!slug) return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  if (RESERVED.has(slug))
    return NextResponse.json({ error: `"${slug}" is reserved. Pick another slug.` }, { status: 400 });
  if (await col.findOne({ key: `page:${slug}` }))
    return NextResponse.json({ error: `A page with slug "${slug}" exists.` }, { status: 409 });

  const now = new Date().toISOString();
  const page: Page = {
    key: `page:${slug}`,
    type: "custom",
    slug,
    title,
    metaTitle: title,
    excerpt: "",
    intro: "",
    blocks: [],
    customSchema: "",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(page);
  revalidatePath(`/${slug}`);
  return NextResponse.json({ ok: true, key: page.key });
}
