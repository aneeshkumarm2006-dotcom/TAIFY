"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useTurnstile } from "@/components/turnstile-widget";

export function ContactForm() {
  const [f, setF] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    // Honeypot. Never shown to a human, so anything in it came from a bot.
    website: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  // Time between the form appearing and the POST. A direct POST has no stamp at
  // all, which the server scores differently from a fast one: a browser holding
  // a cached bundle from before this shipped must not have its message bounced.
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const turnstile = useTurnstile();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim() || !f.email.trim() || !f.subject.trim() || !f.message.trim()) {
      setError("Name, email, subject and message are all required.");
      return;
    }
    setStatus("saving");
    setError(null);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        elapsedMs: openedAt.current ? Date.now() - openedAt.current : undefined,
        turnstileToken: turnstile.token ?? undefined,
      }),
    });
    if (res.ok) setStatus("done");
    else {
      setError((await res.json().catch(() => ({})))?.error ?? "Something went wrong.");
      setStatus("error");
      // Turnstile tokens are single-use, so a retry needs a fresh one.
      turnstile.reset();
    }
  }

  if (status === "done") {
    return (
      <div className="mt-10 rounded-card border border-verified/40 bg-verified-wash p-8 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-verified" />
        <h2 className="mt-3 text-[18px] font-bold">Thanks - message sent!</h2>
        <p className="mt-1 text-[14px] text-ink-soft">
          We read every message and reply to <b>{f.email}</b>, usually within a
          couple of working days.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-10 flex flex-col gap-4 rounded-card border border-line bg-card p-6 shadow-card"
    >
      <Field label="Your name *">
        <input
          className={inp}
          value={f.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Jane Doe"
          autoComplete="name"
        />
      </Field>
      <Field label="Your email *">
        <input
          className={inp}
          value={f.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="you@company.com"
          type="email"
          autoComplete="email"
        />
      </Field>
      <Field label="Subject *">
        <input
          className={inp}
          value={f.subject}
          onChange={(e) => set("subject", e.target.value)}
          placeholder="What's this about?"
        />
      </Field>
      <Field label="Message *">
        <textarea
          rows={6}
          className={inp}
          value={f.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Tell us what you need…"
        />
      </Field>

      {/* Honeypot. Hidden from people and from screen readers; bots fill it. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website-url">Leave this field empty</label>
        <input
          id="website-url"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={f.website}
          onChange={(e) => set("website", e.target.value)}
        />
      </div>

      {turnstile.element}

      {error && <p className="text-[13px] text-accent-ink">{error}</p>}

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-1 inline-flex items-center gap-2 self-start rounded-[10px] bg-accent px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-accent-ink disabled:opacity-50"
      >
        {status === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
        Send message
      </button>
      <p className="mono text-[11px] text-ink-soft">
        We only use your address to reply. No newsletter, no list.
      </p>
    </form>
  );
}

const inp =
  "w-full rounded-lg border border-line-strong bg-ground px-3 py-2 text-[14px] outline-none focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="eyebrow">{label}</label>
      {children}
    </div>
  );
}
