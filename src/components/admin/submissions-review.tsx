"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Inbox,
  Loader2,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import type { ClientSubmission } from "@/lib/submissions/serialize";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Published" },
  { key: "rejected", label: "Rejected" },
  { key: "spam", label: "Spam" },
  { key: "all", label: "All" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** Human labels for the classifier's category codes. */
const SPAM_LABEL: Record<string, string> = {
  "bot-trap": "Bot trap",
  "impossible-field": "Impossible field",
  "malformed-email": "Bad email",
  "bulk-mail": "Bulk mail",
  "outbound-promo": "Outbound pitch",
  "off-platform-contact": "Off-platform contact",
  "link-spam": "Link drop",
  "keyboard-mash": "Keyboard mash",
  duplicate: "Duplicate",
  flood: "Flood",
  "no-browser-proof": "No browser proof",
  clean: "Clean",
};

/**
 * The review queue.
 *
 * Approve and reject buttons used to live on these cards, which is how listings
 * went live without anyone seeing them rendered. A row now opens the review
 * screen; the only decision available from here is turning down several at once.
 */
export function SubmissionsReview() {
  const [subs, setSubs] = useState<ClientSubmission[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<TabKey>("pending");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (status: TabKey) => {
    const res = await fetch(`/api/admin/submissions?status=${status}`);
    const data = await res.json();
    setSubs(data.submissions ?? []);
    setCounts(data.counts ?? {});
    setSelected(new Set());
    setLoading(false);
  }, []);

  // Inline rather than calling load() so no setState runs synchronously in the
  // effect body, and cancelled on unmount so a slow response cannot land on a
  // component that has gone away.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/submissions?status=${tab}`);
      const data = await res.json();
      if (cancelled) return;
      setSubs(data.submissions ?? []);
      setCounts(data.counts ?? {});
      setSelected(new Set());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const filtered = subs.filter((s) =>
    q
      ? `${s.name} ${s.urlHost ?? s.url} ${s.submitterEmail ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())
      : true,
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulk(status: "rejected" | "spam" | "pending") {
    if (selected.size === 0) return;
    if (
      status !== "pending" &&
      !confirm(`${status === "spam" ? "Mark as spam" : "Reject"} ${selected.size} submission(s)?`)
    )
      return;
    setBusy(true);
    await Promise.all(
      [...selected].map((id) =>
        fetch(`/api/admin/submissions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, reviewNote: note }),
        }),
      ),
    );
    setBusy(false);
    setNote("");
    load(tab);
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Inbox className="h-5 w-5 text-accent" />
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">
          Tool submissions
        </h1>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setLoading(true);
              setTab(t.key);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              tab === t.key
                ? "bg-accent-wash text-accent-ink"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {t.label}
            <span className="mono ml-1.5 text-[11px] opacity-70">
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, domain, email…"
            className="w-56 rounded-lg border border-line-strong bg-card py-2 pl-8 pr-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-card border border-line bg-card p-3">
          <span className="mono text-[12px] text-ink-soft">
            {selected.size} selected
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason (emailed on reject)"
            className="min-w-[220px] flex-1 rounded-lg border border-line-strong bg-ground px-3 py-1.5 text-[13px] outline-none focus:border-accent"
          />
          <button
            onClick={() => bulk("rejected")}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:border-accent hover:text-accent disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Reject
          </button>
          <button
            onClick={() => bulk("spam")}
            disabled={busy}
            className="mono rounded-lg border border-line-strong px-3 py-1.5 text-[12px] text-ink-soft hover:border-paid hover:text-paid disabled:opacity-50"
          >
            Spam
          </button>
          {tab !== "pending" && (
            <button
              onClick={() => bulk("pending")}
              disabled={busy}
              className="mono inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[12px] text-ink-soft hover:border-accent hover:text-ink disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reopen
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-card p-10 text-center">
          <p className="text-[15px] font-semibold">Nothing here.</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            New tools submitted from the public site show up under Pending.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="flex items-start gap-3 rounded-card border border-line bg-card p-4"
            >
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                className="mt-1"
                aria-label={`Select ${s.name}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/submissions/${s.id}`}
                    className="text-[15.5px] font-bold hover:text-accent"
                  >
                    {s.name}
                  </Link>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-soft hover:text-accent"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {s.category && (
                    <span className="mono rounded-full bg-accent-wash px-2 py-0.5 text-[10.5px] text-accent-ink">
                      {s.category}
                    </span>
                  )}
                  {(s.attempts ?? 1) > 1 && (
                    <span className="mono rounded-full bg-ground px-2 py-0.5 text-[10.5px] text-ink-soft">
                      ×{s.attempts} attempts
                    </span>
                  )}
                  {s.flags?.map((f) => (
                    <span
                      key={f}
                      className="mono rounded-full bg-paid-wash px-2 py-0.5 text-[10.5px] text-paid"
                    >
                      {f}
                    </span>
                  ))}
                  {s.spam?.verdict === "quarantine" && (
                    <span className="mono rounded-full bg-line px-2 py-0.5 text-[10.5px] text-ink-soft">
                      {SPAM_LABEL[s.spam.category] ?? s.spam.category} · {s.spam.score}
                    </span>
                  )}
                  {s.publishedSlug && (
                    <Link
                      href={`/tool/${s.publishedSlug}`}
                      className="mono rounded-full bg-verified-wash px-2 py-0.5 text-[10.5px] text-verified"
                    >
                      /tool/{s.publishedSlug}
                    </Link>
                  )}
                </div>
                {s.tagline && (
                  <p className="mt-1 truncate text-[13.5px] text-ink-soft">{s.tagline}</p>
                )}
                <div className="mono mt-1.5 text-[11px] text-ink-soft">
                  {s.urlHost || s.url}
                  {s.submitterEmail && ` · ${s.submitterEmail}`}
                  {" · "}
                  {(s.createdAt ?? "").slice(0, 10)}
                  {s.reviewNote && ` · "${s.reviewNote}"`}
                </div>
                {/* Why the classifier flagged it, in the words it recorded at
                    the time. An operator who cannot see the reasoning cannot
                    correct it. */}
                {(s.spam?.reasons?.length ?? 0) > 0 && (
                  <ul className="mt-2 flex flex-col gap-1 border-l-2 border-line pl-3">
                    {s.spam!.reasons.map((r, i) => (
                      <li
                        key={i}
                        className="mono text-[11px] leading-relaxed text-ink-soft"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Link
                href={`/admin/submissions/${s.id}`}
                className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-accent-ink"
              >
                Review
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
