"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="rounded-card border border-line bg-card">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex-1 text-[15px] font-semibold">{it.q}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-ink-soft transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  {/* Answers are team-authored and may contain links/emphasis
                      (e.g. a link to AI Match), so render as HTML rather than
                      escaping it into visible <a>/<em> tags. */}
                  <div
                    className="prose-taify whitespace-pre-line px-4 pb-4 text-[14px] leading-relaxed text-ink-soft"
                    dangerouslySetInnerHTML={{ __html: it.a }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
