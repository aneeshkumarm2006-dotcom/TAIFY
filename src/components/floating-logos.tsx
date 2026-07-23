"use client";

import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import type { Tool } from "@/lib/types";
import { BrandLogo } from "./brand-logo";

type Depth = 0 | 1 | 2; // 0 = far/back, 2 = near/front
type Spot = { top: string; left?: string; right?: string; depth: Depth };

const SPOTS: Spot[] = [
  { top: "15%", left: "3%", depth: 2 },
  { top: "47%", left: "7%", depth: 1 },
  { top: "75%", left: "4%", depth: 0 },
  { top: "19%", right: "4%", depth: 0 },
  { top: "53%", right: "7%", depth: 2 },
  { top: "77%", right: "3%", depth: 1 },
];

// Per depth-layer look + how strongly it reacts to the cursor.
const LAYER: Record<Depth, { scale: number; blur: string; opacity: number; range: number; float: number }> = {
  2: { scale: 1.15, blur: "0px", opacity: 0.55, range: 32, float: 9 },
  1: { scale: 0.95, blur: "0.5px", opacity: 0.45, range: 18, float: 11 },
  0: { scale: 0.76, blur: "1.4px", opacity: 0.35, range: 9, float: 13 },
};

/** Depth-parallax floating logos on the hero sides (desktop only). */
export function FloatingLogos({ tools }: { tools: Tool[] }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 45, damping: 18 });
  const sy = useSpring(my, { stiffness: 45, damping: 18 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * 2);
      my.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [reduce, mx, my]);

  const items = tools.slice(0, SPOTS.length);

  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
      {items.map((t, i) => (
        <FloatingLogo key={t.slug} tool={t} spot={SPOTS[i]} idx={i} sx={sx} sy={sy} reduce={!!reduce} />
      ))}
    </div>
  );
}

function FloatingLogo({
  tool,
  spot,
  idx,
  sx,
  sy,
  reduce,
}: {
  tool: Tool;
  spot: Spot;
  idx: number;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  reduce: boolean;
}) {
  const L = LAYER[spot.depth];
  const px = useTransform(sx, (v) => v * L.range);
  const py = useTransform(sy, (v) => v * L.range);

  return (
    <motion.div
      className="absolute"
      style={{
        top: spot.top,
        left: spot.left,
        right: spot.right,
        x: reduce ? 0 : px,
        y: reduce ? 0 : py,
      }}
    >
      <motion.div
        style={{ opacity: L.opacity }}
        animate={reduce ? undefined : { y: [0, -L.float, 0], rotate: [-2, 2, -2] }}
        transition={
          reduce
            ? undefined
            : {
                y: { duration: 5 + idx, repeat: Infinity, ease: "easeInOut", delay: idx * 0.3 },
                rotate: { duration: 7 + idx, repeat: Infinity, ease: "easeInOut", delay: idx * 0.2 },
              }
        }
      >
        <div style={{ filter: `blur(${L.blur})`, transform: `scale(${L.scale})` }}>
          <BrandLogo
            name={tool.name}
            mark={tool.mark}
            color={tool.color}
            logo={tool.logo}
            size="lg"
            className="shadow-card"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
