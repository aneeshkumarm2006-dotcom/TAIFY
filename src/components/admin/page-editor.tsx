"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, ExternalLink, Check } from "lucide-react";
import type { AdminCategoryPage, Block, BlockType, Page } from "@/lib/pages/types";
import { emptyBlock } from "@/lib/pages/types";
import { BlockEditor } from "./block-editor";
import { SlugField } from "./slug-field";

const BLOCK_TYPES: { type: BlockType; label: string }[] = [
  { type: "richtext", label: "Rich text" },
  { type: "heading", label: "Heading" },
  { type: "faq", label: "FAQ" },
  { type: "guide", label: "Guide / steps" },
  { type: "table", label: "Table" },
  { type: "callout", label: "Callout" },
  { type: "cta", label: "Call to action" },
  { type: "image", label: "Image" },
  { type: "toollist", label: "Tool list" },
];

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10));

const inp =
  "w-full rounded-lg border border-line-strong bg-ground px-3 py-2 text-[14px] outline-none focus:border-accent";

export function PageEditor({
  initial,
  onBack,
}: {
  initial: Page | AdminCategoryPage;
  onBack: () => void;
}) {
  const [page, setPage] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const isCustom = page.type === "custom";
  const set = <K extends keyof Page>(k: K, v: Page[K]) => setPage((p) => ({ ...p, [k]: v }));

  // A category is addressed by its permanent id, which is also what its page key
  // carries - so the id survives however many times the URL changes.
  const categoryId = "categoryId" in page ? page.categoryId : page.key.slice("category:".length);
  const prefix = isCustom ? "/" : "/category/";
  const publicUrl = `${prefix}${page.slug}`;

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch(`/api/admin/pages/${encodeURIComponent(page.key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: page.title,
        metaTitle: page.metaTitle,
        excerpt: page.excerpt,
        intro: page.intro,
        blocks: page.blocks,
        customSchema: page.customSchema,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function togglePublish() {
    const action = page.status === "published" ? "unpublish" : "publish";
    await fetch(`/api/admin/pages/${encodeURIComponent(page.key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    set("status", action === "publish" ? "published" : "draft");
  }

  function addBlock(type: BlockType) {
    set("blocks", [...page.blocks, emptyBlock(type, uid())]);
    setShowAdd(false);
  }
  const updateBlock = (i: number, b: Block) => set("blocks", page.blocks.map((x, j) => (j === i ? b : x)));
  const deleteBlock = (i: number) => set("blocks", page.blocks.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= page.blocks.length) return;
    const next = [...page.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    set("blocks", next);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="mono inline-flex items-center gap-1 text-[12px] text-ink-soft hover:text-accent">
          <ArrowLeft className="h-3.5 w-3.5" /> All pages
        </button>
        <span className="mono rounded-full bg-accent-wash px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
          {isCustom ? page.status : "category page"}
        </span>
        <Link href={publicUrl} target="_blank" className="mono inline-flex items-center gap-1 text-[12px] text-ink-soft hover:text-accent">
          <ExternalLink className="h-3.5 w-3.5" /> View
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {isCustom && (
            <button onClick={togglePublish} className="rounded-lg border border-line-strong px-3.5 py-2 text-[13px] font-semibold text-ink-soft hover:text-ink">
              {page.status === "published" ? "Unpublish" : "Publish"}
            </button>
          )}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-bold text-white hover:bg-accent-ink disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saved && <Check className="h-4 w-4" />}
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Content */}
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-line bg-card p-4">
            <label className="eyebrow">Page title (H1)</label>
            <input className={`${inp} mt-1.5 text-[18px] font-bold`} value={page.title} onChange={(e) => set("title", e.target.value)} />
            <label className="eyebrow mt-3 block">Intro paragraph</label>
            <textarea rows={2} className={`${inp} mt-1.5`} value={page.intro} onChange={(e) => set("intro", e.target.value)} placeholder="Short intro under the heading" />
          </div>

          {page.blocks.map((b, i) => (
            <BlockEditor
              key={b.id}
              block={b}
              onChange={(nb) => updateBlock(i, nb)}
              onDelete={() => deleteBlock(i)}
              onUp={() => move(i, -1)}
              onDown={() => move(i, 1)}
            />
          ))}

          {/* Add block */}
          <div className="relative">
            <button onClick={() => setShowAdd((s) => !s)} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-4 py-2.5 text-[13.5px] font-medium text-ink-soft hover:border-accent hover:text-ink">
              <Plus className="h-4 w-4" /> Add block
            </button>
            {showAdd && (
              <div className="absolute z-10 mt-1.5 grid grid-cols-2 gap-1 rounded-xl border border-line bg-card p-2 shadow-card-lg">
                {BLOCK_TYPES.map((t) => (
                  <button key={t.type} onClick={() => addBlock(t.type)} className="rounded-lg px-3 py-2 text-left text-[13px] hover:bg-accent-wash hover:text-accent-ink">
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SEO sidebar */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-card border border-line bg-card p-4">
            <h3 className="eyebrow mb-3">SEO</h3>
            <SlugField
              // Remounts on a change so the input tracks the new slug rather
              // than holding the value the editor was opened with.
              key={page.slug}
              prefix={prefix}
              slug={page.slug}
              endpoint={
                isCustom
                  ? {
                      url: `/api/admin/pages/${encodeURIComponent(page.key)}/slug`,
                      method: "POST",
                    }
                  : { url: `/api/admin/categories/${encodeURIComponent(categoryId)}`, method: "PUT" }
              }
              onChanged={({ slug, key }) =>
                // A custom-page rename rekeys the document, so the editor has to
                // adopt the new key before any further save addresses a document
                // that no longer exists.
                setPage((prev) => ({ ...prev, slug, key: key ?? prev.key }))
              }
            />
            <label className="eyebrow">Meta title</label>
            <input className={`${inp} mt-1.5`} value={page.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} placeholder="Defaults to page title" />
            <label className="eyebrow mt-3 block">Meta description</label>
            <textarea rows={3} className={`${inp} mt-1.5`} value={page.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
          </div>
          <div className="rounded-card border border-line bg-card p-4">
            <h3 className="eyebrow mb-2">Custom schema (JSON-LD)</h3>
            <p className="mb-2 text-[11px] text-ink-soft">
              FAQ &amp; Guide blocks already generate schema automatically. Add extra JSON-LD here (optional).
            </p>
            <textarea rows={5} className={`${inp} mono text-[12px]`} value={page.customSchema} onChange={(e) => set("customSchema", e.target.value)} placeholder='{"@context":"https://schema.org", ...}' />
          </div>
        </aside>
      </div>
    </div>
  );
}
