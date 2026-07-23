import { Suspense } from "react";
import { FilterRail } from "@/components/filter-rail";
import { SortSelect } from "@/components/sort-select";
import { ToolGrid } from "@/components/tool-rail";
import {
  filterTools,
  getCategories,
  categoryCounts,
  getCategory,
} from "@/lib/data";
import type { Pricing } from "@/lib/types";

type SP = Record<string, string | string[] | undefined>;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const sort = (typeof sp.sort === "string" ? sp.sort : "relevance") as
    | "relevance"
    | "trending"
    | "newest"
    | "most-saved";
  const pricing = (
    Array.isArray(sp.pricing) ? sp.pricing : sp.pricing ? [sp.pricing] : []
  ) as Pricing[];
  const verifiedOnly = sp.verified === "1";
  const hasFreeTier = sp.free === "1";

  const [tools, categories, counts, activeCat] = await Promise.all([
    filterTools({ category, pricing, verifiedOnly, hasFreeTier, sort }),
    getCategories(),
    categoryCounts(),
    category ? getCategory(category) : Promise.resolve(undefined),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <div className="eyebrow mb-2">Browse the field guide</div>
        <h1 className="text-[clamp(24px,3.4vw,34px)] font-extrabold tracking-[-0.03em]">
          {activeCat ? activeCat.name : "All AI tools"}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[190px_1fr]">
        <Suspense>
          <div className="hidden md:block">
            <FilterRail categories={categories} counts={counts} />
          </div>
        </Suspense>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="mono text-[12.5px] text-ink-soft">
              {tools.length} tools ·{" "}
              <b className="text-ink">verified daily</b>
            </span>
            <Suspense>
              <SortSelect />
            </Suspense>
          </div>

          {tools.length > 0 ? (
            <ToolGrid tools={tools} />
          ) : (
            <div className="rounded-card border border-line bg-card p-10 text-center">
              <p className="text-[15px] font-semibold">No tools match those filters.</p>
              <p className="mt-1 text-[13.5px] text-ink-soft">
                Try removing a filter, or describe your task on the{" "}
                <a href="/match" className="text-accent">
                  AI Match
                </a>{" "}
                page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
