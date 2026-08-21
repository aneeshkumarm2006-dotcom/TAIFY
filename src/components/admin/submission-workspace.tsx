"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { ToolFields, type ToolFormState } from "@/components/admin/tool-form";
import {
  checkDraft,
  draftFromSubmission,
  normalizeDraft,
  type DraftIssue,
} from "@/lib/submissions/draft";
import type { ClientSubmission } from "@/lib/submissions/serialize";
import type { Tool } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Viewport width the preview is rendered at, then scaled to fit the column. */
const PREVIEW_WIDTH = 1280;

interface LinkResult {
  kind: string;
  url: string;
  status: number;
  ok: boolean;
  note?: string;
}

/**
 * Review one submission: the full listing on the left, the page it would
 * publish on the right.
 *
 * Approving used to be a single button on a card, which inserted whatever the
 * submitter typed and deleted the record. Here the draft is edited, checked and
 * previewed first, and the submission survives the decision either way.
 */
export function SubmissionWorkspace({ id }: { id: string }) {
  const [sub, setSub] = useState<ClientSubmission | null>(null);
  const [draft, setDraft] = useState<ToolFormState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [links, setLinks] = useState<LinkResult[] | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  // The first draft change after loading is React settling, not an edit.
  const dirty = useRef(false);

  // The preview renders at a real desktop width and is scaled down to fit the
  // column. Letting it reflow to the column's own width would show a layout no
  // reader will ever see, and put a horizontal scrollbar under it.
  //
  // Measured through a callback ref rather than an effect: the frame does not
  // exist on mount - the component is still rendering its loading state - so an
  // effect with an empty dependency list would observe nothing and never re-run.
  const observer = useRef<ResizeObserver | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const frame = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setBox({ w: el.clientWidth, h: el.clientHeight }),
    );
    ro.observe(el);
    observer.current = ro;
  }, []);
  const scale = box.w ? Math.min(1, box.w / PREVIEW_WIDTH) : 1;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/submissions/${id}`);
      const data = await res.json();
      if (cancelled) return;
      const s: ClientSubmission | undefined = data.submission;
      setSub(s ?? null);
      if (s) setDraft(s.draft ?? draftFromSubmission(s));
      if (s?.status === "approved" && s.publishedSlug) setPublished(s.publishedSlug);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const save = useCallback(
    async (next: ToolFormState) => {
      setSaving(true);
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: normalizeDraft(next as Partial<Tool>) }),
      });
      setSaving(false);
      if (res.ok) {
        setSavedAt(Date.now());
        setPreviewKey((k) => k + 1);
      }
    },
    [id],
  );

  // Autosave, so a half-reviewed listing survives a reload and the preview is
  // never showing something older than the form.
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => {
      void save(draft);
    }, 900);
    return () => clearTimeout(t);
  }, [draft, save]);

  function edit(next: ToolFormState) {
    dirty.current = true;
    setDraft(next);
  }

  async function enrich() {
    setBusy("enrich");
    setMessage(null);
    const res = await fetch(`/api/admin/submissions/${id}/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: normalizeDraft(draft as Partial<Tool>) }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage({ kind: "err", text: data.error ?? "Auto-fill failed." });
      return;
    }
    dirty.current = true;
    setDraft((d) => ({ ...d, ...data.suggestion }));
    setMessage({
      kind: "ok",
      text:
        data.note ??
        "Filled in from the site. Every field is a suggestion - read it before publishing.",
    });
  }

  async function checkLinks() {
    setBusy("check");
    const res = await fetch(`/api/admin/submissions/${id}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: normalizeDraft(draft as Partial<Tool>) }),
    });
    const data = await res.json();
    setBusy(null);
    setLinks(data.results ?? []);
  }

  async function publish() {
    setBusy("publish");
    setMessage(null);
    const res = await fetch(`/api/admin/submissions/${id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: normalizeDraft(draft as Partial<Tool>) }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage({ kind: "err", text: data.error ?? "Publish failed." });
      return;
    }
    setPublished(data.slug);
  }

  async function decide(status: "rejected" | "spam") {
    setBusy(status);
    const res = await fetch(`/api/admin/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote: note }),
    });
    setBusy(null);
    if (res.ok) {
      setRejecting(false);
      setSub((s) => (s ? { ...s, status, reviewNote: note } : s));
      setMessage({
        kind: "ok",
        text:
          status === "spam"
            ? "Marked as spam. No email was sent."
            : "Rejected. The submitter has been told why.",
      });
    }
  }

  if (loading)
    return (
      <div className="flex items-center gap-2 py-10 text-ink-soft">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );

  if (!sub)
    return (
      <div className="rounded-card border border-line bg-card p-10 text-center">
        <p className="text-[15px] font-semibold">Submission not found.</p>
        <Link href="/admin/submissions" className="mt-2 inline-block text-[13.5px] text-accent underline">
          Back to the queue
        </Link>
      </div>
    );

  const issues = checkDraft(normalizeDraft(draft as Partial<Tool>));
  const blockers = issues.filter((i) => i.blocking);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/submissions"
          className="mono inline-flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Queue
        </Link>
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]">{sub.name}</h1>
        <StatusChip status={sub.status} />
        <a
          href={sub.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mono inline-flex items-center gap-1 text-[12px] text-ink-soft hover:text-accent"
        >
          {sub.urlHost || sub.url} <ExternalLink className="h-3 w-3" />
        </a>
        <span className="mono ml-auto text-[11.5px] text-ink-soft">
          {saving ? "Saving…" : savedAt ? "Draft saved" : "Draft"}
        </span>
      </div>

      {published && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-card border border-verified/40 bg-verified-wash p-4">
          <CheckCircle2 className="h-5 w-5 text-verified" />
          <p className="text-[14px] font-semibold">Published.</p>
          <Link href={`/tool/${published}`} className="text-[13.5px] text-accent underline">
            View /tool/{published}
          </Link>
          <Link href="/admin/submissions" className="text-[13.5px] text-ink-soft underline">
            Back to the queue
          </Link>
        </div>
      )}

      {message && (
        <p
          className={cn(
            "mb-4 rounded-lg border px-4 py-2.5 text-[13px]",
            message.kind === "ok"
              ? "border-verified/40 bg-verified-wash text-verified"
              : "border-paid/40 bg-paid-wash text-paid",
          )}
        >
          {message.text}
        </p>
      )}

      {/* minmax(0,…) on both tracks: a 1fr track takes its min size from its
          content, so the 1280px-wide preview frame would otherwise stretch the
          column instead of being clipped and scaled inside it. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
        {/* Left: the submission, the checks, the listing */}
        <div className="flex flex-col gap-5">
          <SubmissionFacts sub={sub} />

          <div className="rounded-card border border-line bg-card p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <ActionButton onClick={enrich} busy={busy === "enrich"} icon={Sparkles}>
                Auto-fill from site
              </ActionButton>
              <ActionButton onClick={checkLinks} busy={busy === "check"} icon={Link2}>
                Check links
              </ActionButton>
              <ActionButton
                onClick={() => setPreviewKey((k) => k + 1)}
                busy={false}
                icon={RefreshCw}
              >
                Reload preview
              </ActionButton>
            </div>

            {links && <LinkReport results={links} />}

            <Checklist issues={issues} />
          </div>

          <div className="rounded-card border border-line bg-card p-5">
            <h2 className="eyebrow mb-4">Listing</h2>
            <ToolFields value={draft} onChange={edit} showSlug />
          </div>

          <div className="rounded-card border border-line bg-card p-5">
            {blockers.length > 0 && (
              <p className="mb-3 text-[13px] text-paid">
                {blockers.length} thing{blockers.length === 1 ? "" : "s"} to fix before
                this can publish.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={publish}
                disabled={blockers.length > 0 || busy === "publish" || Boolean(published)}
                className="inline-flex items-center gap-2 rounded-[10px] bg-verified px-5 py-2.5 text-[14px] font-bold text-white hover:opacity-90 disabled:opacity-40"
              >
                {busy === "publish" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Publish listing
              </button>
              <button
                onClick={() => setRejecting((r) => !r)}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-line-strong px-4 py-2.5 text-[14px] font-semibold text-ink-soft hover:border-accent hover:text-accent"
              >
                <X className="h-4 w-4" /> Reject
              </button>
              <button
                onClick={() => decide("spam")}
                disabled={busy === "spam"}
                className="mono inline-flex items-center gap-1.5 rounded-[10px] border border-line-strong px-4 py-2.5 text-[12px] text-ink-soft hover:border-paid hover:text-paid"
              >
                <Ban className="h-3.5 w-3.5" /> Spam
              </button>
            </div>

            {rejecting && (
              <div className="mt-4 flex flex-col gap-2">
                <label className="eyebrow">Reason (sent to the submitter)</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="We couldn't verify the pricing on your site…"
                  className="w-full rounded-lg border border-line-strong bg-ground px-3 py-2 text-[14px] outline-none focus:border-accent"
                />
                <button
                  onClick={() => decide("rejected")}
                  disabled={busy === "rejected"}
                  className="self-start rounded-[10px] bg-accent px-4 py-2 text-[13.5px] font-bold text-white hover:bg-accent-ink disabled:opacity-50"
                >
                  {busy === "rejected" ? "Sending…" : "Reject and notify"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: the page this would publish */}
        <div className="xl:sticky xl:top-20 xl:self-start">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="eyebrow">Preview</h2>
            <a
              href={`/preview/submission/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono inline-flex items-center gap-1 text-[11.5px] text-ink-soft hover:text-accent"
            >
              Open full size <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div
            ref={frame}
            className="h-[calc(100vh-190px)] min-h-[560px] w-full overflow-hidden rounded-card border border-line bg-ground"
          >
            <iframe
              key={previewKey}
              src={`/preview/submission/${id}`}
              title="Listing preview"
              style={{
                width: PREVIEW_WIDTH,
                height: box.h ? box.h / scale : "100%",
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                border: 0,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmissionFacts({ sub }: { sub: ClientSubmission }) {
  return (
    <div className="rounded-card border border-line bg-card p-5">
      <h2 className="eyebrow mb-3">Submission</h2>
      <dl className="flex flex-col gap-2 text-[13px]">
        <Fact k="From">{sub.submitterEmail || "no email given"}</Fact>
        <Fact k="Submitted">{(sub.createdAt ?? "").slice(0, 10)}</Fact>
        <Fact k="Attempts">
          {sub.attempts ?? 1}
          {(sub.attempts ?? 1) > 1 && (
            <span className="mono ml-2 rounded-full bg-accent-wash px-2 py-0.5 text-[10.5px] text-accent-ink">
              resubmitted
            </span>
          )}
        </Fact>
        {sub.reviewNote && <Fact k="Note">{sub.reviewNote}</Fact>}
      </dl>

      {sub.flags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sub.flags.map((f) => (
            <span
              key={f}
              className="mono rounded-full bg-paid-wash px-2 py-0.5 text-[10.5px] text-paid"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      <details className="mt-3">
        <summary className="mono cursor-pointer text-[11.5px] text-ink-soft">
          What they sent{" "}
          {sub.revisions?.length > 0 && `(+${sub.revisions.length} earlier)`}
        </summary>
        <div className="mt-2 space-y-2 text-[12.5px] text-ink-soft">
          <p>
            <b className="text-ink">{sub.tagline || "no tagline"}</b>
          </p>
          <p>{sub.description || "no description"}</p>
          <p className="mono text-[11px]">
            category: {sub.category || "none"}
            {sub.video && " · has video"}
            {sub.images?.length ? ` · ${sub.images.length} image(s)` : ""}
          </p>
          {sub.revisions?.map((r) => (
            <p key={r.at} className="mono border-t border-line pt-2 text-[11px]">
              {(r.at ?? "").slice(0, 10)} · {r.tagline || r.name}
            </p>
          ))}
        </div>
      </details>
    </div>
  );
}

function Fact({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="mono shrink-0 text-[12px] text-ink-soft">{k}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function Checklist({ issues }: { issues: DraftIssue[] }) {
  if (issues.length === 0)
    return (
      <p className="flex items-center gap-2 text-[13px] text-verified">
        <CheckCircle2 className="h-4 w-4" /> Ready to publish.
      </p>
    );
  return (
    <ul className="flex flex-col gap-1.5">
      {issues.map((i, n) => (
        <li key={`${i.field}-${n}`} className="flex items-start gap-2 text-[13px]">
          {i.blocking ? (
            <X className="mt-0.5 h-4 w-4 shrink-0 text-paid" strokeWidth={2.5} />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
          )}
          <span className={i.blocking ? "text-ink" : "text-ink-soft"}>{i.label}</span>
        </li>
      ))}
    </ul>
  );
}

function LinkReport({ results }: { results: LinkResult[] }) {
  if (results.length === 0) return null;
  return (
    <ul className="mb-4 flex flex-col gap-1.5 border-b border-line pb-4">
      {results.map((r) => (
        <li key={`${r.kind}-${r.url}`} className="flex items-start gap-2 text-[12.5px]">
          {r.ok ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-verified" strokeWidth={2.5} />
          ) : (
            <X className="mt-0.5 h-4 w-4 shrink-0 text-paid" strokeWidth={2.5} />
          )}
          <span className="mono shrink-0 text-[11px] text-ink-soft">{r.kind}</span>
          <span className="min-w-0 truncate text-ink-soft">{r.url}</span>
          <span
            className={cn("mono ml-auto shrink-0 text-[11px]", r.ok ? "text-verified" : "text-paid")}
          >
            {r.status || r.note || "failed"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "approved"
      ? "bg-verified-wash text-verified"
      : status === "pending"
        ? "bg-accent-wash text-accent-ink"
        : "bg-paid-wash text-paid";
  return (
    <span className={cn("mono rounded-full px-2 py-0.5 text-[10.5px]", tone)}>
      {status}
    </span>
  );
}

function ActionButton({
  onClick,
  busy,
  icon: Icon,
  children,
}: {
  onClick: () => void;
  busy: boolean;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-ink disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
