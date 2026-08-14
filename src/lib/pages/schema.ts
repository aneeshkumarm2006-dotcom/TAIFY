import type { Page } from "./types";
import type { Tool } from "@/lib/types";
import {
  breadcrumbNode,
  faqNode,
  itemListNode,
  toolListEntry,
  webPageNode,
  type Crumb,
} from "@/lib/schema/nodes";
import { listId, ref } from "@/lib/schema/ids";

const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export type { Crumb as Breadcrumb };

/**
 * Every JSON-LD node for a block-built page: the page itself, its breadcrumb,
 * auto FAQPage / HowTo, a tool list where the page has one, and any manual schema
 * an editor pasted into the admin.
 *
 * Returned as a flat array for `<JsonLd graph={…}>`, so the nodes land in one
 * `@graph` and can reference each other. They previously carried no `@id`, no
 * `isPartOf` and no breadcrumb link, which left every category and profession
 * page describing itself in isolation while the homepage and /browse were wired
 * into the site graph.
 */
export function buildPageSchema({
  page,
  path,
  crumbs,
  tools,
}: {
  page: Page;
  /** Site-relative path, e.g. "/category/coding" — the node ids are built off it. */
  path: string;
  crumbs: Crumb[];
  tools?: Tool[];
}): object[] {
  const out: object[] = [];

  const faqItems = page.blocks
    .filter((b) => b.type === "faq")
    .flatMap((b) => (b.type === "faq" ? b.items : []))
    .filter((it) => it.q.trim() && it.a.trim());

  // A page listing tools is a CollectionPage; anything else is a plain WebPage.
  // Keyed off `tools` rather than page.type on purpose: passing a tool list is
  // what makes a page a collection, and the profession pages are stored as
  // type "custom".
  const hasList = Boolean(tools?.length);
  out.push(
    webPageNode({
      path,
      name: page.title,
      description: page.excerpt,
      type: hasList ? "CollectionPage" : "WebPage",
      ...(hasList ? { mainEntity: ref(listId(path, "tools")) } : {}),
    }),
  );

  out.push(breadcrumbNode(path, crumbs));

  if (faqItems.length) out.push(faqNode(path, faqItems));

  // HowTo, one per guide block.
  for (const b of page.blocks) {
    if (b.type !== "guide") continue;
    const steps = b.steps.filter((s) => s.title.trim() || s.body.trim());
    if (!steps.length) continue;
    out.push({
      "@type": "HowTo",
      name: b.heading?.trim() || page.title,
      step: steps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.title.trim() || `Step ${i + 1}`,
        text: strip(s.body) || s.title.trim(),
      })),
    });
  }

  if (tools?.length) {
    out.push(
      itemListNode({
        path,
        key: "tools",
        name: page.title,
        entries: tools.map(toolListEntry),
      }),
    );
  }

  // Manual JSON-LD from the admin. Kept last so an editor can add a node the
  // generated set doesn't cover; a `@context` on it is harmless inside a graph.
  if (page.customSchema?.trim()) {
    try {
      const parsed = JSON.parse(page.customSchema);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      /* ignore invalid custom schema */
    }
  }

  return out;
}
