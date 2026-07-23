import type { KeywordLink } from "@/lib/types";

// Elements whose text must never be turned into a backlink.
const PROTECTED = new Set([
  "a", "h1", "h2", "h3", "h4", "h5", "h6", "code", "pre", "script", "style",
]);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function relAttr(rel: KeywordLink["rel"]): string {
  const parts = ["noopener"];
  if (rel === "nofollow") parts.push("nofollow");
  if (rel === "sponsored") parts.push("sponsored");
  return parts.join(" ");
}

/**
 * Turn occurrences of a keyword in the body into a link - case-insensitive,
 * word-boundary aware, never touching text already inside protected elements
 * (existing links, headings, code). `firstOnly` links just the first hit.
 */
function linkKeyword(html: string, kw: KeywordLink, firstOnly: boolean): string {
  const keyword = kw.keyword?.trim();
  const url = kw.url?.trim();
  if (!keyword || !url) return html;

  const re = new RegExp(`\\b(${escapeRe(keyword)})\\b`, firstOnly ? "i" : "gi");
  const anchor = (m: string) =>
    `<a href="${escapeAttr(url)}" target="_blank" rel="${relAttr(kw.rel)}" class="taify-backlink">${m}</a>`;

  const tokens = html.split(/(<[^>]+>)/);
  let skip = 0;
  let done = false;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;

    if (tok.startsWith("<")) {
      const m = /^<\/?([a-zA-Z0-9]+)/.exec(tok);
      const tag = m ? m[1].toLowerCase() : "";
      if (PROTECTED.has(tag)) {
        if (tok.startsWith("</")) skip = Math.max(0, skip - 1);
        else if (!tok.endsWith("/>")) skip += 1;
      }
      continue;
    }

    if (skip > 0 || done) continue;

    if (firstOnly) {
      if (re.test(tok)) {
        tokens[i] = tok.replace(re, (mm) => anchor(mm));
        done = true;
      }
    } else {
      tokens[i] = tok.replace(re, (mm) => anchor(mm));
    }
  }

  return tokens.join("");
}

/** Apply every keyword backlink to a post body. */
export function applyBacklinks(
  html: string,
  keywords: KeywordLink[],
  firstOnly = true,
): string {
  let out = html;
  for (const kw of keywords) out = linkKeyword(out, kw, firstOnly);
  return out;
}
