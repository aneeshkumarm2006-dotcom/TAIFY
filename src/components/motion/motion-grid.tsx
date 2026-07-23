"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Tool } from "@/lib/types";
import { ToolCard } from "@/components/tool-card";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const DEFAULT_COLS =
  "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/** Card grid that staggers its cards in on scroll. */
export function MotionGrid({
  tools,
  columns = DEFAULT_COLS,
  rank,
  stagger = true,
}: {
  tools: Tool[];
  columns?: string;
  rank?: (t: Tool, i: number) => string | undefined;
  /** When false, cards render solid (no entrance fade) - best for large grids. */
  stagger?: boolean;
}) {
  const reduce = useReducedMotion();

  if (!stagger) {
    return (
      <div className={cn("grid gap-3.5", columns)}>
        {tools.map((t, i) => (
          <ToolCard key={t.slug} tool={t} rank={rank?.(t, i)} className="h-full" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={cn("grid gap-3.5", columns)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
    >
      {tools.map((t, i) => (
        <motion.div
          key={t.slug}
          className="h-full"
          variants={{
            hidden: reduce ? {} : { opacity: 0, y: 16 },
            show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
          }}
        >
          <ToolCard tool={t} rank={rank?.(t, i)} className="h-full" />
        </motion.div>
      ))}
    </motion.div>
  );
}
