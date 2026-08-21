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
import type { Tool } from "@/lib/types";
import {
  ToolFormModal,
  type ToolFormState,
} from "@/components/admin/tool-form";
import { BrandLogo } from "@/components/brand-logo";
import { PricingBadge } from "@/components/ui/badge";
import { timeAgo, cn } from "@/lib/utils";


export function ToolsAdmin() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [dbEnabled, setDbEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<ToolFormState | null>(null);
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
        <ToolFormModal
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
