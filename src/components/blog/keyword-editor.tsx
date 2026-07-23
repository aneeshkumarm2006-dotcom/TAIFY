"use client";

import { Plus, Trash2, Link2 } from "lucide-react";
import type { KeywordLink, LinkRel } from "@/lib/types";

const RELS: LinkRel[] = ["dofollow", "nofollow", "sponsored"];

export function KeywordEditor({
  keywords,
  onChange,
  linkFirstOnly,
  onToggleFirstOnly,
}: {
  keywords: KeywordLink[];
  onChange: (k: KeywordLink[]) => void;
  linkFirstOnly: boolean;
  onToggleFirstOnly: (v: boolean) => void;
}) {
  function update(i: number, patch: Partial<KeywordLink>) {
    onChange(keywords.map((k, idx) => (idx === i ? { ...k, ...patch } : k)));
  }
  function add() {
    onChange([...keywords, { keyword: "", url: "https://", rel: "dofollow" }]);
  }
  function remove(i: number) {
    onChange(keywords.filter((_, idx) => idx !== i));
  }

  return (
    <div className="rounded-card border border-line bg-card p-4">
      <div className="mb-1 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-accent" />
        <h3 className="text-[14px] font-bold">Keyword backlinks</h3>
      </div>
      <p className="mb-3 text-[12px] text-ink-soft">
        Each keyword found in the body becomes a link to its URL automatically.
      </p>

      <div className="flex flex-col gap-2">
        {keywords.map((k, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              value={k.keyword}
              onChange={(e) => update(i, { keyword: e.target.value })}
              placeholder="keyword"
              className="min-w-0 flex-1 rounded-lg border border-line-strong bg-ground px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
            />
            <input
              value={k.url}
              onChange={(e) => update(i, { url: e.target.value })}
              placeholder="https://target-url"
              className="min-w-0 flex-[2] rounded-lg border border-line-strong bg-ground px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
            />
            <select
              value={k.rel}
              onChange={(e) => update(i, { rel: e.target.value as LinkRel })}
              className="mono rounded-lg border border-line-strong bg-ground px-2 py-1.5 text-[12px]"
            >
              {RELS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remove(i)}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:text-accent"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[13px] font-medium text-ink-soft hover:border-accent hover:text-ink"
      >
        <Plus className="h-4 w-4" /> Add keyword
      </button>

      <label className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-soft">
        <input
          type="checkbox"
          checked={linkFirstOnly}
          onChange={(e) => onToggleFirstOnly(e.target.checked)}
        />
        Link first occurrence only (recommended)
      </label>
    </div>
  );
}
