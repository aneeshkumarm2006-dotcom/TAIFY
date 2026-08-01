import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getCategories, categoryCounts } from "@/lib/data";
import { categoryIcon } from "@/lib/category-icons";
import { Reveal } from "@/components/motion/reveal";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

export const revalidate = 300;

const TITLE = `Browse AI Tools by Category · ${SITE_NAME}`;
const DESCRIPTION =
  "Browse the best AI tools by category: coding, image, video, research, study and more. Verified daily, priced honestly.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/categories") },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/categories"),
    siteName: SITE_NAME,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function CategoriesPage() {
  const [categories, counts] = await Promise.all([
    getCategories(),
    categoryCounts(),
  ]);

  const total = Object.values(counts).reduce((n, c) => n + c, 0);

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: TITLE,
      description: DESCRIPTION,
      url: absoluteUrl("/categories"),
      isPartOf: { "@id": `${SITE_URL}/#website` },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: categories.length,
        itemListElement: categories.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          url: absoluteUrl(`/category/${c.slug}`),
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Categories", item: absoluteUrl("/categories") },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 lg:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <nav className="mono mb-5 flex items-center gap-1.5 text-[12px] text-ink-soft">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span>/</span>
        <span className="text-ink">Categories</span>
      </nav>

      <div className="mb-10">
        <div className="eyebrow mb-2">The field guide</div>
        <h1 className="text-[clamp(30px,5vw,48px)] font-extrabold tracking-[-0.04em]">
          Browse AI tools by category
        </h1>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
          {total} tools in {categories.length} categories, sorted by the job they
          do rather than who makes them. Pick one and you get everything in it,
          ranked by saves, with real prices and honest watch-outs.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c, i) => {
          const Icon = categoryIcon(c.slug);
          return (
            <Reveal key={c.slug} delay={Math.min(i * 0.04, 0.3)}>
              <Link
                href={`/category/${c.slug}`}
                className="group flex h-full items-start gap-4 rounded-card border border-line bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-card-lg"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-accent-wash text-accent-ink transition-colors group-hover:bg-accent group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[16px] font-bold">{c.name}</span>
                    <ArrowRight className="h-4 w-4 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                  <div className="mono mt-0.5 text-[12px] text-ink-soft">
                    {counts[c.slug] ?? 0} tools
                  </div>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>

      <section className="mt-16 max-w-3xl border-t border-line pt-10">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">
          How to pick the right category
        </h2>
        <div className="mt-4 space-y-4 text-[14.5px] leading-relaxed text-ink-soft">
          <p>
            Categories here are about the job, not the technology. A general
            assistant that happens to write code gets filed under whatever
            you&apos;d hire it for. So the coding page has purpose-built editors
            sitting next to the generalists that are genuinely good at it, and
            nothing that only mentions &ldquo;code&rdquo; in its marketing copy.
          </p>
          <p>
            Some tools honestly belong in three places at once. Those go under
            whatever they&apos;re strongest at and turn up in the rest through
            search and{" "}
            <Link href="/match" className="text-accent underline-offset-2 hover:underline">
              AI Match
            </Link>
            , which reads the whole catalog instead of one shelf.
          </p>
          <p>
            Already know roughly what you want?{" "}
            <Link href="/browse" className="text-accent underline-offset-2 hover:underline">
              The full catalog
            </Link>{" "}
            and its price filters will be faster. Down to two candidates?{" "}
            <Link href="/compare" className="text-accent underline-offset-2 hover:underline">
              Put them head to head
            </Link>{" "}
            and read the verdict.
          </p>
        </div>
      </section>
    </div>
  );
}
