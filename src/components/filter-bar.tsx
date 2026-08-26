"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Check } from "lucide-react";
import type { Category, Pricing } from "@/lib/types";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PRICING: { value: Pricing; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "freemium", label: "Freemium" },
  { value: "trial", label: "Free trial" },
  { value: "paid", label: "Paid" },
];
const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "editors", label: "Editor's picks" },
];

export function FilterBar({
  categories,
  counts,
  total,
}: {
  categories: Category[];
  counts: Record<string, number>;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const activePricing = params.getAll("pricing");
  const activeCategory = params.get("category") ?? "";
  const activeSort = params.get("sort") ?? "relevance";
  const verifiedOnly = params.get("verified") === "1";
  const hasFree = params.get("free") === "1";
  const nativeOnly = params.get("native") === "1";

  const update = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const categoryOpts = [
    { value: "", label: `All categories · ${total}` },
    ...categories.map((c) => ({ value: c.slug, label: `${c.name} · ${counts[c.id] ?? 0}` })),
  ];

  return (
    <div className="sticky top-[60px] z-40 -mx-6 mb-6 border-b border-line bg-[color-mix(in_srgb,var(--ground)_88%,transparent)] px-6 py-3 backdrop-blur-md lg:-mx-10 lg:px-10">
      <div className="flex flex-wrap items-center gap-2.5">
        <Select
          value={activeCategory}
          onChange={(v) => update((p) => (v ? p.set("category", v) : p.delete("category")))}
          options={categoryOpts}
          className="w-52"
        />
        <Select
          value={activeSort}
          onChange={(v) => update((p) => (v === "relevance" ? p.delete("sort") : p.set("sort", v)))}
          options={SORTS}
          className="w-40"
        />

        <span className="mx-1 hidden h-6 w-px bg-line sm:block" />

        {PRICING.map((p) => (
          <Pill
            key={p.value}
            label={p.label}
            active={activePricing.includes(p.value)}
            onClick={() =>
              update((sp) => {
                const cur = sp.getAll("pricing");
                sp.delete("pricing");
                const next = cur.includes(p.value)
                  ? cur.filter((x) => x !== p.value)
                  : [...cur, p.value];
                next.forEach((x) => sp.append("pricing", x));
              })
            }
          />
        ))}

        <span className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <Pill label="Verified" active={verifiedOnly} onClick={() => update((p) => (verifiedOnly ? p.delete("verified") : p.set("verified", "1")))} />
        <Pill label="Free tier" active={hasFree} onClick={() => update((p) => (hasFree ? p.delete("free") : p.set("free", "1")))} />
        <Pill label="AI-native" active={nativeOnly} onClick={() => update((p) => (nativeOnly ? p.delete("native") : p.set("native", "1")))} />
      </div>
    </div>
  );
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "border-accent bg-accent text-white"
          : "border-line-strong bg-card text-ink-soft hover:border-ink-soft hover:text-ink",
      )}
    >
      {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      {label}
    </button>
  );
}
