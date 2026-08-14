import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact number formatting for counts: 14200 -> "14.2k". */
export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

/** URL-safe slug from a title: "Top 10 AI Tools!" -> "top-10-ai-tools". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Convert a YouTube/Vimeo watch URL to an embeddable URL (null if not video). */
export function embedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

/** Estimate reading time in minutes from HTML/text. */
export function readingTime(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * True when the maker's name is really the product name, so we don't write
 * "Leonardo AI comes from Leonardo". Compares with branding suffixes and
 * punctuation stripped off both sides.
 *
 * Also decides whether a tool's own URL can stand in for its brand's URL in
 * schema: when the two are one entity, chatgpt.com-style links describe both.
 * When they differ ("ChatGPT" by "OpenAI"), the tool URL is the product's, not
 * the company's, and we have no field holding the company's own site.
 */
export function sameEntity(name: string, company: string): boolean {
  const core = (s: string) =>
    s
      .toLowerCase()
      .replace(/\.(ai|new|com|io|co)\b/g, "")
      .replace(/\b(ai|inc|ltd|labs|llc|technologies|the)\b/g, "")
      .replace(/[^a-z0-9]/g, "");
  const a = core(name);
  const b = core(company);
  return a === b || (!!a && !!b && (a.startsWith(b) || b.startsWith(a)));
}

/** Relative "verified" label: a Date -> "2d ago". */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}
