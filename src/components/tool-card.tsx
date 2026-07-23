import Link from "next/link";
import type { Tool } from "@/lib/types";
import { LogoTile } from "./logo-tile";
import { PricingBadge, VerifiedBadge } from "./ui/badge";
import { SaveButton } from "./save-button";
import { cn } from "@/lib/utils";

export function ToolCard({
  tool,
  rank,
  className,
}: {
  tool: Tool;
  rank?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/tool/${tool.slug}`}
      className={cn(
        "group relative flex flex-col gap-3 rounded-card border border-line bg-card p-4 transition-all hover:border-line-strong hover:shadow-card",
        className,
      )}
    >
      {rank && (
        <span className="mono absolute -top-2.5 left-4 rounded-[7px] bg-ink px-2 py-[3px] text-[11px] font-bold tracking-wide text-ground">
          {rank}
        </span>
      )}

      <div className="flex items-start gap-3">
        <LogoTile mark={tool.mark} color={tool.color} />
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
      </div>

      <div className="flex items-center gap-2">
        <span className="mono text-[11.5px] text-ink-soft">
          real cost{" "}
          <b className="font-semibold text-ink">
            {tool.costPerMonth === 0 ? "$0" : `~$${tool.costPerMonth}/mo`}
          </b>
        </span>
        <SaveButton slug={tool.slug} saves={tool.saves} className="ml-auto" />
      </div>
    </Link>
  );
}
