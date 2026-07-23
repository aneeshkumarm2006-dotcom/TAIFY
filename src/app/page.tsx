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
  getMostSaved,
  getFeatured,
  getCategories,
  countTools,
} from "@/lib/data";

// Rebuild in the background every 5 min so tool/logo changes appear without a redeploy.
export const revalidate = 300;

export default async function HomePage() {
  const [trending, justLaunched, mostSaved, featured, categories, total, strip] =
    await Promise.all([
      getTrending(4),
      getJustLaunched(4),
      getMostSaved(4),
      getFeatured(4),
      getCategories(),
      countTools(),
      getMostSaved(9),
    ]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 lg:px-10">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line py-16 text-center sm:py-24">
        <FloatingLogos tools={strip} />
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
          <LogoStrip tools={strip} />
        </div>
        </div>
      </section>

      {/* Rails */}
      <div className="flex flex-col gap-16 py-16">
        <ToolRail title="Trending this week" tools={trending} href="/browse?sort=trending" />
        <ToolRail title="Just launched" tools={justLaunched} href="/browse?sort=newest" />
        <ToolRail title="Most saved" tools={mostSaved} href="/browse?sort=most-saved" />
        <ToolRail title="Editor's picks" tools={featured} href="/browse" />

        {/* Browse by task */}
        <Reveal>
          <section>
            <h3 className="mb-4 text-[17px] font-bold tracking-tight">
              Browse by task
            </h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((c) => {
                const Icon = categoryIcon(c.slug);
                return (
                  <Link
                    key={c.slug}
                    href={`/browse?category=${c.slug}`}
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
      </div>
    </div>
  );
}
