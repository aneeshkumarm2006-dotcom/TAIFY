"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Check } from "lucide-react";
import type { Category, Pricing } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRICING: { value: Pricing; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "freemium", label: "Freemium" },
  { value: "trial", label: "Free trial" },
  { value: "paid", label: "Paid" },
];

export function FilterRail({
  categories,
  counts,
}: {
  categories: Category[];
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const activePricing = params.getAll("pricing");
  const activeCategory = params.get("category");
  const verifiedOnly = params.get("verified") === "1";
  const hasFree = params.get("free") === "1";

  const update = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  function togglePricing(v: Pricing) {
    update((p) => {
      const cur = p.getAll("pricing");
      p.delete("pricing");
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      next.forEach((x) => p.append("pricing", x));
    });
  }

  function toggleFlag(key: string, on: boolean) {
    update((p) => (on ? p.set(key, "1") : p.delete(key)));
  }

  function setCategory(slug: string | null) {
    update((p) => (slug ? p.set("category", slug) : p.delete("category")));
  }

  return (
    <aside className="flex flex-col gap-1">
      <Group label="Pricing">
        {PRICING.map((p) => (
          <Opt
            key={p.value}
            label={p.label}
            on={activePricing.includes(p.value)}
            onClick={() => togglePricing(p.value)}
          />
        ))}
      </Group>

      <Group label="Trust">
        <Opt
          label="Verified only"
          on={verifiedOnly}
          onClick={() => toggleFlag("verified", !verifiedOnly)}
        />
        <Opt
          label="Has free tier"
          on={hasFree}
          onClick={() => toggleFlag("free", !hasFree)}
        />
      </Group>

      <Group label="Category">
        <Opt
          label="All categories"
          on={!activeCategory}
          onClick={() => setCategory(null)}
        />
        {categories.map((c) => (
          <Opt
            key={c.slug}
            label={c.name}
            count={counts[c.slug]}
            on={activeCategory === c.slug}
            onClick={() => setCategory(c.slug)}
          />
        ))}
      </Group>
    </aside>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h4 className="eyebrow mb-2 mt-1">{label}</h4>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Opt({
  label,
  on,
  count,
  onClick,
}: {
  label: string;
  on: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2 py-[5px] text-left text-[13.5px] text-ink"
    >
      <span
        className={cn(
          "grid h-[15px] w-[15px] shrink-0 place-items-center rounded-[5px] border-[1.5px]",
          on ? "border-accent bg-accent text-white" : "border-line-strong",
        )}
      >
        {on && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
      </span>
      <span className={cn(on && "font-medium")}>{label}</span>
      {count != null && (
        <span className="mono ml-auto text-[11px] text-ink-soft">{count}</span>
      )}
    </button>
  );
}
