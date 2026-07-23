import { parse } from "node-html-parser";
import { slugify } from "@/lib/utils";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Add stable ids to h2/h3 headings and return the table of contents. */
export function addHeadingIds(html: string): { html: string; toc: TocItem[] } {
  const root = parse(html);
  const toc: TocItem[] = [];
  const used = new Set<string>();

  for (const h of root.querySelectorAll("h2, h3")) {
    const text = h.text.trim();
    if (!text) continue;
    let id = slugify(text) || "section";
    let n = 2;
    while (used.has(id)) id = `${slugify(text)}-${n++}`;
    used.add(id);
    h.setAttribute("id", id);
    toc.push({ id, text, level: h.tagName === "H3" ? 3 : 2 });
  }

  return { html: root.toString(), toc };
}
