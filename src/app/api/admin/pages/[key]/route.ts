import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pagesCollection } from "@/lib/db/mongo";
import { categoryPath } from "@/lib/categories/data";
import { getPageByKey } from "@/lib/pages/data";
import type { Block } from "@/lib/pages/types";

export const runtime = "nodejs";

/**
 * `ref` is the category **id** for a category page and the public slug for a
 * custom one - the two halves of the key have meant different things since
 * category slugs became editable.
 */
function parseKey(key: string): { type: "category" | "custom"; ref: string } | null {
  const idx = key.indexOf(":");
  if (idx < 0) return null;
  const prefix = key.slice(0, idx);
  const ref = key.slice(idx + 1);
  if (!ref) return null;
  return { type: prefix === "category" ? "category" : "custom", ref };
}

// Push edits live immediately instead of waiting for the ISR window.
async function revalidatePage(type: "category" | "custom", ref: string) {
  if (type === "category") {
    // Resolved, not interpolated: `ref` is the id, and after a rename that is no
    // longer the live path - purging /category/<id> would leave every content
    // save invisible on the page it edited until the ISR window expired.
    revalidatePath(await categoryPath(ref));
    revalidatePath("/categories");
  } else {
    revalidatePath(`/${ref}`);
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const page = await getPageByKey(decodeURIComponent(key));
  if (!page) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ page });
}

// Save / upsert page content (category pages are created on first save).
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const key = decodeURIComponent((await params).key);
  const parsed = parseKey(key);
  if (!parsed) return NextResponse.json({ error: "Bad key." }, { status: 400 });

  const col = await pagesCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const now = new Date().toISOString();
  const set: Record<string, unknown> = { updatedAt: now };
  if (typeof b.title === "string") set.title = b.title.trim();
  if (typeof b.metaTitle === "string") set.metaTitle = b.metaTitle.trim();
  if (typeof b.excerpt === "string") set.excerpt = b.excerpt.trim();
  if (typeof b.intro === "string") set.intro = b.intro;
  if (typeof b.customSchema === "string") set.customSchema = b.customSchema;
  if (Array.isArray(b.blocks)) set.blocks = b.blocks as Block[];

  await col.updateOne(
    { key },
    {
      $set: set,
      $setOnInsert: {
        key,
        type: parsed.type,
        slug: parsed.ref,
        status: parsed.type === "category" ? "published" : "draft",
        createdAt: now,
      },
    },
    { upsert: true },
  );
  await revalidatePage(parsed.type, parsed.ref);
  return NextResponse.json({ ok: true });
}

// Publish / unpublish (custom pages only).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const key = decodeURIComponent((await params).key);
  const col = await pagesCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  const status = action === "publish" ? "published" : action === "unpublish" ? "draft" : null;
  if (!status) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const res = await col.updateOne({ key }, { $set: { status, updatedAt: new Date().toISOString() } });
  if (res.matchedCount === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = parseKey(key);
  if (parsed) await revalidatePage(parsed.type, parsed.ref);
  return NextResponse.json({ ok: true });
}

// Delete a custom page (category pages can only be reset, not deleted).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const key = decodeURIComponent((await params).key);
  if (!key.startsWith("page:"))
    return NextResponse.json({ error: "Only custom pages can be deleted." }, { status: 400 });
  const col = await pagesCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  await col.deleteOne({ key });
  revalidatePath(`/${key.slice("page:".length)}`);
  return NextResponse.json({ ok: true });
}
