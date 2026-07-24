import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getCategories, categoryCounts } from "@/lib/data";
import { categoryIcon } from "@/lib/category-icons";
import { Reveal } from "@/components/motion/reveal";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Browse AI Tools by Category · ${SITE_NAME}`,
  description:
    "Browse the best AI tools by category — coding, image, video, research, study, and more. Verified daily with honest pricing.",
};

export default async function CategoriesPage() {
  const [categories, counts] = await Promise.all([
    getCategories(),
    categoryCounts(),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 lg:px-10">
      <div className="mb-10">
        <div className="eyebrow mb-2">The field guide</div>
        <h1 className="text-[clamp(30px,5vw,48px)] font-extrabold tracking-[-0.04em]">
          Browse AI tools by category
        </h1>
        <p className="mt-3 max-w-xl text-[16px] text-ink-soft">
          Pick a category to see the best tools for the job, compared by real
          cost and use case.
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
    </div>
  );
}
