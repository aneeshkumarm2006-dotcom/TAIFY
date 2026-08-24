"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Trash2,
  Mail,
  MailOpen,
  MessagesSquare,
  Reply,
  ShieldCheck,
  Undo2,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SpamRecord {
  verdict: "allow" | "quarantine" | "reject";
  score: number;
  category: string;
  reasons: string[];
  codes: string[];
  clearedByHuman?: boolean;
}

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
  spam?: SpamRecord;
}

interface Blocked {
  id: string;
  form: "contact" | "submit";
  payload: Record<string, unknown>;
  score: number;
  category: string;
  reasons: string[];
  at: string;
}

type View = "inbox" | "spam" | "blocked";

const VIEWS: { key: View; label: string }[] = [
  { key: "inbox", label: "Inbox" },
  { key: "spam", label: "Spam" },
  { key: "blocked", label: "Blocked" },
];

/** Human labels for the classifier's category codes. */
const CATEGORY_LABEL: Record<string, string> = {
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

export function ContactMessages() {
  const [view, setView] = useState<View>("inbox");
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [counts, setCounts] = useState({ inbox: 0, spam: 0, unread: 0 });
  const [blockedCount, setBlockedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (v: View) => {
    if (v === "blocked") {
      const res = await fetch("/api/admin/blocked");
      const data = await res.json();
      setBlocked(data.blocked ?? []);
      setBlockedCount(data.count ?? 0);
    } else {
      const res = await fetch(`/api/admin/messages?view=${v}`);
      const data = await res.json();
      setMsgs(data.messages ?? []);
      if (data.counts) setCounts(data.counts);
    }
    setLoading(false);
  }, []);

  // Counts for the tabs that are not currently open, so the badges are right
  // before you click them.
  const refreshCounts = useCallback(async () => {
    const [m, b] = await Promise.all([
      fetch("/api/admin/messages?view=inbox").then((r) => r.json()),
      fetch("/api/admin/blocked").then((r) => r.json()),
    ]);
    if (m.counts) setCounts(m.counts);
    setBlockedCount(b.count ?? 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load(view);
      if (!cancelled) await refreshCounts();
    })();
    return () => {
      cancelled = true;
    };
  }, [view, load, refreshCounts]);

  async function act(id: string, body: Record<string, unknown>) {
    setBusy(id);
    await fetch(`/api/admin/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    await load(view);
    await refreshCounts();
  }

  async function remove(id: string) {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    setBusy(id);
    await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
    setBusy(null);
    await load(view);
    await refreshCounts();
  }

  async function restore(id: string) {
    setBusy(id);
    const res = await fetch("/api/admin/blocked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restore: id }),
    });
    if (!res.ok) alert((await res.json().catch(() => ({})))?.error ?? "Failed.");
    setBusy(null);
    await load(view);
    await refreshCounts();
  }

  async function purge() {
    const what =
      view === "spam"
        ? `Delete all ${counts.spam} quarantined messages?`
        : `Empty the blocked bin (${blockedCount} payloads)? They expire on their own after 30 days.`;
    if (!confirm(what)) return;
    setBusy("purge");
    await fetch(
      view === "spam" ? "/api/admin/messages?view=spam" : "/api/admin/blocked",
      { method: "DELETE" },
    );
    setBusy(null);
    await load(view);
    await refreshCounts();
  }

  const badge = (v: View) =>
    v === "inbox" ? counts.unread : v === "spam" ? counts.spam : blockedCount;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <MessagesSquare className="h-5 w-5 text-accent" />
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">Messages</h1>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => {
              setLoading(true);
              setView(v.key);
            }}
            className={cn(
              "mono inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
              view === v.key
                ? "border-accent bg-accent text-white"
                : "border-line-strong text-ink-soft hover:border-accent hover:text-accent",
            )}
          >
            {v.label}
            {badge(v.key) > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10.5px]",
                  view === v.key ? "bg-white/25" : "bg-line",
                )}
              >
                {badge(v.key)}
              </span>
            )}
          </button>
        ))}

        {(view === "spam" || view === "blocked") && (
          <button
            onClick={purge}
            disabled={busy === "purge"}
            className="mono ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[12px] font-semibold text-ink-soft hover:border-accent hover:text-accent disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {view === "spam" ? "Purge spam" : "Empty bin"}
          </button>
        )}
      </div>

      <p className="mono mb-6 text-[12px] text-ink-soft">
        {view === "inbox" &&
          "Everything a person should read. Owners are emailed on every one, so this is the backup record, not the only copy."}
        {view === "spam" &&
          "Quarantined by the classifier: stored in full, nobody emailed. Every one shows why. If it looks real, hit Not spam and it moves to the inbox."}
        {view === "blocked" &&
          "Payloads refused outright, kept 30 days and then expired automatically. Nothing here was emailed or stored as a message. Restore puts a contact message back in the inbox."}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : view === "blocked" ? (
        <BlockedList
          rows={blocked}
          busy={busy}
          onRestore={restore}
        />
      ) : msgs.length === 0 ? (
        <div className="rounded-card border border-line bg-card p-10 text-center">
          <p className="text-[15px] font-semibold">
            {view === "spam" ? "Nothing quarantined." : "No messages yet."}
          </p>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            {view === "spam"
              ? "When the classifier is unsure about something, it lands here instead of the inbox."
              : "Anything sent from the contact form shows up here."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {msgs.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-card border bg-card p-5",
                m.read || view === "spam"
                  ? "border-line"
                  : "border-accent/50 shadow-[0_0_0_3px_var(--accent-wash)]",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[16px] font-bold">{m.subject}</h3>
                    {!m.read && view === "inbox" && (
                      <span className="mono rounded-full bg-accent-wash px-2 py-0.5 text-[10.5px] font-semibold text-accent-ink">
                        new
                      </span>
                    )}
                    {m.spam && m.spam.verdict === "quarantine" && (
                      <span className="mono rounded-full bg-line px-2 py-0.5 text-[10.5px] font-semibold text-ink-soft">
                        {CATEGORY_LABEL[m.spam.category] ?? m.spam.category} ·{" "}
                        {m.spam.score}
                      </span>
                    )}
                  </div>
                  <div className="mono mt-1 text-[11.5px] text-ink-soft">
                    {m.name} · {m.email} ·{" "}
                    {m.createdAt.slice(0, 16).replace("T", " ")}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
                    {m.message}
                  </p>
                  <Reasons reasons={m.spam?.reasons ?? []} />
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  {view === "spam" ? (
                    <button
                      onClick={() => act(m.id, { notSpam: true })}
                      disabled={busy === m.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-verified px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {busy === m.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      Not spam
                    </button>
                  ) : (
                    <a
                      href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-accent-ink"
                    >
                      <Reply className="h-4 w-4" /> Reply
                    </a>
                  )}
                  {view === "inbox" && (
                    <button
                      onClick={() => act(m.id, { read: !m.read })}
                      disabled={busy === m.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3.5 py-2 text-[13px] font-semibold text-ink-soft hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      {busy === m.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : m.read ? (
                        <Mail className="h-4 w-4" />
                      ) : (
                        <MailOpen className="h-4 w-4" />
                      )}
                      {m.read ? "Unread" : "Read"}
                    </button>
                  )}
                  <button
                    onClick={() => remove(m.id)}
                    disabled={busy === m.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3.5 py-2 text-[13px] font-semibold text-ink-soft hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
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

/**
 * Why the machine flagged it, in the words it recorded at the time.
 *
 * Always the stored reasons, never recomputed. An operator who cannot see why
 * something was flagged cannot correct it, and reasoning that quietly changes
 * under them as rules evolve is worse than none at all.
 */
function Reasons({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-col gap-1 border-l-2 border-line pl-3">
      {reasons.map((r, i) => (
        <li key={i} className="mono text-[11.5px] leading-relaxed text-ink-soft">
          {r}
        </li>
      ))}
    </ul>
  );
}

function BlockedList({
  rows,
  busy,
  onRestore,
}: {
  rows: Blocked[];
  busy: string | null;
  onRestore: (id: string) => void;
}) {
  if (rows.length === 0)
    return (
      <div className="rounded-card border border-line bg-card p-10 text-center">
        <p className="text-[15px] font-semibold">The bin is empty.</p>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Nothing has been refused outright. Anything that is expires by itself
          after 30 days.
        </p>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      {rows.map((b) => {
        const p = b.payload ?? {};
        const title =
          String(p.subject ?? p.name ?? "(no subject)") || "(no subject)";
        return (
          <div key={b.id} className="rounded-card border border-line bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Ban className="h-4 w-4 text-ink-soft" />
                  <h3 className="text-[16px] font-bold">{title}</h3>
                  <span className="mono rounded-full bg-line px-2 py-0.5 text-[10.5px] font-semibold text-ink-soft">
                    {CATEGORY_LABEL[b.category] ?? b.category} · {b.score}
                  </span>
                  <span className="mono rounded-full border border-line-strong px-2 py-0.5 text-[10.5px] text-ink-soft">
                    {b.form}
                  </span>
                </div>
                <div className="mono mt-1 text-[11.5px] text-ink-soft">
                  {String(p.email ?? p.submitterEmail ?? "(no email)")} ·{" "}
                  {b.at.slice(0, 16).replace("T", " ")}
                </div>
                {p.message || p.description ? (
                  <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
                    {String(p.message ?? p.description)}
                  </p>
                ) : null}
                <Reasons reasons={b.reasons ?? []} />
              </div>

              {b.form === "contact" && (
                <button
                  onClick={() => onRestore(b.id)}
                  disabled={busy === b.id}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-verified px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busy === b.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Undo2 className="h-4 w-4" />
                  )}
                  Restore
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
