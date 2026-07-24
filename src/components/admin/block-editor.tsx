"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus, X } from "lucide-react";
import type { Block } from "@/lib/pages/types";
import { RichEditor } from "@/components/blog/rich-editor";

const LABELS: Record<Block["type"], string> = {
  richtext: "Rich text",
  heading: "Heading",
  faq: "FAQ",
  guide: "Guide / steps",
  table: "Table",
  callout: "Callout",
  cta: "Call to action",
  image: "Image",
  toollist: "Tool list",
};

const inp =
  "w-full rounded-lg border border-line-strong bg-ground px-2.5 py-1.5 text-[13px] outline-none focus:border-accent";

export function BlockEditor({
  block,
  onChange,
  onDelete,
  onUp,
  onDown,
}: {
  block: Block;
  onChange: (b: Block) => void;
  onDelete: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className="rounded-card border border-line bg-card">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="mono text-[11px] uppercase tracking-wide text-ink-soft">
          {LABELS[block.type]}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <Icon onClick={onUp} title="Move up"><ChevronUp className="h-4 w-4" /></Icon>
          <Icon onClick={onDown} title="Move down"><ChevronDown className="h-4 w-4" /></Icon>
          <Icon onClick={onDelete} title="Delete" danger><Trash2 className="h-4 w-4" /></Icon>
        </div>
      </div>
      <div className="p-3">
        <Fields block={block} onChange={onChange} />
      </div>
    </div>
  );
}

function Fields({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  switch (block.type) {
    case "heading":
      return (
        <div className="flex gap-2">
          <select
            value={block.level}
            onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 })}
            className="mono rounded-lg border border-line-strong bg-ground px-2 text-[12px]"
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input className={inp} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Heading text" />
        </div>
      );

    case "richtext":
      return <RichEditor value={block.html} onChange={(html) => onChange({ ...block, html })} />;

    case "callout":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <select
              value={block.variant}
              onChange={(e) => onChange({ ...block, variant: e.target.value as "info" | "tip" | "warn" })}
              className="mono rounded-lg border border-line-strong bg-ground px-2 text-[12px]"
            >
              <option value="tip">Tip</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
            </select>
            <input className={inp} value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} placeholder="Title (optional)" />
          </div>
          <textarea rows={2} className={inp} value={block.body} onChange={(e) => onChange({ ...block, body: e.target.value })} placeholder="Callout text" />
        </div>
      );

    case "cta":
      return (
        <div className="flex flex-col gap-2">
          <input className={inp} value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} placeholder="CTA title" />
          <input className={inp} value={block.body ?? ""} onChange={(e) => onChange({ ...block, body: e.target.value })} placeholder="Subtext (optional)" />
          <div className="flex gap-2">
            <input className={inp} value={block.buttonLabel} onChange={(e) => onChange({ ...block, buttonLabel: e.target.value })} placeholder="Button label" />
            <input className={inp} value={block.buttonHref} onChange={(e) => onChange({ ...block, buttonHref: e.target.value })} placeholder="/match or https://…" />
          </div>
        </div>
      );

    case "image":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input className={inp} value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="Image URL" />
            <ImgUpload onUploaded={(url) => onChange({ ...block, url })} />
          </div>
          <input className={inp} value={block.alt ?? ""} onChange={(e) => onChange({ ...block, alt: e.target.value })} placeholder="Alt text (for SEO)" />
          <input className={inp} value={block.caption ?? ""} onChange={(e) => onChange({ ...block, caption: e.target.value })} placeholder="Caption (optional)" />
        </div>
      );

    case "toollist":
      return (
        <div className="flex flex-col gap-2">
          <input className={inp} value={block.heading ?? ""} onChange={(e) => onChange({ ...block, heading: e.target.value })} placeholder="Heading (optional)" />
          <input
            className={inp}
            value={block.slugs.join(", ")}
            onChange={(e) => onChange({ ...block, slugs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            placeholder="Tool slugs, comma-separated (e.g. chatgpt, claude)"
          />
        </div>
      );

    case "faq":
      return (
        <div className="flex flex-col gap-2">
          <input className={inp} value={block.heading ?? ""} onChange={(e) => onChange({ ...block, heading: e.target.value })} placeholder="Heading (optional)" />
          {block.items.map((it, i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-line p-2">
              <div className="flex gap-1.5">
                <input className={inp} value={it.q} onChange={(e) => updateItem(block, i, { q: e.target.value }, onChange)} placeholder="Question" />
                <RemoveBtn onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })} />
              </div>
              <textarea rows={2} className={inp} value={it.a} onChange={(e) => updateItem(block, i, { a: e.target.value }, onChange)} placeholder="Answer" />
            </div>
          ))}
          <AddBtn label="Add Q&A" onClick={() => onChange({ ...block, items: [...block.items, { q: "", a: "" }] })} />
        </div>
      );

    case "guide":
      return (
        <div className="flex flex-col gap-2">
          <input className={inp} value={block.heading ?? ""} onChange={(e) => onChange({ ...block, heading: e.target.value })} placeholder="Heading (optional)" />
          {block.steps.map((s, i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-line p-2">
              <div className="flex gap-1.5">
                <input className={inp} value={s.title} onChange={(e) => updateStep(block, i, { title: e.target.value }, onChange)} placeholder={`Step ${i + 1} title`} />
                <RemoveBtn onClick={() => onChange({ ...block, steps: block.steps.filter((_, j) => j !== i) })} />
              </div>
              <textarea rows={2} className={inp} value={s.body} onChange={(e) => updateStep(block, i, { body: e.target.value }, onChange)} placeholder="Step details" />
            </div>
          ))}
          <AddBtn label="Add step" onClick={() => onChange({ ...block, steps: [...block.steps, { title: "", body: "" }] })} />
        </div>
      );

    case "table":
      return <TableFields block={block} onChange={onChange} />;
  }
}

