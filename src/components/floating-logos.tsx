"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Tool } from "@/lib/types";
import { BrandLogo } from "./brand-logo";

// Resting positions around the hero (percent). Left column then right column.
type Spot = { top: string; left?: string; right?: string; d: number };
const SPOTS: Spot[] = [
  { top: "16%", left: "3%", d: 0 },
  { top: "48%", left: "8%", d: 0.6 },
  { top: "76%", left: "4%", d: 1.2 },
  { top: "20%", right: "4%", d: 0.3 },
  { top: "54%", right: "8%", d: 0.9 },
  { top: "78%", right: "3%", d: 1.5 },
];

/** Decorative tool logos gently floating on the hero sides (desktop only). */
export function FloatingLogos({ tools }: { tools: Tool[] }) {
  const reduce = useReducedMotion();
  const items = tools.slice(0, SPOTS.length);

  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
      {items.map((t, i) => {
        const s = SPOTS[i];
        return (
          <motion.div
            key={t.slug}
            className="absolute opacity-[0.45]"
            style={{ top: s.top, left: s.left, right: s.right }}
            initial={reduce ? false : { opacity: 0, scale: 0.8 }}
            animate={
              reduce
                ? { opacity: 0.45 }
                : {
                    opacity: 0.45,
                    y: [0, -14, 0],
                    rotate: [-3, 3, -3],
                  }
            }
            transition={
              reduce
                ? { duration: 0.4 }
                : {
                    opacity: { duration: 0.6, delay: s.d * 0.2 },
                    y: { duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: s.d },
                    rotate: { duration: 7 + i, repeat: Infinity, ease: "easeInOut", delay: s.d },
                  }
            }
          >
            <div className="rotate-[-6deg]">
              <BrandLogo
                name={t.name}
                mark={t.mark}
                color={t.color}
                logo={t.logo}
                size="lg"
                className="shadow-card"
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
