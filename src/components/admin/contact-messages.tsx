"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Trash2, Mail, MailOpen, MessagesSquare, Reply } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function ContactMessages() {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Refresh used by the action handlers. `loading` is only ever cleared, never
  // re-set, so re-fetching after an action leaves the list on screen instead of
  // blanking it back to the spinner.
  const load = useCallback(async () => {
    const res = await fetch("/api/admin/messages");
    const data = await res.json();
    setMsgs(data.messages ?? []);
    setLoading(false);
  }, []);

  // Initial fetch. Inline rather than calling load() so no setState happens
  // synchronously in the effect body, and cancelled on unmount so a slow
  // response cannot land on a component that has gone away.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/messages");
      const data = await res.json();
      if (cancelled) return;
      setMsgs(data.messages ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleRead(m: Message) {
    setBusy(m.id);
    await fetch(`/api/admin/messages/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: !m.read }),
    });
    setBusy(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    setBusy(id);
    await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
    setBusy(null);
    load();
  }

  const unread = msgs.filter((m) => !m.read).length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <MessagesSquare className="h-5 w-5 text-accent" />
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">
          Messages ({msgs.length})
        </h1>
        {unread > 0 && (
          <span className="mono rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-white">
            {unread} unread
          </span>
        )}
      </div>
      <p className="mono mb-6 text-[12px] text-ink-soft">
        Everything sent through the public contact form. Owners are emailed on
        every one, so this is the backup record, not the only copy.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : msgs.length === 0 ? (
        <div className="rounded-card border border-line bg-card p-10 text-center">
          <p className="text-[15px] font-semibold">No messages yet.</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Anything sent from the contact form shows up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {msgs.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-card border bg-card p-5",
                m.read ? "border-line" : "border-accent/50 shadow-[0_0_0_3px_var(--accent-wash)]",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[16px] font-bold">{m.subject}</h3>
                    {!m.read && (
                      <span className="mono rounded-full bg-accent-wash px-2 py-0.5 text-[10.5px] font-semibold text-accent-ink">
                        new
                      </span>
                    )}
                  </div>
                  <div className="mono mt-1 text-[11.5px] text-ink-soft">
                    {m.name} · {m.email} · {m.createdAt.slice(0, 16).replace("T", " ")}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
                    {m.message}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <a
                    href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-accent-ink"
                  >
                    <Reply className="h-4 w-4" /> Reply
                  </a>
                  <button
                    onClick={() => toggleRead(m)}
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
