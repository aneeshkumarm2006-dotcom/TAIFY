"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "most-saved", label: "Most saved" },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("sort") ?? "relevance";

  return (
    <select
      value={current}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value === "relevance") next.delete("sort");
        else next.set("sort", e.target.value);
        router.push(`${pathname}?${next.toString()}`, { scroll: false });
      }}
      className="mono cursor-pointer rounded-lg border border-line-strong bg-card px-2.5 py-1.5 text-[12.5px] text-ink"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          Sort — {o.label}
        </option>
      ))}
    </select>
  );
}
