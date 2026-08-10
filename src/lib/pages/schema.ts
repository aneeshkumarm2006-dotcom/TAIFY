import type { Page } from "./types";
import type { Tool } from "@/lib/types";
import { absoluteUrl } from "@/lib/site";

const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export interface Breadcrumb {
  name: string;
  url: string;
}

/**
 * Build all JSON-LD objects for a page: auto FAQPage / HowTo / CollectionPage,
 * a breadcrumb, and any manual custom schema the admin added.
 */
export function buildPageSchema({
  page,
  url,
  crumbs,
  tools,
}: {
  page: Page;
  url: string;
  crumbs: Breadcrumb[];
  tools?: Tool[];
}): object[] {
  const out: object[] = [];

  // Breadcrumb
  out.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  });

  // FAQPage (merge all FAQ blocks)
  const faqItems = page.blocks
    .filter((b) => b.type === "faq")
    .flatMap((b) => (b.type === "faq" ? b.items : []))
    .filter((it) => it.q.trim() && it.a.trim());
  if (faqItems.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((it) => ({
        "@type": "Question",
        name: it.q.trim(),
        acceptedAnswer: { "@type": "Answer", text: strip(it.a) },
      })),
    });
  }

  // HowTo (one per guide block)
  for (const b of page.blocks) {
    if (b.type !== "guide") continue;
    const steps = b.steps.filter((s) => s.title.trim() || s.body.trim());
    if (!steps.length) continue;
    out.push({
      "@context": "https://schema.org",
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

  // CollectionPage + ItemList for any page that lists tools — category pages and
  // the profession pages under /ai-for-*. Keyed off `tools` rather than
  // page.type: passing a tool list is what makes a page a collection, and roles
  // are stored as type "custom".
  if (tools?.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: page.title,
      description: page.excerpt,
      url,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: tools.slice(0, 20).map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          // Built from SITE_URL, not by splitting `url` on "/category/" — that
          // only worked for category pages and silently produced
          // /ai-for-doctors/tool/<slug> for anything else.
          url: absoluteUrl(`/tool/${t.slug}`),
          name: t.name,
        })),
      },
    });
  }

  // Manual custom JSON-LD (if valid)
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
