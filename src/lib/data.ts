import "server-only";
import { TOOLS, CATEGORIES, toolBySlug } from "@/data/tools";
import type { Category, Pricing, Tool } from "@/lib/types";
import { toolsCollection, isDbEnabled, docToTool } from "@/lib/db/mongo";

/**
 * Data-access layer. Uses MongoDB when MONGODB_URI is set; otherwise falls back
 * to the local seed catalog so the app runs with zero config. Pages never
 * change — only these functions decide where data comes from.
 */

export interface ToolFilters {
  category?: string;
  pricing?: Pricing[];
  verifiedOnly?: boolean;
  hasFreeTier?: boolean;
  query?: string;
  sort?: "relevance" | "trending" | "newest" | "most-saved";
}

// ---------- reads ----------

export async function getCategories(): Promise<Category[]> {
  return CATEGORIES;
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return CATEGORIES.find((c) => c.slug === slug);
}

export async function getTool(slug: string): Promise<Tool | undefined> {
  if (isDbEnabled) {
    const col = await toolsCollection();
    const doc = await col?.findOne({ slug });
    return doc ? docToTool(doc) : undefined;
  }
  return toolBySlug(slug);
}

export async function getFeatured(limit = 6): Promise<Tool[]> {
  const all = await allTools();
  return all.filter((t) => t.featured).slice(0, limit);
}

export async function getTrending(limit = 6): Promise<Tool[]> {
  const all = await allTools();
  return [...all].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export async function getMostSaved(limit = 6): Promise<Tool[]> {
  const all = await allTools();
  return [...all].sort((a, b) => b.saves - a.saves).slice(0, limit);
}

export async function getJustLaunched(limit = 6): Promise<Tool[]> {
  const all = await allTools();
  return [...all]
    .sort((a, b) => b.launched.localeCompare(a.launched))
    .slice(0, limit);
}

export async function getRelated(tool: Tool, limit = 3): Promise<Tool[]> {
  const all = await allTools();
  return all
    .filter((t) => t.slug !== tool.slug && t.category === tool.category)
    .slice(0, limit);
}

export async function countTools(): Promise<number> {
  if (isDbEnabled) {
    const col = await toolsCollection();
    if (col) return col.countDocuments();
  }
  return TOOLS.length;
}

export async function filterTools(filters: ToolFilters): Promise<Tool[]> {
  let out = await allTools();

  if (filters.category) out = out.filter((t) => t.category === filters.category);
  if (filters.pricing?.length)
    out = out.filter((t) => filters.pricing!.includes(t.pricing));
  if (filters.hasFreeTier)
    out = out.filter((t) => t.pricing === "free" || t.pricing === "freemium");
  if (filters.verifiedOnly)
    out = out.filter((t) => daysSince(t.verifiedAt) <= 7);

  const q = filters.query?.trim().toLowerCase();
  if (q) out = out.filter((t) => keywordMatch(t, q));

  switch (filters.sort) {
    case "newest":
      out.sort((a, b) => b.launched.localeCompare(a.launched));
      break;
    case "most-saved":
      out.sort((a, b) => b.saves - a.saves);
      break;
    case "trending":
      out.sort((a, b) => score(b) - score(a));
      break;
    default:
      if (q) out.sort((a, b) => relevance(b, q) - relevance(a, q));
  }
  return out;
}

/** Keyword-ranked search. Atlas Vector Search hooks in here once embeddings land. */
export async function searchTools(query: string, limit = 12): Promise<Tool[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await allTools();
  return all
    .filter((t) => keywordMatch(t, q))
    .sort((a, b) => relevance(b, q) - relevance(a, q))
    .slice(0, limit);
}

export async function categoryCounts(): Promise<Record<string, number>> {
  const all = await allTools();
  const counts: Record<string, number> = {};
  for (const t of all) counts[t.category] = (counts[t.category] ?? 0) + 1;
  return counts;
}

// ---------- source (DB or seed) ----------

async function allTools(): Promise<Tool[]> {
  if (isDbEnabled) {
    const col = await toolsCollection();
    if (col) {
      const docs = await col.find({}).toArray();
      if (docs.length) return docs.map(docToTool);
    }
  }
  return TOOLS;
}

// ---------- helpers ----------

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function score(t: Tool): number {
  const freshness = Math.max(0, 30 - daysSince(t.verifiedAt));
  return t.saves + freshness * 300;
}
function haystack(t: Tool): string {
  return [t.name, t.tagline, t.description, t.category, ...t.tags]
    .join(" ")
    .toLowerCase();
}
function keywordMatch(t: Tool, q: string): boolean {
  const hay = haystack(t);
  return q.split(/\s+/).some((w) => w.length > 1 && hay.includes(w));
}
function relevance(t: Tool, q: string): number {
  const hay = haystack(t);
  const name = t.name.toLowerCase();
  let s = 0;
  for (const w of q.split(/\s+/)) {
    if (w.length < 2) continue;
    if (name.includes(w)) s += 5;
    if (t.tags.some((tag) => tag.includes(w))) s += 3;
    if (hay.includes(w)) s += 1;
  }
  return s;
}
