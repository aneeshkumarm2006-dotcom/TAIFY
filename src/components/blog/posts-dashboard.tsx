"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Eye,
  Loader2,
  Search,
} from "lucide-react";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PostsDashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/seoteam/posts");
    const data = await res.json();
    setPosts(data.posts ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const filtered = posts.filter(
    (p) =>
      (filter === "all" || p.status === filter) &&
      (q ? p.title.toLowerCase().includes(q.toLowerCase()) : true),
  );

  async function patch(slug: string, action: string) {
    await fetch(`/api/seoteam/posts/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  }
  async function del(slug: string) {
    if (!confirm(`Delete "${slug}"? This cannot be undone.`)) return;
    await fetch(`/api/seoteam/posts/${slug}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">
            Blog posts ({posts.length})
          </h1>
          <p className="mono text-[12px] text-ink-soft">
            Publish and manage SEO posts. Published posts appear instantly on /blog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-44 rounded-lg border border-line-strong bg-card py-2 pl-8 pr-3 text-[13.5px] outline-none focus:border-accent"
            />
          </div>
          <Link
            href="/seoteam/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13.5px] font-semibold text-white hover:bg-accent-ink"
          >
            <Plus className="h-4 w-4" /> New post
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-1">
        {(["all", "published", "draft"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "mono rounded-lg px-3 py-1.5 text-[12px] capitalize transition-colors",
              filter === f ? "bg-accent-wash text-accent-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-card p-10 text-center">
          <p className="text-[15px] font-semibold">No posts yet.</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Click <b>New post</b> to pick a template and start writing.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-card">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="mono text-[11px] uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Published</th>
                <th className="px-4 py-3 text-right">Views</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.slug} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{p.title || "(untitled)"}</div>
                    <div className="mono text-[11px] text-ink-soft">{p.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "mono rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                        p.status === "published"
                          ? "bg-verified-wash text-verified"
                          : "bg-paid-wash text-paid",
                      )}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="mono px-4 py-3 text-[12px] text-ink-soft">
                    {p.publishedAt ? p.publishedAt.slice(0, 10) : "-"}
                  </td>
                  <td className="tnum px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-ink-soft">
                      <Eye className="h-3.5 w-3.5" /> {p.views}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === "published" && (
                        <Link href={`/blog/${p.slug}`} target="_blank" title="View" className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:text-ink">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                      <Link href={`/seoteam/edit/${p.slug}`} title="Edit" className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:text-ink">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => patch(p.slug, p.status === "published" ? "unpublish" : "publish")}
                        className="mono rounded-lg border border-line-strong px-2.5 py-1.5 text-[11px] text-ink-soft hover:border-accent hover:text-ink"
                      >
                        {p.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                      <button onClick={() => del(p.slug)} title="Delete" className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:text-accent">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
