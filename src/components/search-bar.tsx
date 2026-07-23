"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "remove background from product photos",
  "write cold emails",
  "transcribe interviews",
  "build a landing page",
];

export function SearchBar({
  autoFocus = false,
  defaultValue = "",
  className,
}: {
  autoFocus?: boolean;
  defaultValue?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function go(q: string) {
    const query = q.trim();
    if (!query) return;
    router.push(`/match?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className={cn("w-full", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="mx-auto flex max-w-2xl items-center gap-2.5 rounded-[14px] border-2 border-ink bg-card p-2.5 pl-3.5 shadow-[0_10px_30px_-16px_var(--accent)]"
      >
        <Sparkles className="h-5 w-5 shrink-0 text-accent" />
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe what you're trying to do…"
          aria-label="Describe your task"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-soft"
        />
        <button
          type="submit"
          className="shrink-0 cursor-pointer rounded-[9px] bg-accent px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-accent-ink"
        >
          Find my AI
        </button>
      </form>

      <div className="mt-3.5 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => go(s)}
            className="mono cursor-pointer rounded-full border border-line-strong bg-card px-[11px] py-[5px] text-[12.5px] text-ink-soft transition-colors hover:border-accent hover:text-ink"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
