"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => {
        const isOpen = open === i;
        const questionId = `${uid}-q-${i}`;
        const answerId = `${uid}-a-${i}`;
        return (
          <div key={i} className="rounded-card border border-line bg-card">
            <button
              id={questionId}
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={answerId}
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
            {/* Every answer stays mounted and is collapsed to zero height, not
                unmounted. AnimatePresence used to drop the closed panels out of
                the tree entirely, so the served HTML carried four questions and
                exactly one answer - which is what the audit saw as blank FAQ
                answers on Legal, Writing and Education. The copy was never
                missing; only the open panel had ever been rendered. */}
            <motion.div
              id={answerId}
              role="region"
              aria-labelledby={questionId}
              // Collapsed panels are still in the layout, so take them out of
              // the tab order rather than letting focus land on invisible links.
              inert={!isOpen}
              initial={false}
              animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
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
          </div>
        );
      })}
    </div>
  );
}
