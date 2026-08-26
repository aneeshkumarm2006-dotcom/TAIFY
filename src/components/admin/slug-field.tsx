"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

const inp =
  "w-full rounded-lg border border-line-strong bg-ground px-3 py-2 text-[14px] outline-none focus:border-accent";

/**
 * The public URL of a page, as an explicit change rather than a saved field.
 *
 * Kept out of the main Save button on purpose. Everything else in the editor is
 * copy an editor rewrites freely; this retires a live URL, mints a permanent
 * redirect from it and purges the render cache, so it asks first and reports the
 * collision errors the two rename endpoints return.
 */
export function SlugField({
  prefix,
  slug,
  endpoint,
  onChanged,
}: {
  /** Path segment before the editable part, e.g. "/category/" or "/". */
  prefix: string;
  slug: string;
  /** Admin route that performs the rename. */
  endpoint: { url: string; method: "PUT" | "POST" };
  /** Handed the server's response so the caller can adopt a changed key. */
  onChanged: (res: { slug: string; key?: string }) => void;
}) {
  const [value, setValue] = useState(slug);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const next = value.trim();
  const dirty = next !== slug && next.length > 0;

  async function submit() {
    setErr(null);
    if (
      !confirm(
        `Change this URL from ${prefix}${slug} to ${prefix}${next}?\n\n` +
          `${prefix}${slug} will permanently redirect to the new URL, so existing ` +
          `links and rankings carry over. Any link typed into page or blog copy ` +
          `still points at the old URL and will redirect rather than break.`,
      )
    )
      return;

    setBusy(true);
    const res = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error ?? "Could not change the URL.");
      return;
    }
    onChanged({ slug: data.slug ?? next, key: data.key });
  }

  return (
    <div className="mb-3">
      <label className="eyebrow">URL</label>
      <div className="mono mt-1 flex items-center gap-1 text-[13px] text-ink-soft">
        <span className="shrink-0">{prefix}</span>
        <input
          className={`${inp} mono py-1.5 text-[13px]`}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setErr(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && dirty && !busy && submit()}
          spellCheck={false}
        />
      </div>
      {dirty && (
        <button
          onClick={submit}
          disabled={busy}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Change URL
        </button>
      )}
      {err && <p className="mt-1.5 text-[11.5px] text-accent-ink">{err}</p>}
      {!err && dirty && (
        <p className="mt-1.5 text-[11px] text-ink-soft">
          {prefix}
          {slug} will 308-redirect here.
        </p>
      )}
    </div>
  );
}
