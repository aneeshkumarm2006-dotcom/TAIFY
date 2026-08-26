"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import { CATEGORIES } from "@/data/tools";
import { Select } from "@/components/ui/select";
import { useTurnstile } from "@/components/turnstile-widget";

interface FormError {
  message: string;
  /** Set when the tool is already in the catalog, so we can link to it. */
  existingSlug?: string;
}

export function SubmitForm() {
  const [f, setF] = useState({
    name: "",
    url: "",
    tagline: "",
    description: "",
    category: "",
    images: "",
    video: "",
    submitterEmail: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<FormError | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  // Two signals a script cannot fake convincingly: a field only a headless
  // browser would find, and the time between the form appearing and being
  // submitted. Both are read by the API, which answers a bot exactly as it
  // answers a person.
  const trap = useRef<HTMLInputElement>(null);
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const turnstile = useTurnstile();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim() || !f.url.trim()) {
      setError({ message: "Tool name and website are required." });
      return;
    }
    if (!f.submitterEmail.trim()) {
      setError({ message: "We need an email address to reach you about the listing." });
      return;
    }
    setStatus("saving");
    setError(null);
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        images: f.images.split("\n").map((s) => s.trim()).filter(Boolean),
        company_website: trap.current?.value ?? "",
        elapsedMs: openedAt.current ? Date.now() - openedAt.current : undefined,
        turnstileToken: turnstile.token ?? undefined,
      }),
    });
    if (res.ok) setStatus("done");
    else {
      const d = (await res.json().catch(() => ({}))) as {
        error?: string;
        existingSlug?: string;
      };
      setError({
        message: d.error ?? "Something went wrong.",
        existingSlug: d.existingSlug,
      });
      setStatus("error");
      // Turnstile tokens are single-use, so a retry needs a fresh one.
      turnstile.reset();
    }
  }

  if (status === "done") {
    return (
      <div className="mt-10 rounded-card border border-verified/40 bg-verified-wash p-8 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-verified" />
        <h2 className="mt-3 text-[18px] font-bold">Thanks - submission received!</h2>
        <p className="mt-1 text-[14px] text-ink-soft">
          Our team will review <b>{f.name}</b> and publish it if it&apos;s a fit.
          We&apos;ve sent a confirmation to {f.submitterEmail}.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-10 flex flex-col gap-4 rounded-card border border-line bg-card p-6 shadow-card"
    >
      <Field label="Tool name *">
        <input className={inp} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. ChatGPT" />
      </Field>
      <Field label="Website *">
        <input className={inp} value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" type="url" />
      </Field>
      <Field label="One-line tagline">
        <input className={inp} value={f.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="What it does, in a sentence" />
      </Field>
      <Field label="What task does it solve?">
        <textarea rows={3} className={inp} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the job your tool is best at…" />
      </Field>
      <Field label="Category">
        <Select
          value={f.category}
          onChange={(v) => set("category", v)}
          options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Pick a category…"
          className="w-full sm:w-64"
        />
      </Field>
      <Field label="Screenshots (one image URL per line)">
        <textarea rows={2} className={inp} value={f.images} onChange={(e) => set("images", e.target.value)} placeholder="https://…image.png" />
      </Field>
      <Field label="Demo video URL (YouTube / Vimeo)">
        <input className={inp} value={f.video} onChange={(e) => set("video", e.target.value)} placeholder="https://youtube.com/watch?v=…" />
      </Field>
      <Field label="Your email *">
        <input className={inp} value={f.submitterEmail} onChange={(e) => set("submitterEmail", e.target.value)} placeholder="you@company.com" type="email" />
        <p className="mono text-[11px] text-ink-soft">
          Where we send the decision. Never published on your listing.
        </p>
      </Field>

      {/* Honeypot. Hidden from people and from screen readers; bots fill it. */}
      <input
        ref={trap}
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {turnstile.element}

      {error && (
        <p className="text-[13px] text-accent-ink">
          {error.message}
          {error.existingSlug && (
            <>
              {" "}
              <Link href={`/tool/${error.existingSlug}`} className="underline">
                See the listing
              </Link>
              .
            </>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-1 inline-flex items-center gap-2 self-start rounded-[10px] bg-accent px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-accent-ink disabled:opacity-50"
      >
        {status === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit for review
      </button>
      <p className="mono text-[11px] text-ink-soft">
        Reviewed by our team before it goes live. Basic listing is free.
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
