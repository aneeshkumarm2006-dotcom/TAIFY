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
      html: `<h2>How to choose a ${lower} AI tool</h2><p>Start from the job, not the feature list. Most ${lower} tools overlap heavily on what they can technically do, and differ on the things that decide whether you keep using them: what they cost once you are past the free tier, how much setup they need before they are useful, and what they quietly refuse to do well.</p><p>Three checks separate the shortlist from the rest:</p><ul><li><strong>Real cost, not sticker price.</strong> Every listing below shows what the tool costs per month for typical use, converted to a monthly figure where billing is annual. A tool advertised as free that gates the useful part behind a paid plan is priced at the paid plan.</li><li><strong>A free tier you can actually test on.</strong> A workable free tier lets you try the tool on your own work before committing. Time-limited trials are marked separately — useful, but you are on a clock.</li><li><strong>Freshness.</strong> ${name} tooling changes fast. The verified date on each card is when a human last confirmed the pricing, features and destination link. Anything unverified for more than a week loses its badge until it is re-checked.</li></ul><p>Every listing also carries a watch-outs section. If a tool is weak at something people commonly expect it to handle, it is stated there rather than left for you to discover after paying.</p>`,
    },
    {
      id: "default-faq",
      type: "faq",
      heading: `${name} AI tools: common questions`,
      items: [
        {
          q: `What is the best ${lower} AI tool?`,
          a: `There is no single answer, which is why the tools below are ranked by how many people have saved them rather than by an editorial pick. The right choice depends on your budget and the specific job — a tool that is excellent for occasional light use is often the wrong call for daily professional work, and vice versa. If you would rather not compare them yourself, describe your task on <a href="/match">AI Match</a> and you will get three with reasoning.`,
        },
        {
          q: `Are there free ${lower} AI tools?`,
          a: `Yes. Filter the catalog by free tier to see only tools you can use without paying, and check the pricing badge on each card: <em>free</em> means there is no paid tier at all, while <em>freemium</em> means there is a workable free tier alongside a paid plan. Trials are labelled separately because they expire.`,
        },
        {
          q: `How much do ${lower} AI tools cost?`,
          a: `Most land between $0 and $30 a month for individual use, with team plans running higher. Each listing shows a real cost-to-use figure rather than the lowest advertised tier, so the numbers on this page are directly comparable with each other.`,
        },
        {
          q: `How often is this list updated?`,
          a: `Listings are re-verified on a rolling basis and each card shows the date it was last checked. Pricing and feature changes are the most common reason a listing changes, so the verified date is the signal worth trusting over the publication date.`,
        },
      ],
    },
    {
      id: "default-cta",
      type: "cta",
      title: `Not sure which ${lower} tool fits?`,
      body: "Describe the job in one sentence and get the three best matches, with the reasoning and the real monthly cost for each.",
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
    intro: `Explore the best ${cat.name.toLowerCase()} AI tools below, each with honest pricing and a real cost-to-use estimate — what the tool actually costs per month for typical use, not the cheapest advertised tier.`,
    blocks: defaultCategoryBlocks(cat),
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
    // A stored page that has never had blocks added keeps the default body copy
    // rather than rendering as an H1 over a bare card grid.
    blocks: s.blocks?.length ? s.blocks : base.blocks,
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
