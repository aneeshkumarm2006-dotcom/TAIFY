"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { CATEGORIES } from "@/data/tools";
import { normalizeDraft } from "@/lib/submissions/draft";
import type { Pricing, Tool } from "@/lib/types";

/**
 * The listing editor, shared by "Add tool" in the tools admin and by the
 * submission review screen.
 *
 * Split into a controlled field set and a modal wrapper: the tools admin wants
 * a dialog that saves itself, while review wants the same fields inline, with
 * every keystroke flowing back out so the draft can be autosaved and the
 * preview re-rendered.
 */

export const PRICINGS: Pricing[] = ["free", "freemium", "trial", "paid"];

export type ToolFormState = Partial<Tool>;

export const inp =
  "w-full rounded-lg border border-line-strong bg-ground px-3 py-2 text-[14px] outline-none focus:border-accent";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="eyebrow">{label}</label>
      {children}
    </div>
  );
}

/**
 * List fields are edited as text and stored as arrays. While the cursor is in
 * the textarea the value is a raw string; everywhere else it is the array.
 */
export function asText(v: unknown, sep = "\n"): string {
  if (Array.isArray(v)) return v.join(sep);
  return (v ?? "") as string;
}

export function ToolFields({
  value: f,
  onChange,
  showSlug,
}: {
  value: ToolFormState;
  onChange: (next: ToolFormState) => void;
  showSlug?: boolean;
}) {
  const set = (k: keyof Tool, v: unknown) => onChange({ ...f, [k]: v });

  async function pasteImage(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((it) =>
      it.type.startsWith("image/"),
    );
    if (!item) return; // let normal text paste happen
    e.preventDefault();
    const file = item.getAsFile();
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/seoteam/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      const cur = asText(f.images);
      set("images", (cur ? cur + "\n" : "") + url);
    } else {
      alert((await res.json().catch(() => ({})))?.error ?? "Upload failed");
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Field label="Name">
        <input className={inp} value={(f.name as string) ?? ""} onChange={(e) => set("name", e.target.value)} />
      </Field>
      {showSlug && (
        <Field label="Slug (auto from name if blank)">
          <input className={inp} value={(f.slug as string) ?? ""} onChange={(e) => set("slug", e.target.value)} placeholder="my-tool" />
        </Field>
      )}
      <Field label="Tagline">
        <input className={inp} value={(f.tagline as string) ?? ""} onChange={(e) => set("tagline", e.target.value)} />
      </Field>
      <Field label="Description">
        <textarea rows={3} className={inp} value={(f.description as string) ?? ""} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select className={inp} value={(f.category as string) ?? ""} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Pricing">
          <select className={inp} value={(f.pricing as string) ?? "freemium"} onChange={(e) => set("pricing", e.target.value)}>
            {PRICINGS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Real $/mo">
          <input type="number" className={inp} value={(f.costPerMonth as number) ?? 0} onChange={(e) => set("costPerMonth", e.target.value)} />
        </Field>
        <Field label="Billed">
          <select className={inp} value={(f.billing as string) ?? "monthly"} onChange={(e) => set("billing", e.target.value)}>
            <option value="monthly">per month</option>
            <option value="one-time">one-time licence</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mark (2 ltrs)">
          <input className={inp} maxLength={2} value={(f.mark as string) ?? ""} onChange={(e) => set("mark", e.target.value)} />
        </Field>
        <Field label="Color">
          <input type="color" className="h-[38px] w-full rounded-lg border border-line-strong bg-card" value={(f.color as string) ?? "#3a7ca5"} onChange={(e) => set("color", e.target.value)} />
        </Field>
      </div>
      <Field label="Company">
        <input className={inp} value={(f.company as string) ?? ""} onChange={(e) => set("company", e.target.value)} />
      </Field>
      <Field label="Website URL">
        <input className={inp} value={(f.url as string) ?? ""} onChange={(e) => set("url", e.target.value)} placeholder="https://…" />
      </Field>
      <Field label="Logo URL (optional - falls back to letters)">
        <input className={inp} value={(f.logo as string) ?? ""} onChange={(e) => set("logo", e.target.value)} placeholder="https://www.google.com/s2/favicons?domain=domain.com&sz=128" />
      </Field>
      <Field label="Demo video URL (YouTube / Vimeo / mp4)">
        <input className={inp} value={(f.video as string) ?? ""} onChange={(e) => set("video", e.target.value)} placeholder="https://youtube.com/watch?v=…" />
      </Field>
      <Field label="Screenshots (one image URL per line - or paste an image)">
        <textarea rows={3} className={inp} value={asText(f.images)} onChange={(e) => set("images", e.target.value)} onPaste={pasteImage} placeholder="Paste an image, upload, or paste an image URL" />
        <ImageUpload onUploaded={(url) => set("images", (asText(f.images) ? asText(f.images) + "\n" : "") + url)} />
      </Field>
      <Field label="Tags (comma-separated)">
        <input className={inp} value={asText(f.tags, ", ")} onChange={(e) => set("tags", e.target.value)} />
      </Field>
      <Field label="Best for">
        <input className={inp} value={(f.bestFor as string) ?? ""} onChange={(e) => set("bestFor", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Strengths (one per line)">
          <textarea rows={3} className={inp} value={asText(f.pros)} onChange={(e) => set("pros", e.target.value)} />
        </Field>
        <Field label="Watch-outs (one per line)">
          <textarea rows={3} className={inp} value={asText(f.cons)} onChange={(e) => set("cons", e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[13.5px]">
        <input type="checkbox" checked={Boolean(f.featured)} onChange={(e) => set("featured", e.target.checked)} />
        Featured (Editor&apos;s pick)
      </label>
    </div>
  );
}

export function ImageUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1.5 text-[12px] font-medium text-ink-soft hover:border-accent hover:text-ink">
      {busy ? "Uploading…" : "＋ Upload image"}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/seoteam/upload", { method: "POST", body: fd });
          setBusy(false);
          if (res.ok) onUploaded((await res.json()).url);
          else alert((await res.json()).error ?? "Upload failed");
          e.target.value = "";
        }}
      />
    </label>
  );
}

/** The tools-admin dialog: the same fields, saving themselves to /api/admin/tools. */
export function ToolFormModal({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: ToolFormState;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<ToolFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(
      isNew ? "/api/admin/tools" : `/api/admin/tools/${initial.slug}`,
      {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizeDraft(f)),
      },
    );
    if (res.ok) onSaved();
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Save failed.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-2xl rounded-card bg-card p-6 shadow-card-lg sm:p-8"
      >
        <h2 className="mb-1 text-[20px] font-bold tracking-tight">
          {isNew ? "Add tool" : `Edit ${initial.name}`}
        </h2>

        <div className="mt-5">
          <ToolFields value={f} onChange={setF} showSlug={isNew} />

          {error && <p className="mt-3 text-[13px] text-accent-ink">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-5 py-2.5 text-[14px] font-bold text-white hover:bg-accent-ink disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isNew ? "Create tool" : "Save changes"}
            </button>
            <button onClick={onClose} className="rounded-[10px] border border-line-strong px-4 py-2.5 text-[14px] font-semibold text-ink-soft hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
