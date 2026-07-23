"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ExternalLink, ImagePlus } from "lucide-react";
import type { KeywordLink, Post, PostTemplate } from "@/lib/types";
import { slugify, cn } from "@/lib/utils";
import { RichEditor } from "./rich-editor";
import { KeywordEditor } from "./keyword-editor";
import { SeoPanel } from "./seo-panel";

export function PostEditor({
  initial,
  isNew,
}: {
  initial: Partial<Post> & { template: PostTemplate };
  isNew: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle ?? "");
  const [excerpt, setExcerpt] = useState(initial.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(initial.coverImage ?? "");
  const [author, setAuthor] = useState(initial.author ?? "");
  const [body, setBody] = useState(initial.body ?? "");
  const [keywords, setKeywords] = useState<KeywordLink[]>(initial.keywords ?? []);
  const [linkFirstOnly, setLinkFirstOnly] = useState(initial.linkFirstOnly ?? true);
  const [status] = useState(initial.status ?? "draft");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  const payload = () => ({
    title,
    slug: isNew ? slugify(slug || title) : initial.slug,
    template: initial.template,
    body,
    excerpt,
    metaTitle: metaTitle || title,
    coverImage,
    author,
    keywords,
    linkFirstOnly,
  });

  async function save(publish: boolean) {
    if (!title.trim()) {
      setError("Add a title first.");
      return;
    }
    setBusy(publish ? "publish" : "save");
    setError(null);

    if (isNew) {
      const res = await fetch("/api/seoteam/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload(), status: publish ? "published" : "draft" }),
      });
      const data = await res.json();
      if (!res.ok) return fail(data.error);
      if (publish) router.push(`/blog/${data.slug}`);
      else router.push(`/seoteam/edit/${data.slug}`);
      router.refresh();
      return;
    }

    // Existing: save content, then publish/unpublish if requested.
    const res = await fetch(`/api/seoteam/posts/${initial.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    });
    if (!res.ok) return fail((await res.json()).error);
    if (publish) {
      await fetch(`/api/seoteam/posts/${initial.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      router.push(`/blog/${initial.slug}`);
    }
    setBusy(null);
    router.refresh();
  }

  async function unpublish() {
    setBusy("unpublish");
    await fetch(`/api/seoteam/posts/${initial.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unpublish" }),
    });
    setBusy(null);
    router.refresh();
  }

  function fail(msg?: string) {
    setError(msg ?? "Something went wrong.");
    setBusy(null);
  }

  async function uploadCover(file: File) {
    setCoverUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/seoteam/upload", { method: "POST", body: fd });
    setCoverUploading(false);
    if (!res.ok) return alert((await res.json()).error ?? "Upload failed.");
    setCoverImage((await res.json()).url);
  }

  const postLike = { title, metaTitle, excerpt, body, coverImage, keywords };

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6 lg:px-10">
      {/* Action bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/seoteam" className="mono inline-flex items-center gap-1 text-[12px] text-ink-soft hover:text-accent">
          <ArrowLeft className="h-3.5 w-3.5" /> All posts
        </Link>
        <StatusPill status={status} isNew={isNew} />
        <div className="ml-auto flex items-center gap-2">
          {!isNew && status === "published" && (
            <>
              <Link
                href={`/blog/${initial.slug}`}
                target="_blank"
                className="mono inline-flex items-center gap-1 rounded-lg border border-line-strong px-3 py-2 text-[12.5px] text-ink-soft hover:text-ink"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View
              </Link>
              <button
                onClick={unpublish}
                disabled={busy !== null}
                className="rounded-lg border border-line-strong px-3.5 py-2 text-[13px] font-semibold text-ink-soft hover:text-ink"
              >
                Unpublish
              </button>
            </>
          )}
          <button
            onClick={() => save(false)}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3.5 py-2 text-[13px] font-semibold hover:border-accent disabled:opacity-50"
          >
            {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
            {isNew ? "Save draft" : "Save"}
          </button>
          <button
            onClick={() => save(true)}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-bold text-white hover:bg-accent-ink disabled:opacity-50"
          >
            {busy === "publish" && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === "published" && !isNew ? "Update" : "Publish"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-[13px] text-accent-ink">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main */}
        <div>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (isNew && !slug) setSlug(slugify(e.target.value));
            }}
            placeholder="Post title"
            className="mb-4 w-full bg-transparent text-[30px] font-extrabold tracking-[-0.03em] outline-none placeholder:text-ink-soft"
          />
          <RichEditor value={body} onChange={setBody} />
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-card border border-line bg-card p-4">
            <Field label="Slug">
              {isNew ? (
                <input className={inp} value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="post-url" />
              ) : (
                <div className="mono rounded-lg border border-line bg-ground px-3 py-2 text-[13px] text-ink-soft">
                  /blog/{initial.slug}
                </div>
              )}
            </Field>
            <CountField
              label="Meta title"
              value={metaTitle}
              onChange={setMetaTitle}
              placeholder={title || "Defaults to title"}
              min={50}
              max={60}
            />
            <CountField
              label="Meta description (excerpt)"
              value={excerpt}
              onChange={setExcerpt}
              placeholder="Shown in search results and cards…"
              min={150}
              max={160}
              textarea
            />
            <Field label="Author (optional)">
              <input className={inp} value={author} onChange={(e) => setAuthor(e.target.value)} />
            </Field>
          </div>

          {/* Cover */}
          <div className="rounded-card border border-line bg-card p-4">
            <h3 className="eyebrow mb-2">Cover image</h3>
            {coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImage} alt="cover" className="mb-2 aspect-video w-full rounded-lg object-cover" />
            ) : (
              <div className="mb-2 grid aspect-video w-full place-items-center rounded-lg border border-dashed border-line-strong text-ink-soft">
                <ImagePlus className="h-6 w-6" />
              </div>
            )}
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer rounded-lg border border-line-strong px-3 py-2 text-center text-[12.5px] font-medium hover:border-accent">
                {coverUploading ? "Uploading…" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }} />
              </label>
              {coverImage && (
                <button onClick={() => setCoverImage("")} className="rounded-lg border border-line-strong px-3 py-2 text-[12.5px] text-ink-soft hover:text-accent">
                  Remove
                </button>
              )}
            </div>
            <input className={cn(inp, "mt-2")} value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="…or paste image URL" />
          </div>

          <KeywordEditor
            keywords={keywords}
            onChange={setKeywords}
            linkFirstOnly={linkFirstOnly}
            onToggleFirstOnly={setLinkFirstOnly}
          />

          <SeoPanel post={postLike} />
        </aside>
      </div>
    </div>
  );
}

const inp =
  "w-full rounded-lg border border-line-strong bg-ground px-3 py-2 text-[13.5px] outline-none focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-col gap-1.5">
      <label className="eyebrow">{label}</label>
      {children}
    </div>
  );
}

function CountField({
  label,
  value,
  onChange,
  placeholder,
  min,
  max,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min: number;
  max: number;
  textarea?: boolean;
}) {
  const len = value.length;
  const good = len >= min && len <= max;
  return (
    <div className="mb-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="eyebrow">{label}</label>
        <span className={cn("mono text-[10.5px]", good ? "text-verified" : "text-paid")}>
          {len} / {min}–{max}
        </span>
      </div>
      {textarea ? (
        <textarea rows={3} className={inp} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className={inp} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function StatusPill({ status, isNew }: { status: string; isNew: boolean }) {
  const label = isNew ? "new draft" : status;
  const published = status === "published" && !isNew;
  return (
    <span
      className={cn(
        "mono rounded-full px-2.5 py-1 text-[11px] font-semibold",
        published ? "bg-verified-wash text-verified" : "bg-paid-wash text-paid",
      )}
    >
      {label}
    </span>
  );
}
