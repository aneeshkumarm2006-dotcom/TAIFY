import "server-only";
import { pagesCollection } from "@/lib/db/mongo";
import { CATEGORIES } from "@/data/tools";
import type { Category } from "@/lib/types";
import { CATEGORY_SEO } from "./category-seo";
import type { Page } from "./types";

function strip(p: Page & { _id?: unknown }): Page {
  const { _id, ...rest } = p;
  void _id;
  return rest;
}

/** Default (unedited) category page derived from the category. Meta title and
 *  description come from the hand-written CATEGORY_SEO copy where we have it,
 *  otherwise they're generated from the category name. */
function defaultCategoryPage(cat: Category): Page {
  const now = new Date().toISOString();
  const seo = CATEGORY_SEO[cat.slug];
  return {
    key: `category:${cat.slug}`,
    type: "category",
    slug: cat.slug,
    title: `Best ${cat.name} AI Tools`,
    metaTitle: seo?.metaTitle ?? `Best ${cat.name} AI Tools (2026) · TAIFY`,
    excerpt:
      seo?.excerpt ??
      `The best ${cat.name.toLowerCase()} AI tools, compared by real cost, features, and use case. Verified daily.`,
    intro: `Explore the best ${cat.name.toLowerCase()} AI tools below, each with honest pricing and a real cost-to-use estimate.`,
    blocks: [],
    customSchema: "",
    status: "published",
    createdAt: now,
    updatedAt: now,
  };
}

/** Category page: stored fields layered over the derived default so a cleared
 *  title/intro never renders an empty H1 — it falls back to the default. */
export async function getCategoryPage(slug: string): Promise<Page | null> {
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return null;
  const base = defaultCategoryPage(cat);
  const col = await pagesCollection();
  const doc = col ? await col.findOne({ key: `category:${slug}` }) : null;
  if (!doc) return base;
  const s = strip(doc);
  return {
    ...base,
    ...s,
    title: s.title?.trim() || base.title,
    metaTitle: s.metaTitle?.trim() || base.metaTitle,
    excerpt: s.excerpt?.trim() || base.excerpt,
    intro: s.intro?.trim() || base.intro,
    status: "published",
  };
}

/** Published custom page by slug. */
export async function getCustomPage(slug: string): Promise<Page | null> {
  const col = await pagesCollection();
  if (!col) return null;
  const doc = await col.findOne({ key: `page:${slug}`, status: "published" });
  return doc ? strip(doc) : null;
}

/** All published custom-page slugs (for sitemap / static params). */
export async function getPublishedCustomSlugs(): Promise<string[]> {
  const col = await pagesCollection();
  if (!col) return [];
  const docs = await col
    .find({ type: "custom", status: "published" }, { projection: { slug: 1 } })
    .toArray();
  return docs.map((d) => d.slug);
}

// ---- admin ----

export async function getPageByKey(key: string): Promise<Page | null> {
  const col = await pagesCollection();
  if (!col) return null;
  const doc = await col.findOne({ key });
  return doc ? strip(doc) : null;
}

/** Admin list: all category pages (default or edited) + all custom pages. */
export async function listAllPages(): Promise<{
  categories: Page[];
  custom: Page[];
}> {
  const col = await pagesCollection();
  const stored = col ? await col.find({}).toArray() : [];
  const byKey = new Map(stored.map((d) => [d.key, strip(d)]));

  const categories = CATEGORIES.map(
    (c) => byKey.get(`category:${c.slug}`) ?? defaultCategoryPage(c),
  );
  const custom = stored.filter((d) => d.type === "custom").map(strip);
  return { categories, custom };
}
