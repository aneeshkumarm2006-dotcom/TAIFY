import "server-only";
import { pagesCollection } from "@/lib/db/mongo";
import { getCategories, getCategoryById } from "@/lib/categories/data";
import type { Category } from "@/lib/types";
import { CATEGORY_SEO } from "./category-seo";
import type { AdminCategoryPage, Page } from "./types";

function strip(p: Page & { _id?: unknown }): Page {
  const { _id, ...rest } = p;
  void _id;
  return rest;
}

/**
 * Body copy every category page carries until an editor writes its own.
 *
 * Semrush flagged 10 of the 11 category pages for low word count: an unedited
 * page was an H1, one sentence, and a grid of cards. These blocks explain how to
 * read a listing and answer the questions people actually search, and the FAQ
 * block feeds FAQPage schema through buildPageSchema. Anything stored in the
 * admin still replaces them wholesale.
 */
function defaultCategoryBlocks(cat: Category): Page["blocks"] {
  const name = cat.name;
  const lower = name.toLowerCase();
  return [
    {
      id: "default-buying-guide",
      type: "richtext",
      html: `<h2>How to choose a ${lower} AI tool</h2><p>Start from the job, not the feature list. Most ${lower} tools can technically do the same things. Where they differ is what they cost once the free tier runs out, how much setup they need before they're useful, and what they're quietly bad at.</p><p>Price is where people get caught. Every listing below shows what the tool costs a month for normal use, divided down if it bills annually. If the useful half sits behind a paid plan, we price it at the paid plan.</p><p>A free tier you can do real work on is worth more than it looks, because it lets you test on your own material before paying anything. Trials sit in their own bucket: handy, but you're on a clock.</p><p>Then check the date. ${name} tooling moves fast, and the verified date is when a person last opened the pricing page and confirmed it. Leave a tool unchecked for a week and it loses the badge until someone looks again.</p><p>Every listing also carries watch-outs. If a tool is bad at something people assume it handles, that's where it says so, rather than leaving you to find out after paying.</p>`,
    },
    {
      id: "default-faq",
      type: "faq",
      heading: `${name} AI tools: common questions`,
      items: [
        {
          q: `What is the best ${lower} AI tool?`,
          a: `There isn't one, and anyone handing you a single name is guessing about your budget. Something perfect for occasional use is often the wrong call for daily work. The list below leads with our picks and then runs in order of how recently each listing was checked, so what you see first is either something we rate or something we know is still accurate. If you'd rather not weigh it up yourself, describe the job on <a href="/match">AI Match</a> and you'll get three with reasons.`,
        },
        {
          q: `Are there free ${lower} AI tools?`,
          a: `Yes. Filter by free tier to see only the ones you can use without paying. The badge on each card tells you which kind: <em>free</em> means there's nothing to upgrade into, <em>freemium</em> means there's a tier you can do real work on. Trials sit in their own bucket because they run out.`,
        },
        {
          q: `How much do ${lower} AI tools cost?`,
          a: `Most sit between $0 and $30 a month for one person, and climb from there for team plans. Every figure on this page is what you'd really pay rather than the cheapest advertised tier, so they compare directly against each other.`,
        },
        {
          q: `How often is this list updated?`,
          a: `Continuously, and each card shows its own last-checked date. Price changes are the usual reason a listing moves, which makes the verified date a better signal than when the page was published.`,
        },
      ],
    },
    {
      id: "default-cta",
      type: "cta",
      title: `Not sure which ${lower} tool fits?`,
      body: "One sentence about the job. You get three matches back, with reasons and real prices.",
      buttonLabel: "Find my AI",
      buttonHref: "/match",
    },
  ];
}

/** Default (unedited) category page derived from the category. Meta title and
 *  description come from the hand-written CATEGORY_SEO copy where we have it,
 *  otherwise they're generated from the category name. */
function defaultCategoryPage(cat: Category): Page {
  const now = new Date().toISOString();
  // Both keyed by the permanent id: the storage key must survive a slug change,
  // and the hand-written SEO copy must not fall back to the generated default
  // the moment someone renames the URL.
  const seo = CATEGORY_SEO[cat.id];
  return {
    key: `category:${cat.id}`,
    type: "category",
    // `slug` means "the public path segment" for both page types, which is what
    // the admin list and editor already assume when they build a preview URL.
    slug: cat.slug,
    title: `Best ${cat.name} AI Tools`,
    metaTitle: seo?.metaTitle ?? `Best ${cat.name} AI Tools (2026) | TAIFY`,
    excerpt:
      seo?.excerpt ??
      `The best ${cat.name.toLowerCase()} AI tools, compared on what they really cost, what they do, and who they suit. Verified daily.`,
    intro:
      seo?.intro ??
      `The best ${cat.name.toLowerCase()} AI tools below, each priced at what you'd really pay a month rather than the cheapest tier on their pricing page.`,
    blocks: defaultCategoryBlocks(cat),
    customSchema: "",
    status: "published",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Category page: stored fields layered over the derived default so a cleared
 * title/intro never renders an empty H1 — it falls back to the default.
 *
 * Takes a category **id**, since that is what the page document is keyed by.
 * Callers holding a URL segment resolve it through resolveCategorySlug first.
 */
export async function getCategoryPage(id: string): Promise<Page | null> {
  const cat = await getCategoryById(id);
  if (!cat) return null;
  return categoryPageFor(cat);
}

async function categoryPageFor(cat: Category): Promise<Page> {
  const base = defaultCategoryPage(cat);
  const col = await pagesCollection();
  const doc = col ? await col.findOne({ key: base.key }) : null;
  if (!doc) return base;
  return mergeCategoryPage(base, strip(doc));
}

function mergeCategoryPage(base: Page, s: Page): Page {
  return {
    ...base,
    ...s,
    title: s.title?.trim() || base.title,
    metaTitle: s.metaTitle?.trim() || base.metaTitle,
    excerpt: s.excerpt?.trim() || base.excerpt,
    intro: s.intro?.trim() || base.intro,
    // A stored page that has never had blocks added keeps the default body copy
    // rather than rendering as an H1 over a bare card grid.
    blocks: s.blocks?.length ? s.blocks : base.blocks,
    // Re-pinned after the spread, like `status`. Stored documents were written
    // with `slug` equal to the id, so without this the spread would shadow the
    // live slug and every admin preview link would point at the pre-rename URL.
    slug: base.slug,
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

/**
 * The live slug of a published page that used to live at `slug`, if any.
 *
 * Only consulted after getCustomPage misses, so a live page can never be
 * shadowed by some other page's retired slug.
 */
export async function movedCustomPage(slug: string): Promise<string | null> {
  const col = await pagesCollection();
  if (!col) return null;
  const doc = await col.findOne({
    type: "custom",
    formerSlugs: slug,
    status: "published",
  });
  return doc?.slug ?? null;
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
  categories: AdminCategoryPage[];
  custom: Page[];
}> {
  const col = await pagesCollection();
  const stored = col ? await col.find({}).toArray() : [];
  const byKey = new Map(stored.map((d) => [d.key, strip(d)]));

  const categories = (await getCategories()).map((c) => {
    const base = defaultCategoryPage(c);
    const doc = byKey.get(base.key);
    const page = doc ? mergeCategoryPage(base, doc) : base;
    return { ...page, categoryId: c.id, name: c.name };
  });
  const custom = stored.filter((d) => d.type === "custom").map(strip);
  return { categories, custom };
}
