"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

export function ComparePicker({
  options,
  a,
  b,
}: {
  options: { slug: string; name: string }[];
  a?: string;
  b?: string;
}) {
  const router = useRouter();
  const opts = options.map((o) => ({ value: o.slug, label: o.name }));

  function set(which: "a" | "b", value: string) {
    const next = { a, b, [which]: value };
    const params = new URLSearchParams();
    if (next.a) params.set("a", next.a);
    if (next.b) params.set("b", next.b);
    router.push(`/compare?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={a}
        onChange={(v) => set("a", v)}
        options={opts}
        placeholder="Tool A…"
        className="w-52"
      />
      <span className="mono text-[13px] text-ink-soft">vs</span>
      <Select
        value={b}
        onChange={(v) => set("b", v)}
        options={opts}
        placeholder="Tool B…"
        className="w-52"
      />
    </div>
  );
}
