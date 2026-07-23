import Link from "next/link";
import type { Tool } from "@/lib/types";
import { ToolCard } from "./tool-card";

export function ToolGrid({ tools }: { tools: Tool[] }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((t) => (
        <ToolCard key={t.slug} tool={t} />
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
  tools: Tool[];
  href?: string;
}) {
  return (
    <section>
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="text-[15px] font-bold tracking-tight">{title}</h3>
        {href && (
          <Link
            href={href}
            className="mono text-[12px] text-accent transition-opacity hover:opacity-70"
          >
            view all →
          </Link>
        )}
      </div>
      <ToolGrid tools={tools} />
    </section>
  );
}
