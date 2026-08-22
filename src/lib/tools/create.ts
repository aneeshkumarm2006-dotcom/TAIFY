import type { Collection } from "mongodb";
import { CATEGORIES } from "@/data/tools";
import type { ToolDoc } from "@/lib/db/mongo";
import type { Pricing, Tool } from "@/lib/types";
import { slugify, urlHost } from "@/lib/utils";

/**
 * Turning a partial listing into a publishable tool document.
 *
 * Both places that create a tool - the admin "Add tool" form and approving a
 * submission - used to build this object inline, and they had drifted: one
 * validated the category against CATEGORIES and the other did not, one honoured
 * a supplied `code` and the other always randomised it. Every default now lives
 * here, so an approved submission is the same shape as a hand-added listing.
 */

export const PRICINGS: Pricing[] = ["free", "freemium", "trial", "paid"];

/** Google's favicon service for a tool's own domain. */
export function faviconFor(url: string): string | undefined {
  const host = urlHost(url);
  return host ? `https://www.google.com/s2/favicons?domain=${host}&sz=128` : undefined;
}

/** "AI-4821" - the catalog id printed in mono on a listing. */
export function newToolCode(): string {
  return `AI·${1000 + Math.floor(Math.random() * 9000)}`;
}

/**
 * A slug that is free in `tools`, suffixing -2, -3 … on collision.
 *
 * Note this only guarantees the *slug* is free. Whether the tool itself is
 * already listed is a different question, answered by its URL - see
 * findToolByUrl.
 */
export async function uniqueSlug(
  col: Collection<ToolDoc>,
  base: string,
): Promise<string> {
  const root = slugify(base);
  if (!root) return root;
  if (!(await col.findOne({ slug: root }))) return root;
  let n = 2;
  while (await col.findOne({ slug: `${root}-${n}` })) n++;
  return `${root}-${n}`;
}

/**
 * The published tool whose website shares a host with `url`, or null.
 *
 * Compares parsed hosts rather than matching URL strings, so a trailing slash,
 * a utm parameter or a "www." cannot smuggle a second copy of a listing past
 * the check. Scans the catalog in memory on a two-field projection: a few
 * hundred short documents, and correctness here is worth more than an index.
 *
 * Verbixa was submitted while already live at /tool/verbixa. The old approve
 * path only looked for a slug collision, found none, and would have published
 * verbixa-2 pointing at the same site.
 */
export async function findToolByUrl(
  col: Collection<ToolDoc>,
  url: string,
): Promise<{ slug: string; name: string; url: string } | null> {
  const host = urlHost(url);
  if (!host) return null;
  const docs = await col
    .find({}, { projection: { slug: 1, name: 1, url: 1, _id: 0 } })
    .toArray();
  const hit = docs.find((d) => urlHost(String(d.url ?? "")) === host);
  return hit
    ? { slug: String(hit.slug), name: String(hit.name), url: String(hit.url) }
    : null;
}

/** Every field of a listing, with the defaults applied. `slug` must be free. */
export function buildToolDoc(slug: string, body: Partial<Tool>): ToolDoc {
  const name = (body.name ?? "").trim();
  const url = (body.url ?? "").trim();
  const category = CATEGORIES.some((c) => c.slug === body.category)
    ? (body.category as string)
    : "productivity";
  const pricing = PRICINGS.includes(body.pricing as Pricing)
    ? (body.pricing as Pricing)
    : "freemium";
  const now = new Date();

  return {
    slug,
    code: body.code?.trim() || newToolCode(),
    name,
    tagline: body.tagline?.trim() || "",
    description: body.description?.trim() || "",
    mark: (body.mark?.trim() || name.slice(0, 2)).slice(0, 2),
    color: body.color || "#3a7ca5",
    logo: body.logo?.trim() || faviconFor(url),
    images: Array.isArray(body.images) ? body.images.filter(Boolean) : [],
    video: body.video?.trim() || undefined,
    company: body.company?.trim() || "",
    category,
    tags: Array.isArray(body.tags) ? body.tags.filter(Boolean) : [],
    pricing,
    aiDepth: body.aiDepth === "feature" ? "feature" : "native",
    costPerMonth: Number(body.costPerMonth) || 0,
    billing: body.billing === "one-time" ? "one-time" : undefined,
    listingCost: body.listingCost || "Free · promoted from $49",
    verifiedAt: now,
    launched:
      body.launched ||
      `${now.getFullYear()}·${String(now.getMonth() + 1).padStart(2, "0")}`,
    url,
    featured: Boolean(body.featured),
    pros: Array.isArray(body.pros) ? body.pros.filter(Boolean) : [],
    cons: Array.isArray(body.cons) ? body.cons.filter(Boolean) : [],
    bestFor: body.bestFor?.trim() || "",
  };
}
