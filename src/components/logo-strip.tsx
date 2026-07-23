"use client";

import { useState } from "react";
import type { Tool } from "@/lib/types";

function StripLogo({ tool }: { tool: Tool }) {
  const [ok, setOk] = useState(true);
  if (!tool.logo || !ok) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tool.logo}
      alt={tool.name}
      title={tool.name}
      loading="lazy"
      onError={() => setOk(false)}
      className="h-7 w-7 shrink-0 object-contain opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 sm:h-8 sm:w-8"
    />
  );
}

export function LogoStrip({ tools }: { tools: Tool[] }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
        The tools everyone&apos;s using
      </span>
      <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-7">
        {tools.map((t) => (
          <StripLogo key={t.slug} tool={t} />
        ))}
      </div>
    </div>
  );
}
