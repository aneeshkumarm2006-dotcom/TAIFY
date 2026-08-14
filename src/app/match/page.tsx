import type { Metadata } from "next";
import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { MatchResults } from "@/components/match-results";
import { filterTools, getCategories } from "@/lib/data";
import { OG_IMAGE, OG_IMAGE_CARD, SITE_NAME, absoluteUrl } from "@/lib/site";
import { breadcrumbNode, faqNode, webPageNode } from "@/lib/schema/nodes";
import { JsonLd } from "@/lib/schema/json-ld";

const TITLE = `AI Match - Describe Your Task, Get 3 Tools · ${SITE_NAME}`;
const DESCRIPTION =
  "Describe what you're trying to do in one sentence and get three AI tools that fit, with reasons, real monthly costs, and what each one is bad at.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // ?q= is a user query, not a distinct indexable page — every variant
  // consolidates onto the clean URL.
  alternates: { canonical: absoluteUrl("/match") },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/match"),
    siteName: SITE_NAME,
    images: OG_IMAGE_CARD,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const FAQS = [
  {
    q: "How does AI Match pick?",
    a: "It reads your description against the whole catalog, taglines and tags included, instead of keyword-matching names. Each of the three comes back with a reason, so you can tell whether it understood you before you click through.",
  },
  {
    q: "Why only three?",
    a: "Because a list of forty is the problem, not the answer. Three fits a cheap option, a strong option, and one you hadn't thought of, and you can still hold all three in your head.",
  },
  {
    q: "What should I type?",
    a: "One sentence about the job. \"Turn hour-long webinars into clips for social\" beats \"video AI\" every time, because it tells the matcher your input, your output and your constraint. Name the tool category and you'll just get the category back.",
  },
  {
    q: "Does it cost anything?",
    a: "No, and there's no account to make. Listings are free for makers too. Promoted placement exists and always carries a label.",
  },
];

export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  // Must come from the same source /api/match ranks over. Reading the static
  // seed here instead would silently drop any pick whose slug only exists in
  // the database (see MatchResults: an unknown slug renders nothing).
  const [tools, categories] = await Promise.all([
    query ? filterTools({}) : Promise.resolve([]),
    getCategories(),
  ]);

  const graph = [
    webPageNode({ path: "/match", name: TITLE, description: DESCRIPTION }),
    breadcrumbNode("/match", [
      { name: "Home", url: absoluteUrl("/") },
      { name: "AI Match", url: absoluteUrl("/match") },
    ]),
    faqNode("/match", FAQS),
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <JsonLd graph={graph} />

      <div className="mb-8 text-center">
        <div className="eyebrow mb-3">AI Match · answers, not a list</div>
        <h1 className="text-[clamp(24px,4vw,38px)] font-extrabold tracking-[-0.035em]">
          {query ? "Here's what fits" : "Describe your task"}
        </h1>
        {!query && (
          <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-soft">
            One sentence about the job you&apos;re doing. We read the whole
            catalog and return the three tools worth your time - with reasons.
          </p>
        )}
      </div>

      {query ? (
        <MatchResults query={query} tools={tools} />
      ) : (
        <SearchBar autoFocus />
      )}

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">
          How AI Match works
        </h2>
        <dl className="mt-5 space-y-5">
          {FAQS.map((f) => (
            <div key={f.q}>
              <dt className="text-[15px] font-semibold">{f.q}</dt>
              <dd className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-10 text-[20px] font-bold tracking-[-0.02em]">
          Or start from a category
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
          Rather browse than describe? Everything&apos;s filed by the job it does:
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:border-accent hover:text-accent"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
