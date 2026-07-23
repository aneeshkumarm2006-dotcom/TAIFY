"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { cn, compactNumber } from "@/lib/utils";

export function SaveButton({
  slug,
  saves,
  className,
}: {
  slug: string;
  saves: number;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  const count = saves + (saved ? 1 : 0);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaved((s) => !s);
        // TODO: persist to Supabase once accounts land
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save tool"}
      data-slug={slug}
      className={cn(
        "mono inline-flex items-center gap-[5px] rounded-full border px-[9px] py-1 text-[12px] transition-colors cursor-pointer",
        saved
          ? "border-accent text-accent bg-accent-wash"
          : "border-line-strong text-ink-soft hover:border-accent hover:text-ink",
        className,
      )}
    >
      <Bookmark
        className="h-3 w-3"
        fill={saved ? "currentColor" : "none"}
        strokeWidth={2}
      />
      <span className="tnum">{compactNumber(count)}</span>
    </button>
  );
}
