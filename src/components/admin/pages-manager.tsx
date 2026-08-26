"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, FileStack } from "lucide-react";
import type { AdminCategoryPage, Page } from "@/lib/pages/types";
import { categoryIcon } from "@/lib/category-icons";
import { PageEditor } from "./page-editor";
import { cn } from "@/lib/utils";

export function PagesManager() {
  const [categories, setCategories] = useState<AdminCategoryPage[]>([]);
  const [custom, setCustom] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Page | AdminCategoryPage | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/pages");
    const data = await res.json();
    setCategories(data.categories ?? []);
    setCustom(data.custom ?? []);
    setLoading(false);
    return data as { categories: AdminCategoryPage[]; custom: Page[] };
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function createPage() {
    setErr(null);
    const res = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error ?? "Failed");
    setNewTitle("");
    setCreating(false);
    const fresh = await load();
    const created = fresh.custom.find((p) => p.key === data.key);
    if (created) setEditing(created);
  }

  async function del(key: string) {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    await fetch(`/api/admin/pages/${encodeURIComponent(key)}`, { method: "DELETE" });
    load();
  }

  if (editing) {
    return <PageEditor initial={editing} onBack={() => { setEditing(null); load(); }} />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <FileStack className="h-5 w-5 text-accent" />
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">Pages</h1>
      </div>
      <p className="mono mb-8 text-[12px] text-ink-soft">
        Edit category landing pages, or build custom pages with FAQ, guide,
        table &amp; more - schema is generated automatically.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {/* Category pages */}
          <section>
            <h2 className="mb-3 text-[16px] font-bold">Category pages</h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((p) => {
                // Keyed by the permanent id: a renamed category keeps its icon.
                const Icon = categoryIcon(p.categoryId);
                return (
                  <button
                    key={p.key}
                    onClick={() => setEditing(p)}
                    className="flex items-center gap-3 rounded-card border border-line bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-card"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent-wash text-accent-ink">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold">{p.title}</div>
                      <div className="mono truncate text-[11px] text-ink-soft">/category/{p.slug}</div>
                    </div>
                    <Pencil className="ml-auto h-4 w-4 shrink-0 text-ink-soft" />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Custom pages */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-bold">Custom pages ({custom.length})</h2>
              <button onClick={() => setCreating((c) => !c)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-accent-ink">
                <Plus className="h-4 w-4" /> New page
              </button>
            </div>

            {creating && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-card border border-line bg-card p-4">
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Page title (e.g. Best AI Tools for Startups)"
                  className="min-w-[240px] flex-1 rounded-lg border border-line-strong bg-ground px-3 py-2 text-[14px] outline-none focus:border-accent"
                  onKeyDown={(e) => e.key === "Enter" && newTitle.trim() && createPage()}
                />
                <button onClick={createPage} disabled={!newTitle.trim()} className="rounded-lg bg-accent px-4 py-2 text-[13px] font-bold text-white hover:bg-accent-ink disabled:opacity-50">
                  Create
                </button>
                {err && <span className="text-[12px] text-accent-ink">{err}</span>}
              </div>
            )}

            {custom.length === 0 ? (
              <p className="rounded-card border border-line bg-card p-6 text-center text-[13.5px] text-ink-soft">
                No custom pages yet. Create one to build a landing page with blocks.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {custom.map((p) => (
                  <div key={p.key} className="flex items-center gap-3 rounded-card border border-line bg-card p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-semibold">{p.title}</span>
                        <span className={cn("mono rounded-full px-2 py-0.5 text-[10px] font-semibold", p.status === "published" ? "bg-verified-wash text-verified" : "bg-paid-wash text-paid")}>
                          {p.status}
                        </span>
                      </div>
                      <div className="mono truncate text-[11px] text-ink-soft">/{p.slug}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <button onClick={() => setEditing(p)} title="Edit" className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:text-ink"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => del(p.key)} title="Delete" className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:text-accent"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
