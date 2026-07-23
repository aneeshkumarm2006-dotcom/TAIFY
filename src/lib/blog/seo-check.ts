import { parse } from "node-html-parser";
import type { Post } from "@/lib/types";

export type CheckStatus = "pass" | "warn";
export interface SeoCheck {
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface PostLike {
  metaTitle?: string;
  title?: string;
  excerpt?: string;
  body?: string;
  coverImage?: string;
  keywords?: Post["keywords"];
}

/** On-page SEO checks — no external APIs. Returns pass/warn per rule. */
export function runSeoChecks(post: PostLike): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const metaTitle = (post.metaTitle || post.title || "").trim();
  const excerpt = (post.excerpt || "").trim();
  const body = post.body || "";

  // Meta title length
  checks.push({
    label: "Meta title length",
    status: metaTitle.length >= 40 && metaTitle.length <= 60 ? "pass" : "warn",
    detail: `${metaTitle.length} chars (aim 50–60)`,
  });

  // Meta description length
  checks.push({
    label: "Meta description length",
    status: excerpt.length >= 120 && excerpt.length <= 160 ? "pass" : "warn",
    detail: `${excerpt.length} chars (aim 150–160)`,
  });

  // Word count
  const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  checks.push({
    label: "Content length",
    status: words >= 300 ? "pass" : "warn",
    detail: `${words} words${words < 300 ? " (thin — aim 300+)" : ""}`,
  });

  // Keyword presence in body
  const lowerBody = text.toLowerCase();
  const missing = (post.keywords || []).filter(
    (k) => k.keyword.trim() && !lowerBody.includes(k.keyword.trim().toLowerCase()),
  );
  checks.push({
    label: "Keywords in body",
    status: missing.length === 0 ? "pass" : "warn",
    detail:
      missing.length === 0
        ? `${(post.keywords || []).length} keyword(s) present`
        : `Missing: ${missing.map((m) => m.keyword).join(", ")}`,
  });

  // Links + images (parse once)
  let internal = 0;
  let external = 0;
  let imgsMissingAlt = 0;
  let imgCount = 0;
  try {
    const root = parse(body);
    for (const a of root.querySelectorAll("a")) {
      const href = a.getAttribute("href") || "";
      if (/^https?:\/\//i.test(href)) external += 1;
      else if (href) internal += 1;
    }
    for (const img of root.querySelectorAll("img")) {
      imgCount += 1;
      if (!(img.getAttribute("alt") || "").trim()) imgsMissingAlt += 1;
    }
  } catch {
    /* ignore parse errors */
  }

  checks.push({
    label: "Links",
    status: internal + external > 0 ? "pass" : "warn",
    detail: `${internal} internal · ${external} external`,
  });
  checks.push({
    label: "Image alt text",
    status: imgsMissingAlt === 0 ? "pass" : "warn",
    detail:
      imgCount === 0
        ? "no images"
        : imgsMissingAlt === 0
          ? "all images have alt"
          : `${imgsMissingAlt} of ${imgCount} missing alt`,
  });
  checks.push({
    label: "Cover image",
    status: post.coverImage?.trim() ? "pass" : "warn",
    detail: post.coverImage?.trim() ? "set" : "none set",
  });

  return checks;
}
