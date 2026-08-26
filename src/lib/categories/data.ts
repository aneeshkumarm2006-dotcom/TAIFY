import "server-only";
import { cache } from "react";
import { CATEGORIES } from "@/data/tools";
import { categoriesCollection, type CategoryOverride } from "@/lib/db/mongo";
import { slugify } from "@/lib/utils";
import type { Category } from "@/lib/types";

/**
 * The category taxonomy, with the code constant as its spine and a small Mongo
 * collection supplying per-category overrides.
 *
 * The split this module exists to enforce: a category's `id` is permanent and is
 * what every stored document holds, while its `slug` is a mutable public URL an
 * editor changes for SEO. Because each id was seeded from that category's
 * original slug, every value already in the database is already a correct id -
 * so a rename writes one small document here and never touches `tools`,
 * `submissions` or the category's page. It also means CATEGORY_SEO and the icon
 * map, both keyed by id, cannot silently fall back to their generic defaults the
 * moment a slug changes, which is the failure a rename must never cause.
 *
 * Layered the same way lib/settings.ts layers its single document over defaults:
 * with no MONGODB_URI, or with Mongo down, every category resolves to slug = id,
 * which is exactly the pre-feature behaviour.
 */

export type { CategoryOverride };

/** Where an incoming /category/<slug> request actually points. */
export type CategoryResolution =
  | { kind: "live"; category: Category }
  /** `to` is always the *current* slug, never an intermediate one. */
  | { kind: "moved"; to: string }
  | { kind: "none" };

/**
 * All categories with their live slugs. Memoised per request: /category/[slug]
 * resolves once in generateMetadata, again in the page body, and again inside
 * getCategoryPage. Outside a request scope cache() is a no-op, which costs an
 * extra read and is never a correctness problem.
 */
export const getCategories = cache(async (): Promise<Category[]> => loadCategories());

/**
 * The uncached read. Writers use this directly: validating a rename against a
 * snapshot memoised earlier in the same request would let the check pass against
 * a state that no longer exists.
 */
async function loadCategories(): Promise<Category[]> {
  const col = await categoriesCollection();
  const overrides = col ? await col.find({}).toArray() : [];
  const byId = new Map(overrides.map((o) => [o.id, o]));
  return CATEGORIES.map((def) => {
    const o = byId.get(def.id);
    return {
      ...def,
      name: o?.name?.trim() || def.name,
      slug: o?.slug?.trim() || def.id,
    };
  });
}

export async function getCategoryById(id: string): Promise<Category | undefined> {
  return (await getCategories()).find((c) => c.id === id);
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  return (await getCategories()).find((c) => c.slug === slug);
}

/**
 * The only supported way to build a category URL from a stored id.
 *
 * Tool documents hold an id, so every link and breadcrumb built from one has to
 * come through here rather than interpolating the raw value into a path.
 */
export async function categoryPath(id: string): Promise<string> {
  const cat = await getCategoryById(id);
  return `/category/${cat?.slug ?? id}`;
}

/**
 * Resolve a URL segment to a live category, a redirect target, or nothing.
 *
 * Live slugs are checked before former ones, which is what makes renaming a
 * category back to a slug it used before resolve correctly even if the cleanup
 * in renameCategory were ever skipped.
 */
export async function resolveCategorySlug(slug: string): Promise<CategoryResolution> {
  const live = await getCategoryBySlug(slug);
  if (live) return { kind: "live", category: live };

  const col = await categoriesCollection();
  const doc = col ? await col.findOne({ formerSlugs: slug }) : null;
  if (doc?.slug) return { kind: "moved", to: doc.slug };
  return { kind: "none" };
}

// ---------- admin ----------

export async function listCategoryOverrides(): Promise<CategoryOverride[]> {
  const col = await categoriesCollection();
  return col ? col.find({}).toArray() : [];
}

export type RenameResult =
  | { ok: true; slug: string; unchanged?: true }
  | { ok: false; status: 400 | 409 | 503; error: string };

/**
 * Validate a proposed slug against the whole taxonomy.
 *
 * Mongo cannot express "unique across the union of slug and formerSlugs[] over
 * all documents", so with only 22 categories the check is done in memory over
 * the full set. The unique indexes are a backstop for the live-slug half of it.
 *
 * Ids are part of the check, not just slugs. Without that, renaming `writing` to
 * `ai-writing` would leave `writing` free for `marketing` to claim, and
 * /category/writing would then serve the wrong category with a 200 - every old
 * inbound link silently misrouted, which is worse than the 404 it replaced.
 */
function slugConflict(
  candidate: string,
  targetId: string,
  all: Category[],
  overrides: CategoryOverride[],
): string | null {
  for (const c of all) {
    if (c.id === targetId) continue;
    if (c.id === candidate)
      return `"${candidate}" is another category's permanent id.`;
    if (c.slug === candidate)
      return `"${candidate}" is already used by ${c.name}.`;
  }
  for (const o of overrides) {
    if (o.id === targetId) continue;
    if (o.formerSlugs?.includes(candidate))
      return `"${candidate}" still redirects to another category.`;
  }
  return null;
}

/**
 * Point a category at a new public slug, keeping every URL it has ever had.
 *
 * The first rename pushes the id itself into formerSlugs - at that point
 * slug === id - so /category/<id> keeps resolving forever and the promise that
 * no stored data needs migrating holds for the life of the category.
 */
export async function renameCategory(
  id: string,
  rawSlug: string,
): Promise<RenameResult> {
  const slug = slugify(rawSlug);
  if (slug.length < 2)
    return { ok: false, status: 400, error: "Slug must be at least 2 characters." };

  const all = await loadCategories();
  const target = all.find((c) => c.id === id);
  if (!target) return { ok: false, status: 400, error: "Unknown category." };
  if (target.slug === slug) return { ok: true, slug, unchanged: true };

  const overrides = await listCategoryOverrides();
  const conflict = slugConflict(slug, id, all, overrides);
  if (conflict) return { ok: false, status: 409, error: conflict };

  const col = await categoriesCollection();
  if (!col) return { ok: false, status: 503, error: "Database not connected." };

  const current = overrides.find((o) => o.id === id);
  // Dropping the incoming slug out of formerSlugs is what stops a category
  // renamed back to an earlier value from redirecting to itself forever.
  const formerSlugs = [...new Set([...(current?.formerSlugs ?? []), target.slug])].filter(
    (s) => s !== slug,
  );

  await col.updateOne(
    { id },
    { $set: { slug, formerSlugs, updatedAt: new Date().toISOString() } },
    { upsert: true },
  );
  return { ok: true, slug };
}

/** Override a category's display name. Empty string restores the coded default. */
export async function renameCategoryLabel(
  id: string,
  rawName: string,
): Promise<RenameResult> {
  const name = rawName.trim().slice(0, 60);
  const all = await loadCategories();
  const target = all.find((c) => c.id === id);
  if (!target) return { ok: false, status: 400, error: "Unknown category." };

  const col = await categoriesCollection();
  if (!col) return { ok: false, status: 503, error: "Database not connected." };

  await col.updateOne(
    { id },
    {
      $set: { name, updatedAt: new Date().toISOString() },
      // A name-only edit on a category that has never been renamed still needs a
      // valid slug and formerSlugs on the document it creates.
      $setOnInsert: { slug: target.slug, formerSlugs: [] },
    },
    { upsert: true },
  );
  return { ok: true, slug: target.slug };
}
