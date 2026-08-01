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
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { Pricing } from "@/lib/types";

export const revalidate = 300;

type SP = Record<string, string | string[] | undefined>;

const SORTS = {
  relevance: {
    heading: "All AI tools",
    titleWord: "All",
    blurb: "in our default order",
    sentence:
      "Filter the full TAIFY catalog of AI tools by category, pricing and free tier. Every listing shows a real cost-to-use estimate and the date we last verified it.",
  },
  trending: {
    heading: "Trending AI tools",
    titleWord: "Trending",
    blurb: "ordered by momentum this week",
    sentence:
      "The AI tools gaining the most ground this week, ranked by saves and recency. Every listing shows a real monthly cost and the date we last verified it.",
  },
  newest: {
    heading: "Just launched AI tools",
    titleWord: "Newest",
    blurb: "newest releases first",
    sentence:
      "The most recently launched AI tools in the catalog, newest first. Every listing shows a real monthly cost, its watch-outs, and the date we last verified it.",
  },
  "most-saved": {
    heading: "Most saved AI tools",
    titleWord: "Most Saved",
    blurb: "ordered by how many people saved them",
    sentence:
      "The AI tools the most people have saved, ranked by save count. Every listing shows a real monthly cost, its watch-outs, and the date we last verified it.",
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
    ? `Browse ${cat.name} AI Tools · ${SITE_NAME}`
    : `Browse ${s.titleWord} AI Tools · ${SITE_NAME}`;

  const description = cat
    ? `Every ${cat.name.toLowerCase()} AI tool in the TAIFY catalog, filterable by pricing, free tier and verification date. Each listing shows a real monthly cost, not the sticker price.`
    : s.sentence;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const { category, sort, pricing, verifiedOnly, hasFreeTier } = readParams(sp);

  const [tools, categories, counts, activeCat, total] = await Promise.all([
    filterTools({ category, pricing, verifiedOnly, hasFreeTier, sort }),
    getCategories(),
    categoryCounts(),
    category ? getCategory(category) : Promise.resolve(undefined),
    countTools(),
  ]);

  // The H1 tracks the active sort so the ?sort= variants aren't byte-identical
  // to /browse — Semrush flagged two of them as duplicate content.
  const heading = activeCat ? `${activeCat.name} AI tools` : SORTS[sort].heading;
  const canonical = activeCat
    ? absoluteUrl(`/category/${activeCat.slug}`)
    : absoluteUrl("/browse");

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: heading,
      description: `${tools.length} AI tools, each with a real cost-to-use estimate and a last-verified date.`,
      url: canonical,
      isPartOf: { "@id": `${absoluteUrl("/")}#website` },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: tools.length,
        itemListElement: tools.slice(0, 30).map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: t.name,
          url: absoluteUrl(`/tool/${t.slug}`),
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Browse", item: absoluteUrl("/browse") },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

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
          {total} AI tools, {SORTS[sort].blurb}. Every listing shows what the tool
          actually costs per month for typical use — not the headline price — plus
          the date we last checked that the pricing and features still match.
          Filter by category, pricing model, or free tier to narrow it down, or{" "}
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
            <b className="text-ink">Real cost</b> is what the tool costs per month
            for the way most people actually use it. A tool advertised as
            &ldquo;free&rdquo; that gates the useful features behind a $20 plan is
            listed at $20, not $0, and a tool billed annually is shown as its
            monthly equivalent.
          </p>
          <p>
            <b className="text-ink">Pricing model</b> separates genuinely free
            tools from freemium ones with a workable free tier, time-limited
            trials, and paid-only products. Use the free-tier filter when you want
            to try something before spending anything.
          </p>
          <p>
            <b className="text-ink">Verified</b> is the date we last confirmed the
            pricing, feature list, and destination URL. AI tooling changes fast, so
            anything unverified for more than a week loses its badge until it is
            re-checked.
          </p>
          <p>
            <b className="text-ink">Watch-outs</b> appear on every tool page. If a
            tool is weak at something people commonly expect it to do, it is stated
            there rather than buried.
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