function TableFields({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "table" }>;
  onChange: (b: Block) => void;
}) {
  const setCol = (i: number, v: string) =>
    onChange({ ...block, columns: block.columns.map((c, j) => (j === i ? v : c)) });
  const setCell = (r: number, c: number, v: string) =>
    onChange({ ...block, rows: block.rows.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row)) });
  const addCol = () => onChange({ ...block, columns: [...block.columns, "Column"], rows: block.rows.map((r) => [...r, ""]) });
  const addRow = () => onChange({ ...block, rows: [...block.rows, block.columns.map(() => "")] });

  return (
    <div className="flex flex-col gap-2">
      <input className={inp} value={block.heading ?? ""} onChange={(e) => onChange({ ...block, heading: e.target.value })} placeholder="Table heading (optional)" />
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              {block.columns.map((c, i) => (
                <th key={i} className="p-1"><input className={`${inp} font-semibold`} value={c} onChange={(e) => setCol(i, e.target.value)} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="p-1"><input className={inp} value={cell} onChange={(e) => setCell(ri, ci, e.target.value)} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <AddBtn label="+ Column" onClick={addCol} />
        <AddBtn label="+ Row" onClick={addRow} />
      </div>
    </div>
  );
}

function updateItem(block: Extract<Block, { type: "faq" }>, i: number, patch: Partial<{ q: string; a: string }>, onChange: (b: Block) => void) {
  onChange({ ...block, items: block.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
}
function updateStep(block: Extract<Block, { type: "guide" }>, i: number, patch: Partial<{ title: string; body: string }>, onChange: (b: Block) => void) {
  onChange({ ...block, steps: block.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
}

function Icon({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title} className={`grid h-7 w-7 place-items-center rounded-md text-ink-soft hover:text-ink ${danger ? "hover:text-accent" : ""}`}>
      {children}
    </button>
  );
}
function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 self-start rounded-lg border border-line-strong px-2.5 py-1.5 text-[12px] font-medium text-ink-soft hover:border-accent hover:text-ink">
      <Plus className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-soft hover:text-accent">
      <X className="h-4 w-4" />
    </button>
  );
}
function ImgUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className="inline-flex shrink-0 cursor-pointer items-center rounded-lg border border-line-strong px-2.5 py-1.5 text-[12px] text-ink-soft hover:border-accent hover:text-ink">
      {busy ? "…" : "Upload"}
      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        setBusy(true);
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch("/api/seoteam/upload", { method: "POST", body: fd });
        setBusy(false);
        if (res.ok) onUploaded((await res.json()).url); else alert((await res.json()).error ?? "Upload failed");
        e.target.value = "";
      }} />
    </label>
  );
}
