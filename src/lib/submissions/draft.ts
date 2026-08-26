import { CATEGORIES } from "@/data/tools";
import type { Submission } from "@/lib/db/mongo";
import { buildToolDoc, faviconFor } from "@/lib/tools/create";
import type { Tool } from "@/lib/types";
import { slugify, urlHost } from "@/lib/utils";

/**
 * The listing an admin edits before a submission is published.
 *
 * Kept free of server-only imports so the review screen can run the same
 * readiness checks in the browser that the publish route runs on the server -
 * one definition of "ready", not two that drift.
 */

/** Seed a draft from what the submitter actually sent. */
export function draftFromSubmission(sub: Submission): Partial<Tool> {
  return {
    slug: slugify(sub.name),
    name: sub.name,
    tagline: sub.tagline,
    description: sub.description,
    category: CATEGORIES.some((c) => c.id === sub.category)
      ? sub.category
      : "productivity",
    images: sub.images ?? [],
    video: sub.video || undefined,
    url: sub.url,
    logo: faviconFor(sub.url),
    mark: sub.name.slice(0, 2),
    color: "#3a7ca5",
    company: "",
    tags: [],
    pricing: "freemium",
    aiDepth: "native",
    costPerMonth: 0,
    pros: [],
    cons: [],
    bestFor: "",
  };
}

/**
 * A complete Tool from an incomplete draft, so the preview renders even when
 * half the fields are still empty. The code is a fixed placeholder rather than
 * buildToolDoc's random one, which would otherwise change on every keystroke.
 */
export function previewTool(draft: Partial<Tool>): Tool {
  const slug = draft.slug || slugify(draft.name ?? "") || "preview";
  const doc = buildToolDoc(slug, {
    ...draft,
    name: draft.name || "Untitled tool",
    code: draft.code || "AI·NEW",
  });
  return { ...doc, verifiedAt: doc.verifiedAt.toISOString() };
}

/**
 * List fields are edited as text ("one per line", "comma separated") and stored
 * as arrays. Normalising in one place means the browser, the draft it saves and
 * the publish route all agree on what the admin typed.
 */
export function normalizeDraft(draft: Partial<Tool>): Partial<Tool> {
  const split = (v: unknown, sep: RegExp): string[] =>
    Array.isArray(v)
      ? v.map(String).map((s) => s.trim()).filter(Boolean)
      : typeof v === "string"
        ? v.split(sep).map((s) => s.trim()).filter(Boolean)
        : [];
  return {
    ...draft,
    tags: split(draft.tags, /,/),
    pros: split(draft.pros, /\n/),
    cons: split(draft.cons, /\n/),
    images: split(draft.images, /\n/),
    costPerMonth: Number(draft.costPerMonth) || 0,
  };
}

export interface DraftIssue {
  field: string;
  label: string;
  /** Blocking issues stop publish; the rest are worth knowing and overridable. */
  blocking: boolean;
}

/** Image hosts we control, and so can rely on to still resolve next year. */
function ownedHost(host: string): boolean {
  return (
    host.endsWith("public.blob.vercel-storage.com") ||
    host.endsWith("thereisanaiforyou.com")
  );
}

/**
 * Hosts next/image will load, mirroring `images.remotePatterns` in
 * next.config.ts.
 *
 * The logo is the one field rendered through next/image, and next/image throws
 * on an unconfigured host - which means a published listing with a self-hosted
 * favicon does not degrade, it returns a 500 for the whole tool page. Keep this
 * list in step with next.config.ts.
 */
function logoHostAllowed(host: string): boolean {
  return (
    host === "www.google.com" ||
    host === "picsum.photos" ||
    host === "images.unsplash.com" ||
    host === "cdn.pixabay.com" ||
    host.endsWith("public.blob.vercel-storage.com")
  );
}

/**
 * What is missing or suspect in a draft.
 *
 * The blocking set is deliberately the shape of a listing readers expect: an
 * approved submission used to publish with empty tags, no pros, no cons and no
 * "best for", which is visibly thinner than every hand-written entry beside it.
 */
export function checkDraft(draft: Partial<Tool>): DraftIssue[] {
  const out: DraftIssue[] = [];
  const block = (field: string, label: string) =>
    out.push({ field, label, blocking: true });
  const warn = (field: string, label: string) =>
    out.push({ field, label, blocking: false });

  const arr = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter(Boolean)
      : typeof v === "string"
        ? v.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
        : [];

  if (!draft.name?.trim()) block("name", "Name is empty");
  if (!draft.url?.trim()) block("url", "Website URL is empty");
  if (!draft.tagline?.trim()) block("tagline", "Tagline is empty");
  if (!draft.description?.trim()) block("description", "Description is empty");
  if (!CATEGORIES.some((c) => c.id === draft.category))
    block("category", "Pick a category");
  if (!draft.bestFor?.trim())
    block("bestFor", "\"Best for\" is empty - it carries the verdict section");

  const images = arr(draft.images);
  if (images.length === 0 && !draft.logo?.trim())
    block("images", "No screenshot and no logo - the listing would render bare");

  // Blocking, not a warning: next/image throws on an unconfigured host, so this
  // does not degrade to a missing image, it 500s the published tool page.
  const logoHost = urlHost(draft.logo ?? "");
  if (logoHost && !logoHostAllowed(logoHost))
    block(
      "logo",
      `Logo host ${logoHost} is not in next.config.ts - it would 500 the page. Use a Google favicon, or clear the field for a letter tile.`,
    );

  const tags = arr(draft.tags);
  if (tags.length < 3) warn("tags", `Only ${tags.length} tag(s) - aim for 3+`);

  const pros = arr(draft.pros);
  const cons = arr(draft.cons);
  if (pros.length < 2) warn("pros", `Only ${pros.length} strength(s) - aim for 3`);
  if (cons.length < 1)
    warn("cons", "No watch-outs - every listing has a watch-outs section");

  if (draft.pricing !== "free" && !Number(draft.costPerMonth))
    warn("costPerMonth", "Real $/mo is 0 on a tool that is not free");

  if (images.length === 0)
    warn("images", "No screenshot - the card and gallery fall back to the logo");

  const site = urlHost(draft.url ?? "");
  const foreign = images.filter((src) => {
    const host = urlHost(src);
    return host && host !== site && !ownedHost(host);
  });
  if (foreign.length)
    warn(
      "images",
      `${foreign.length} image(s) hot-linked from ${[...new Set(foreign.map(urlHost))].join(", ")} - upload a copy instead`,
    );

  return out;
}

/** True when nothing blocks publishing. */
export function canPublish(draft: Partial<Tool>): boolean {
  return !checkDraft(draft).some((i) => i.blocking);
}
