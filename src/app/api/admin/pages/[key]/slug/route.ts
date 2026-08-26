import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ensureCategoryIndexes, pagesCollection } from "@/lib/db/mongo";
import { RESERVED } from "@/lib/pages/reserved";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * Change a custom page's public URL.
 *
 * Separate from the page PUT for the same reason the category route is: this
 * retires a URL and mints a redirect, which must not happen on a content save.
 * Category pages are rejected here — their slug is an override on the category
 * document, so it goes through /api/admin/categories/<id>.
 *
 * A custom page's key *is* its slug, so unlike a category this genuinely rekeys
 * the document. Everything that addresses the page by key — the editor it was
 * launched from included — has to adopt the returned key afterwards.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const key = decodeURIComponent((await params).key);
  if (!key.startsWith("page:"))
    return NextResponse.json(
      { error: "Category URLs are changed from the category itself." },
      { status: 400 },
    );

  const body = (await req.json().catch(() => ({}))) as { slug?: string };
  const slug = slugify(body.slug ?? "");
  if (slug.length < 2)
    return NextResponse.json(
      { error: "Slug must be at least 2 characters." },
      { status: 400 },
    );
  if (RESERVED.has(slug))
    return NextResponse.json(
      { error: `"${slug}" is reserved by a real route.` },
      { status: 409 },
    );

  const col = await pagesCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  await ensureCategoryIndexes();

  const doc = await col.findOne({ key });
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const oldSlug = doc.slug;
  const newKey = `page:${slug}`;
  if (newKey === key)
    return NextResponse.json({ ok: true, key, slug, unchanged: true });

  // Both halves of the namespace: a live page, and any page still redirecting
  // from this slug — claiming the latter would hijack that page's redirect.
  if (await col.findOne({ key: newKey }))
    return NextResponse.json(
      { error: `A page already lives at /${slug}.` },
      { status: 409 },
    );
  if (await col.findOne({ formerSlugs: slug, key: { $ne: key } }))
    return NextResponse.json(
      { error: `"${slug}" still redirects to another page.` },
      { status: 409 },
    );

  // Computed whole and $set as one value: Mongo rejects $addToSet and $pull on
  // the same field in one update. Dropping the incoming slug is what stops a
  // page renamed back to an earlier value from redirecting to itself forever.
  const formerSlugs = [...new Set([...(doc.formerSlugs ?? []), oldSlug])].filter(
    (s) => s !== slug,
  );

  await col.updateOne(
    { key },
    {
      $set: { key: newKey, slug, formerSlugs, updatedAt: new Date().toISOString() },
    },
  );

  revalidatePath(`/${oldSlug}`);
  revalidatePath(`/${slug}`);
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ ok: true, key: newKey, slug });
}
