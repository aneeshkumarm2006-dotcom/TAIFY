"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  BadgeCheck,
  Loader2,
  Search,
} from "lucide-react";
import { CATEGORIES } from "@/data/tools";
import type { Pricing, Tool } from "@/lib/types";
import { BrandLogo } from "@/components/brand-logo";
import { PricingBadge } from "@/components/ui/badge";
import { timeAgo, cn } from "@/lib/utils";

const PRICINGS: Pricing[] = ["free", "freemium", "trial", "paid"];

type FormState = Partial<Tool>;

export function ToolsAdmin() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [dbEnabled, setDbEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [isNew, setIsNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/tools");
    const data = await res.json();
    setTools(data.tools ?? []);
    setDbEnabled(data.dbEnabled ?? false);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = tools.filter((t) =>
    q ? t.name.toLowerCase().includes(q.toLowerCase()) : true,
  );

  async function del(slug: string) {
    if (!confirm(`Delete "${slug}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/tools/${slug}`, { method: "DELETE" });
    load();
  }
  async function patch(slug: string, action: string) {
    await fetch(`/api/admin/tools/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">
            Tools ({tools.length})
          </h1>
          <p className="mono text-[12px] text-ink-soft">
            Manage every AI listing on the site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-48 rounded-lg border border-line-strong bg-card py-2 pl-8 pr-3 text-[13.5px] outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={() => {
              setEditing({ pricing: "freemium", category: "productivity", color: "#3a7ca5" });
              setIsNew(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13.5px] font-semibold text-white hover:bg-accent-ink"
          >
            <Plus className="h-4 w-4" /> Add tool
          </button>
        </div>
      </div>

      {!dbEnabled && (
        <p className="mb-4 rounded-lg border border-paid/40 bg-paid-wash px-4 py-2.5 text-[13px] text-paid">
          Read-only: no database connected (set MONGODB_URI). Editing is disabled.
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-card">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="mono text-[11px] uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 text-left">Tool</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Pricing</th>
                <th className="px-4 py-3 text-left">Verified</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.slug} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <BrandLogo name={t.name} mark={t.mark} color={t.color} logo={t.logo} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold">
                          {t.name}
                          {t.featured && (
                            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                          )}
                        </div>
                        <div className="mono text-[11px] text-ink-soft">{t.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{t.category}</td>
                  <td className="px-4 py-3">
                    <PricingBadge pricing={t.pricing} />
                  </td>
                  <td className="mono px-4 py-3 text-[12px] text-ink-soft">
                    {timeAgo(t.verifiedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn title="Re-verify now" onClick={() => patch(t.slug, "verify")}>
                        <BadgeCheck className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        title={t.featured ? "Un-feature" : "Feature"}
                        active={t.featured}
                        onClick={() => patch(t.slug, t.featured ? "unfeature" : "feature")}
                      >
                        <Star className={cn("h-4 w-4", t.featured && "fill-current")} />
                      </IconBtn>
                      <IconBtn
                        title="Edit"
                        onClick={() => {
                          setEditing(t);
                          setIsNew(false);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn title="Delete" danger onClick={() => del(t.slug)}>
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ToolForm
          initial={editing}
          isNew={isNew}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg border border-transparent text-ink-soft transition-colors hover:border-line-strong hover:text-ink",
        danger && "hover:border-accent/40 hover:text-accent",
        active && "text-accent",
      )}
    >
      {children}
    </button>
  );
}

function ToolForm({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: FormState;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Tool, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true);
    setError(null);
    const lines = (v: unknown) =>
      typeof v === "string"
        ? v.split("\n").map((s) => s.trim()).filter(Boolean)
        : v;
    const payload = {
      ...f,
      tags:
        typeof f.tags === "string"
          ? (f.tags as string).split(",").map((s) => s.trim()).filter(Boolean)
          : f.tags,
      pros: lines(f.pros),
      cons: lines(f.cons),
      images: lines(f.images),
    };
    const res = await fetch(
      isNew ? "/api/admin/tools" : `/api/admin/tools/${initial.slug}`,
      {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (res.ok) onSaved();
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Save failed.");
      setSaving(false);
    }
  }

  const asText = (v: unknown) => (Array.isArray(v) ? v.join(v === f.tags ? ", " : "\n") : (v ?? "") as string);

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

        <div className="mt-5 flex flex-col gap-3.5">
          <Field label="Name">
            <input className={inp} value={(f.name as string) ?? ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
          {isNew && (
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
                  <option key={c.slug} value={c.slug}>{c.name}</option>
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
          <div className="grid grid-cols-3 gap-3">
            <Field label="Real $/mo">
              <input type="number" className={inp} value={(f.costPerMonth as number) ?? 0} onChange={(e) => set("costPerMonth", e.target.value)} />
            </Field>
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
            <input className={inp} value={asText(f.tags)} onChange={(e) => set("tags", e.target.value)} />
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

          {error && <p className="text-[13px] text-accent-ink">{error}</p>}

          <div className="mt-2 flex gap-2">
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

function ImageUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
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
