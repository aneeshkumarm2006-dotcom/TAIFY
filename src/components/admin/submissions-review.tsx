"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Check, X, ExternalLink, Inbox } from "lucide-react";

interface Submission {
  id: string;
  name: string;
  url: string;
  tagline: string;
  description: string;
  category: string;
  images: string[];
  video: string;
  submitterEmail: string;
  createdAt: string;
}

export function SubmissionsReview() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/submissions");
    const data = await res.json();
    setSubs(data.submissions ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    setBusy(id);
    await fetch(`/api/admin/submissions/${id}`, { method: "POST" });
    setBusy(null);
    load();
  }
  async function reject(id: string) {
    if (!confirm("Reject and delete this submission?")) return;
    setBusy(id);
    await fetch(`/api/admin/submissions/${id}`, { method: "DELETE" });
    setBusy(null);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Inbox className="h-5 w-5 text-accent" />
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">
          Tool submissions ({subs.length})
        </h1>
      </div>
      <p className="mono mb-6 text-[12px] text-ink-soft">
        Approve to publish a listing instantly, or reject. Edit details after
        approving from the Tools tab.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : subs.length === 0 ? (
        <div className="rounded-card border border-line bg-card p-10 text-center">
          <p className="text-[15px] font-semibold">No pending submissions.</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            New tools submitted from the public site show up here for review.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {subs.map((s) => (
            <div key={s.id} className="rounded-card border border-line bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-bold">{s.name}</h3>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-ink-soft hover:text-accent">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {s.category && (
                      <span className="mono rounded-full bg-accent-wash px-2 py-0.5 text-[10.5px] text-accent-ink">
                        {s.category}
                      </span>
                    )}
                  </div>
                  {s.tagline && <p className="mt-1 text-[14px] text-ink">{s.tagline}</p>}
                  {s.description && <p className="mt-1 text-[13px] text-ink-soft">{s.description}</p>}
                  <div className="mono mt-2 text-[11px] text-ink-soft">
                    {s.url}
                    {s.submitterEmail && ` · from ${s.submitterEmail}`}
                    {s.video && ` · has video`}
                    {s.images?.length ? ` · ${s.images.length} image(s)` : ""}
                    {" · "}
                    {s.createdAt.slice(0, 10)}
                  </div>
                  {s.images?.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {s.images.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={src} alt="" className="h-16 rounded-lg border border-line object-cover" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => approve(s.id)}
                    disabled={busy === s.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-verified px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => reject(s.id)}
                    disabled={busy === s.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3.5 py-2 text-[13px] font-semibold text-ink-soft hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
