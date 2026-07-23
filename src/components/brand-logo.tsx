"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const DIMS = {
  sm: "h-9 w-9 rounded-[10px] text-[15px]",
  md: "h-11 w-11 rounded-[12px] text-[17px]",
  lg: "h-14 w-14 rounded-[15px] text-[22px]",
} as const;

const IMG = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-14 w-14" } as const;

/**
 * Brand logo tile. Shows the real logo on a clean white tile; if the image
 * fails (or none provided) falls back to a colored 2-letter monogram.
 */
export function BrandLogo({
  name,
  mark,
  color,
  logo,
  size = "md",
  className,
}: {
  name: string;
  mark: string;
  color: string;
  logo?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = logo && !failed;

  if (showImg) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden border border-line bg-white shadow-sm",
          DIMS[size],
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={`${name} logo`}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn("object-contain p-1.5", IMG[size])}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center font-extrabold tracking-tight text-white",
        DIMS[size],
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {mark}
    </span>
  );
}
