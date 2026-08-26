import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ensureCategoryIndexes } from "@/lib/db/mongo";
import {
  getCategoryById,
  renameCategory,
  renameCategoryLabel,
} from "@/lib/categories/data";

export const runtime = "nodejs";

/**
 * Category taxonomy edits: the public slug, and the display name.
 *
 * Deliberately not folded into the page PUT next door. That handler is a routine
 * content save an editor triggers repeatedly, whereas changing a slug retires a
 * URL, mints a redirect and purges the whole render cache — side effects that
 * must not ride along on every keystroke-save.
 *
 * Gated by the existing admin auth check in src/proxy.ts, which already matches
 * /api/admin/:path*.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    name?: string;
  };

  const before = await getCategoryById(id);
  if (!before)
    return NextResponse.json({ error: "Unknown category." }, { status: 400 });

  // The only writer, so it is the only place that has to pay for the indexes.
  await ensureCategoryIndexes();

  if (typeof body.name === "string") {
    const r = await renameCategoryLabel(id, body.name);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  }

  if (typeof body.slug !== "string") {
    revalidateAfterRename(before.slug, before.slug);
    return NextResponse.json({ ok: true, slug: before.slug });
  }

  const r = await renameCategory(id, body.slug);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });

  revalidateAfterRename(before.slug, r.slug);
  return NextResponse.json({ ok: true, slug: r.slug, unchanged: r.unchanged });
}

/**
 * A rename changes links on essentially every page, so the purge is broad.
 *
 * The old path matters as much as the new one: generateStaticParams prerendered
 * it at build time, so until it is purged the retired URL keeps serving a 200
 * with the full old page — a genuine duplicate of the new one — instead of the
 * 308. The new path is purged because a crawler that probed it before the rename
 * would otherwise be served a cached notFound().
 *
 * revalidatePath("/", "layout") covers the rest in one call: the footer's
 * category links render inside the root layout on every page, and every
 * /tool/<slug> page embeds the category URL in its breadcrumb JSON-LD. Enumerating
 * ~250 paths to avoid one blanket purge is the wrong trade for an action an admin
 * takes a couple of times a year.
 *
 * /sitemap.xml, /llms.txt, /browse and /match are all force-dynamic or
 * searchParams-driven, so they need no call at all.
 */
function revalidateAfterRename(oldSlug: string, newSlug: string) {
  revalidatePath(`/category/${oldSlug}`);
  revalidatePath(`/category/${newSlug}`);
  revalidatePath("/", "layout");
}
