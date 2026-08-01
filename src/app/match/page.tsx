import type { Metadata } from "next";
import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { MatchResults } from "@/components/match-results";
import { filterTools, getCategories } from "@/lib/data";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

const TITLE = `AI Match - Describe Your Task, Get 3 Tools · ${SITE_NAME}`;
const DESCRIPTION =
  "Describe what you're trying to do in one sentence and get the three best-fitting AI tools, with the reasoning, the real monthly cost, and what each one is bad at.";

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
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQS = [
  {
    q: "How does AI Match pick the tools?",
    a: "Your description is read against the whole catalog — every tool's tagline, description, category and tags — not just keyword-matched against names. The three that fit best come back with a short reason each, so you can tell whether the match is actually right for your situation before clicking through.",
  },
  {
    q: "Why only three results?",
    a: "A list of forty tools is the problem, not the answer. Three is enough to give you a cheap option, a strong option, and something you probably had not considered, while still being short enough to actually evaluate.",
  },
  {
    q: "What should I write in the box?",
    a: "One plain sentence about the job, not the tool category. \"Turn hour-long webinars into short clips for social\" works far better than \"video AI\", because it tells the matcher about the input, the output and the constraint.",
  },
  {
    q: "Does it cost anything?",
    a: "No. AI Match is free and needs no account. Tool listings are free too — promoted placement exists but is always labelled.",
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

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: TITLE,
      description: DESCRIPTION,
      url: absoluteUrl("/match"),
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "AI Match", item: absoluteUrl("/match") },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

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
          If you would rather browse than describe, every tool is filed by the job
          it does:
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
