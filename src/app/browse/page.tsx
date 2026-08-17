import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar } from "@/components/filter-bar";
import { MotionGrid } from "@/components/motion/motion-grid";
import {
  filterTools,
  getCategories,
  categoryCounts,
  getCategory,
  countTools,
  toCardTools,
} from "@/lib/data";
import { absoluteUrl, OG_IMAGE, OG_IMAGE_CARD, SITE_NAME } from "@/lib/site";
import { breadcrumbNode, itemListNode, toolListEntry, webPageNode } from "@/lib/schema/nodes";
import { listId, ref } from "@/lib/schema/ids";
import { JsonLd } from "@/lib/schema/json-ld";
import type { Pricing } from "@/lib/types";

export const revalidate = 300;

type SP = Record<string, string | string[] | undefined>;

const SORTS = {
  relevance: {
    heading: "All AI tools",
    titleWord: "All",
    blurb: "in our default order",
    sentence:
      "The whole TAIFY catalog, filterable by category, price and free tier. Every tool shows what it really costs a month and when we last checked.",
  },
  trending: {
    heading: "Trending AI tools",
    titleWord: "Trending",
    blurb: "sorted by momentum this week",
    sentence:
      "What's moved most recently, by when we last re-checked each listing. Prices are what you'd really pay, not the headline tier.",
  },
  newest: {
    heading: "Just launched AI tools",
    titleWord: "Newest",
    blurb: "newest first",
    sentence:
      "The latest arrivals in the catalog. New doesn't mean good, so each one still lists what it's bad at and what it costs a month.",
  },
  editors: {
    heading: "Editor's picks",
    titleWord: "Editor's Picks",
    blurb: "our picks first",
    sentence:
      "The tools we'd actually recommend in each category, then everything else by how recently we checked it. It's our judgement, not a popularity contest - so every pick still lists what it's bad at.",
  },
} as const;

type SortKey = keyof typeof SORTS;

function readParams(sp: SP) {
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const raw = typeof sp.sort === "string" ? sp.sort : "relevance";
  const sort: SortKey = raw in SORTS ? (raw as SortKey) : "relevance";
  const pricing = (
    Array.isArray(sp.pricing) ? sp.pricing : sp.pricing ? [sp.pricing] : []
  ) as Pricing[];
  return {
    category,
    sort,
    pricing,
    verifiedOnly: sp.verified === "1",
    hasFreeTier: sp.free === "1",
    nativeOnly: sp.native === "1",
  };
}

