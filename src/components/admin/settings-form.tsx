"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, Megaphone } from "lucide-react";
import type { SiteSettings } from "@/lib/settings";

export function SettingsForm() {
  const [s, setS] = useState<SiteSettings | null>(null);
  const [messages, setMessages] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setS(d.settings);
        setMessages((d.settings.tickerMessages ?? []).join("\n"));
      });
  }, []);

  if (!s) {
    return (
      <div className="flex items-center gap-2 py-10 text-ink-soft">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tickerEnabled: s!.tickerEnabled,
        tickerSpeed: s!.tickerSpeed,
        tickerMessages: messages.split("\n").map((m) => m.trim()).filter(Boolean),
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-accent" />
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]">
          Announcement ticker
        </h1>
      </div>

      <div className="rounded-card border border-line bg-card p-5">
        <label className="mb-4 flex items-center gap-2.5 text-[14px] font-medium">
          <input
            type="checkbox"
            checked={s.tickerEnabled}
            onChange={(e) => setS({ ...s, tickerEnabled: e.target.checked })}
            className="h-4 w-4"
          />
          Show the scrolling ticker at the top of the site
        </label>

        <div className="mb-4 flex flex-col gap-1.5">
          <label className="eyebrow">Messages (one per line)</label>
          <textarea
            rows={6}
            value={messages}
            onChange={(e) => setMessages(e.target.value)}
            placeholder="🚀 New feature announcement…"
            className="rounded-lg border border-line-strong bg-ground px-3 py-2 text-[14px] outline-none focus:border-accent"
          />
          <span className="mono text-[11px] text-ink-soft">
            Emoji welcome. They scroll left in a loop.
          </span>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <label className="eyebrow">Scroll speed (seconds per loop)</label>
          <input
            type="number"
            min={8}
            max={120}
            value={s.tickerSpeed}
            onChange={(e) => setS({ ...s, tickerSpeed: Number(e.target.value) })}
            className="w-20 rounded-lg border border-line-strong bg-ground px-3 py-1.5 text-[14px] outline-none focus:border-accent"
          />
          <span className="mono text-[11px] text-ink-soft">lower = faster</span>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-5 py-2.5 text-[14px] font-bold text-white hover:bg-accent-ink disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saved && <Check className="h-4 w-4" />}
          {saved ? "Saved" : "Save changes"}
        </button>
        <p className="mono mt-3 text-[11px] text-ink-soft">
          Changes appear on the site within a few minutes (or instantly on
          dynamic pages).
        </p>
      </div>
    </div>
  );
}
