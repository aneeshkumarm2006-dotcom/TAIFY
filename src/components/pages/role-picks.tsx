import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Role } from "@/data/roles";
import type { CardTool } from "@/lib/types";
import { BrandLogo } from "@/components/brand-logo";
import { PricingBadge } from "@/components/ui/badge";
import { costChip } from "@/lib/utils";

/**
 * The curated sections on a profession page.
 *
 * Deliberately not the ToolCard grid used on category pages. A category page
 * answers "what is in this category", so a grid of equivalent cards is right. A
 * profession page answers "why this one, for the work you do", and that reason
 * is the content — so each pick is a row with its own sentence rather than a
 * card showing the same tagline every other page shows.
 *
 * Picks whose slug no longer resolves are skipped rather than rendered empty;
 * `assertRolePicksExist` in data/roles.ts is what makes that loud in dev.
 */
export function RoleSections({
  role,
  toolMap,
}: {
  role: Role;
  toolMap: Record<string, CardTool>;
}) {
  return (
    <div className="mt-12 flex flex-col gap-12">
      {role.sections.map((section) => {
        const picks = section.picks.filter((p) => toolMap[p.slug]);
        if (!picks.length) return null;
        return (
          <section key={section.heading}>
            <h2 className="text-[26px] font-extrabold tracking-[-0.025em]">
              {section.heading}
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
              {section.body}
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {picks.map((pick) => (
                <PickRow
                  key={pick.slug}
                  tool={toolMap[pick.slug]}
                  why={pick.why}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function PickRow({ tool, why }: { tool: CardTool; why: string }) {
  return (
    <li>
      <Link
        href={`/tool/${tool.slug}`}
        className="group flex items-start gap-4 rounded-card border border-line bg-card p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card-lg"
      >
        <BrandLogo
          name={tool.name}
          mark={tool.mark}
          color={tool.color}
          logo={tool.logo}
          size="sm"
          className="transition-transform duration-200 ease-out group-hover:scale-[1.06]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="text-[15px] font-bold tracking-tight">
              {tool.name}
            </span>
            <PricingBadge pricing={tool.pricing} />
            <span className="mono text-[11.5px] text-ink-soft">
              {costChip(tool.costPerMonth, tool.billing)}
            </span>
          </div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
            {why}
          </p>
        </div>
        <ArrowRight className="mt-1 hidden h-4 w-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-accent sm:block" />
      </Link>
    </li>
  );
}