/**
 * /browse is one page behind many filter permutations. Semrush found ?sort=
 * variants competing with the clean URL on identical titles, descriptions and
 * body copy, so each variant now gets its own title/description *and* points
 * its canonical at the indexable version — the clean /browse URL, or the
 * dedicated /category/<slug> page when a category filter is applied.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const { category, sort } = readParams(sp);
  const cat = category ? await getCategory(category) : undefined;

  const canonical = cat ? absoluteUrl(`/category/${cat.slug}`) : absoluteUrl("/browse");
  const s = SORTS[sort];

  const title = cat
    ? `Browse ${cat.name} AI Tools | ${SITE_NAME}`
    : `Browse ${s.titleWord} AI Tools | ${SITE_NAME}`;

  const description = cat
    ? `Every ${cat.name.toLowerCase()} AI tool in the TAIFY catalog, filterable by price, free tier and how recently we checked. Prices are what you'd really pay a month.`
    : s.sentence;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: OG_IMAGE_CARD,
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const { category, sort, pricing, verifiedOnly, hasFreeTier, nativeOnly } =
    readParams(sp);

  const [tools, categories, counts, activeCat, total] = await Promise.all([
    filterTools({ category, pricing, verifiedOnly, hasFreeTier, nativeOnly, sort }),
    getCategories(),
    categoryCounts(),
    category ? getCategory(category) : Promise.resolve(undefined),
    countTools(),
  ]);

  // The H1 tracks the active sort so the ?sort= variants aren't byte-identical
  // to /browse — Semrush flagged two of them as duplicate content.
  const heading = activeCat ? `${activeCat.name} AI tools` : SORTS[sort].heading;

  // The node ids follow the canonical, not the filtered URL: a ?sort= or
  // ?pricing= variant points its canonical at /browse (or at the matching
  // category page), so minting a second set of ids per filter permutation would
  // scatter one page's identity across the query space.
  const schemaPath = activeCat ? `/category/${activeCat.slug}` : "/browse";
  // 30 of however many match. Marking up the whole result set would describe
  // rows the page never renders; `numberOfItems` still reports the real total.
  const listed = tools.slice(0, 30);
  const graph = [
    webPageNode({
      path: schemaPath,
      name: heading,
      description: `${tools.length} AI tools, each with a real cost-to-use estimate and a last-verified date.`,
      type: "CollectionPage",
      mainEntity: ref(listId(schemaPath, "tools")),
    }),
    breadcrumbNode(schemaPath, [
      { name: "Home", url: absoluteUrl("/") },
      { name: "Browse", url: absoluteUrl("/browse") },
    ]),
    itemListNode({
      path: schemaPath,
      key: "tools",
      name: heading,
      entries: listed.map(toolListEntry),
      numberOfItems: tools.length,
    }),
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
      <JsonLd graph={graph} />

      <nav className="mono mb-4 flex items-center gap-1.5 text-[12px] text-ink-soft">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span>/</span>
        <span className="text-ink">Browse</span>
      </nav>

      <div className="mb-2">
        <div className="eyebrow mb-2">Browse the field guide</div>
        <h1 className="text-[clamp(24px,3.4vw,34px)] font-extrabold tracking-[-0.03em]">
          {heading}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          {total} tools, {SORTS[sort].blurb}. Each one lists what you&apos;d really
          pay a month, what it&apos;s bad at, and when we last checked that the
          price was still true. Narrow it down with the filters, or{" "}
          <Link href="/match" className="text-accent underline-offset-2 hover:underline">
            describe your task
          </Link>{" "}
          and let AI Match pick three.
        </p>
      </div>

      <Suspense>
        <FilterBar categories={categories} counts={counts} total={total} />
      </Suspense>

      <div className="mb-4">
        <span className="mono text-[12.5px] text-ink-soft">
          {tools.length} tools · <b className="text-ink">verified daily</b>
        </span>
      </div>

      {tools.length > 0 ? (
        <MotionGrid
          tools={toCardTools(tools)}
          columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          stagger={false}
        />
      ) : (
        <div className="rounded-card border border-line bg-card p-10 text-center">
          <p className="text-[15px] font-semibold">No tools match those filters.</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Try removing a filter, or describe your task on the{" "}
            <Link href="/match" className="text-accent">AI Match</Link> page.
          </p>
        </div>
      )}

      <section className="mt-16 max-w-3xl border-t border-line pt-10">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">
          How to read a TAIFY listing
        </h2>
        <div className="mt-4 space-y-4 text-[14.5px] leading-relaxed text-ink-soft">
          <p>
            The real cost is the number we lead with. It&apos;s what you&apos;d pay
            a month using the tool the way most people use it. If something is
            advertised as free but the useful half sits behind a $20 plan, we list
            it at $20. Annual billing gets divided down to a monthly figure so
            everything on the page compares like for like.
          </p>
          <p>
            The pricing badge tells you the shape of that number. Free means free,
            with nothing to upgrade into. Freemium means there&apos;s a tier you can
            do real work on without paying. Trial means you&apos;re on a clock.
          </p>
          <p>
            Verified is the date a person last opened the pricing page and confirmed
            it still says what we say it says. This space moves fast. Leave a tool
            unchecked for a week and it loses the badge until someone looks again.
          </p>
          <p>
            Then there&apos;s the watch-outs list on every tool page. If a tool is
            bad at something people assume it handles, that&apos;s where we say so.
            It&apos;s the part most directories leave out.
          </p>
        </div>

        <h2 className="mt-10 text-[20px] font-bold tracking-[-0.02em]">
          Browse by category instead
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:border-accent hover:text-accent"
            >
              {c.name}{" "}
              <span className="mono text-[11px] text-ink-soft">
                {counts[c.slug] ?? 0}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
