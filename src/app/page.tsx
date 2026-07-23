import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { ToolRail } from "@/components/tool-rail";
import { Reveal, HeroStagger } from "@/components/motion/reveal";
import {
  getTrending,
  getJustLaunched,
  getMostSaved,
  getFeatured,
  getCategories,
  countTools,
} from "@/lib/data";

export default async function HomePage() {
  const [trending, justLaunched, mostSaved, featured, categories, total] =
    await Promise.all([
      getTrending(4),
      getJustLaunched(4),
      getMostSaved(4),
      getFeatured(4),
      getCategories(),
      countTools(),
    ]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 lg:px-10">
      {/* Hero */}
      <section className="border-b border-line py-16 text-center sm:py-24">
        <HeroStagger>
          <div className="eyebrow mb-5">The front door · discover AI tools</div>
          <h1 className="mx-auto max-w-4xl text-balance text-[clamp(36px,7vw,72px)] font-extrabold leading-[1.0] tracking-[-0.045em]">
            There&apos;s an AI for{" "}
            <span className="border-b-4 border-accent pb-0.5">you</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[17px] text-ink-soft">
            Tell us the job. We&apos;ll find the three tools worth your time — not
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
            <div className="flex flex-wrap gap-2.5">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/browse?category=${c.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-[13.5px] font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-accent hover:shadow-card"
                >
                  <span aria-hidden>{c.emoji}</span>
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
