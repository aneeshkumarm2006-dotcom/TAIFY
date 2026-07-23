"use client";

import { useRouter } from "next/navigation";

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

  function set(which: "a" | "b", value: string) {
    const params = new URLSearchParams();
    const next = { a, b, [which]: value };
    if (next.a) params.set("a", next.a);
    if (next.b) params.set("b", next.b);
    router.push(`/compare?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={a} onChange={(v) => set("a", v)} options={options} label="Tool A" />
      <span className="mono text-[13px] text-ink-soft">vs</span>
      <Select value={b} onChange={(v) => set("b", v)} options={options} label="Tool B" />
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  label,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: { slug: string; name: string }[];
  label: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="cursor-pointer rounded-lg border border-line-strong bg-card px-3 py-2 text-[13.5px] font-medium text-ink"
    >
      <option value="" disabled>
        {label}…
      </option>
      {options.map((o) => (
        <option key={o.slug} value={o.slug}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
