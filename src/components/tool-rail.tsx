import Link from "next/link";
import type { CardTool } from "@/lib/types";
import { ToolCard } from "./tool-card";
import { MotionGrid } from "./motion/motion-grid";
import { Reveal } from "./motion/reveal";

/** Plain (non-animated) grid - used for small related lists. */
export function ToolGrid({ tools }: { tools: CardTool[] }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((t) => (
        <ToolCard key={t.slug} tool={t} className="h-full" />
      ))}
    </div>
  );
}

export function ToolRail({
  title,
  tools,
  href,
}: {
  title: string;
  tools: CardTool[];
  href?: string;
}) {
  return (
    <Reveal>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold tracking-tight">{title}</h3>
          {href && (
            <Link
              href={href}
              className="mono text-[12px] text-accent transition-opacity hover:opacity-70"
            >
              view all →
            </Link>
          )}
        </div>
        <MotionGrid
          tools={tools}
          columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        />
      </section>
    </Reveal>
  );
}
