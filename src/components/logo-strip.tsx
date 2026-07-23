"use client";

import { useEffect, useRef, useState } from "react";
import type { Tool } from "@/lib/types";

const AMP = 26; // px lift at the cursor
const MAG = 0.7; // extra scale at the cursor
const SPREAD = 95; // px falloff width of the arch

function BrandImg({
  tool,
  innerRef,
}: {
  tool: Tool;
  innerRef: (el: HTMLSpanElement | null) => void;
}) {
  const [ok, setOk] = useState(true);
  if (!tool.logo || !ok) return null;
  return (
    <span
      ref={innerRef}
      className="inline-flex origin-bottom will-change-transform"
      style={{ transition: "transform 160ms cubic-bezier(0.22,1,0.36,1)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tool.logo}
        alt={tool.name}
        title={tool.name}
        loading="lazy"
        onError={() => setOk(false)}
        className="h-8 w-8 shrink-0 object-contain opacity-60 grayscale transition-[filter,opacity] duration-300 hover:opacity-100 hover:grayscale-0 sm:h-9 sm:w-9"
      />
    </span>
  );
}

export function LogoStrip({ tools }: { tools: Tool[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLSpanElement | null)[]>([]);
  const centers = useRef<number[]>([]);
  const enabled = useRef(true);

  useEffect(() => {
    enabled.current = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const measure = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const wl = wrap.getBoundingClientRect().left;
      centers.current = items.current.map((el) => {
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        return r.left - wl + r.width / 2;
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function onMove(e: React.MouseEvent) {
    if (!enabled.current) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const mx = e.clientX - wrap.getBoundingClientRect().left;
    items.current.forEach((el, i) => {
      if (!el) return;
      const d = mx - (centers.current[i] ?? 0);
      const f = Math.exp(-(d * d) / (2 * SPREAD * SPREAD));
      el.style.transform = `translateY(${-AMP * f}px) scale(${1 + MAG * f})`;
      el.style.zIndex = String(Math.round(f * 10));
    });
  }
  function onLeave() {
    items.current.forEach((el) => {
      if (!el) return;
      el.style.transform = "translateY(0) scale(1)";
      el.style.zIndex = "0";
    });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
        The tools everyone&apos;s using
      </span>
      <div
        ref={wrapRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="flex flex-wrap items-end justify-center gap-6 px-4 py-4 sm:flex-nowrap sm:gap-8"
      >
        {tools.map((t, i) => (
          <BrandImg
            key={t.slug}
            tool={t}
            innerRef={(el) => {
              items.current[i] = el;
            }}
          />
        ))}
      </div>
    </div>
  );
}
