import type { Metadata } from "next";
import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { ToolRail } from "@/components/tool-rail";
import { LogoStrip } from "@/components/logo-strip";
import { FloatingLogos } from "@/components/floating-logos";
import { AnimatedHeadline } from "@/components/animated-headline";
import { Reveal, HeroStagger } from "@/components/motion/reveal";
import { categoryIcon } from "@/lib/category-icons";
import {
  getTrending,
  getJustLaunched,
  getEditorsPicks,
  getFeatured,
  getCategories,
  countTools,
  toCardTools,
  toLogoTools,
} from "@/lib/data";
import { getPublishedPosts } from "@/lib/blog/data";
import { absoluteUrl, OG_IMAGE, OG_IMAGE_CARD, SITE_NAME } from "@/lib/site";
import { itemListNode, toolListEntry, webPageNode } from "@/lib/schema/nodes";
import { listId, orgId, ref } from "@/lib/schema/ids";
import { JsonLd } from "@/lib/schema/json-ld";

// Rebuild in the background every 5 min so tool/logo changes appear without a redeploy.
export const revalidate = 300;

const TITLE = "There's An AI For You | Find the Right AI Tool, Fast";

const DESCRIPTION =
  "Discover 1000s of AI tools by profession, use case, and industry. Updated daily. Find the exact AI for your job in seconds — no scrolling through generic lists.";

// Overrides the generic title/description set on the root layout.
export async function generateMetadata(): Promise<Metadata> {
  const description = DESCRIPTION;
  return {
    title: TITLE,
    description,
    alternates: { canonical: absoluteUrl("/") },
    openGraph: {
      type: "website",
      title: TITLE,
      description,
      url: absoluteUrl("/"),
      siteName: SITE_NAME,
      images: OG_IMAGE_CARD,
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description,
      images: [OG_IMAGE],
    },
  };
}

export default async function HomePage() {
  const [trending, justLaunched, featured, categories, total, strip, posts] =
    await Promise.all([
      getTrending(4),
      getJustLaunched(4),
      getFeatured(4),
      getCategories(),
      countTools(),
      getEditorsPicks(9),
      getPublishedPosts(),
    ]);

  const latestPosts = posts.slice(0, 3);
  // One array, passed by reference to both FloatingLogos and LogoStrip. React
  // Flight dedupes by object identity, so calling toLogoTools(strip) at each
  // call site serialised the same nine tools into the RSC payload twice.
  const logoTools = toLogoTools(strip);

  const graph = [
    webPageNode({
      path: "/",
      name: TITLE,
      description: DESCRIPTION,
      type: "CollectionPage",
      // The homepage has no breadcrumb trail of its own — it is the root.
      hasBreadcrumb: false,
      about: ref(orgId()),
      mainEntity: ref(listId("/", "trending")),
    }),
    itemListNode({
      path: "/",
      key: "trending",
      name: "Trending AI tools",
      entries: trending.map(toolListEntry),
    }),
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 lg:px-10">
      <JsonLd graph={graph} />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line py-16 text-center sm:py-24">
        <FloatingLogos tools={logoTools} />
        <div className="relative">
        <div className="eyebrow mb-5">The front door · discover AI tools</div>
        <AnimatedHeadline />
        <HeroStagger>
          <p className="mx-auto mt-5 max-w-xl text-[17px] text-ink-soft">
            Tell us the job. We&apos;ll find the three tools worth your time - not
            a wall of ten thousand.
          </p>
          <div className="mt-9">
            <SearchBar />
          </div>
          <div className="mono mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-ink-soft">
            <span>
              <b className="text-ink">{total}+</b> tools
            </span>
            <span>·</span>
            <span>
              <b className="text-ink">verified</b> daily
            </span>
            <span>·</span>
            <span>
              used by <b className="text-ink">millions</b>
            </span>
          </div>
        </HeroStagger>

        <div className="mt-12">
          <LogoStrip tools={logoTools} />
        </div>
        </div>
      </section>

      {/* Rails */}
      <div className="flex flex-col gap-16 py-16">
        <ToolRail title="Trending this week" tools={toCardTools(trending)} href="/browse?sort=trending" />
        <ToolRail title="Just launched" tools={toCardTools(justLaunched)} href="/browse?sort=newest" />
        <ToolRail title="Editor's picks" tools={toCardTools(featured)} href="/browse?sort=editors" />

        {/* Browse by task */}
        <Reveal>
          <section>
            <h3 className="mb-4 text-[17px] font-bold tracking-tight">
              Browse by task
            </h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((c) => {
                const Icon = categoryIcon(c.id);
                return (
                  <Link
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    className="group flex items-center gap-3 rounded-card border border-line bg-card px-4 py-3 text-[14px] font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-card"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent-wash text-accent-ink transition-colors group-hover:bg-accent group-hover:text-white">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    {c.name}
                  </Link>
                );
              })}
            </div>
          </section>
        </Reveal>

        {/* Latest guides — also the second inbound link every post needs; the
            audit found all four posts reachable only from /blog. */}
        {latestPosts.length > 0 && (
          <Reveal>
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[17px] font-bold tracking-tight">
                  Latest guides
                </h3>
                <Link
                  href="/blog"
                  className="mono text-[12px] text-accent transition-opacity hover:opacity-70"
                >
                  view all →
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {latestPosts.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group flex h-full flex-col rounded-card border border-line bg-card p-4 transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-card"
                  >
                    <span className="text-[15px] font-bold leading-snug tracking-tight group-hover:text-accent">
                      {p.title}
                    </span>
                    {p.excerpt && (
                      <span className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-ink-soft">
                        {p.excerpt}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          </Reveal>
        )}
      </div>
    </div>
  );
}
