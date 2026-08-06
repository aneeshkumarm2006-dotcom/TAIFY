import Link from "next/link";
import type { CardTool } from "@/lib/types";
import { BrandLogo } from "./brand-logo";
import { AiDepthBadge, PricingBadge, VerifiedBadge } from "./ui/badge";
import { cn } from "@/lib/utils";

export function ToolCard({
  tool,
  rank,
  className,
}: {
  tool: CardTool;
  rank?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/tool/${tool.slug}`}
      className={cn(
        "group relative flex flex-col gap-3 rounded-card border border-line bg-card p-4 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-line-strong hover:shadow-card-lg",
        className,
      )}
    >
      {rank && (
        <span className="mono absolute -top-2.5 left-4 rounded-[7px] bg-ink px-2 py-[3px] text-[11px] font-bold tracking-wide text-ground">
          {rank}
        </span>
      )}

      <div className="flex items-start gap-3">
        <BrandLogo
          name={tool.name}
          mark={tool.mark}
          color={tool.color}
          logo={tool.logo}
          className="transition-transform duration-200 ease-out group-hover:scale-[1.06]"
        />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold tracking-tight">
            {tool.name}
          </div>
          <div className="mono mt-0.5 truncate text-[11px] text-ink-soft">
            {tool.code} · {tool.category}
          </div>
        </div>
      </div>

      <p className="line-clamp-2 text-[13.5px] leading-relaxed text-ink-soft">
        {tool.tagline}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <PricingBadge pricing={tool.pricing} />
        <VerifiedBadge verifiedAt={tool.verifiedAt} />
        <AiDepthBadge aiDepth={tool.aiDepth} />
      </div>

      <div className="flex items-center gap-2">
        <span className="mono text-[11.5px] text-ink-soft">
          real cost{" "}
          <b className="font-semibold text-ink">
            {tool.costPerMonth === 0 ? "$0" : `~$${tool.costPerMonth}/mo`}
          </b>
        </span>
      </div>
    </Link>
  );
}
