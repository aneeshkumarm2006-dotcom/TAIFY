import type { Role } from "@/data/roles";
import type { Page } from "@/lib/pages/types";

/**
 * Turn a Role into the same `Page` shape category and custom pages use.
 *
 * Doing it this way means role pages get FAQPage schema, the shared block
 * renderer and the same metadata handling for free, rather than a second
 * parallel implementation. The curated tool sections are *not* blocks — a
 * `toollist` block cannot carry the per-tool "why this one for you" line that is
 * the entire point of a profession page — so the route renders those itself and
 * these blocks are what sits underneath.
 *
 * `type` is "custom" because a role is not an admin-editable category. The
 * CollectionPage/ItemList schema comes from passing tools to buildPageSchema,
 * not from the page type.
 */
export function buildRolePage(role: Role): Page {
  const now = new Date().toISOString();
  return {
    key: `role:${role.slug}`,
    type: "custom",
    slug: `ai-for-${role.slug}`,
    title: role.h1,
    metaTitle: role.metaTitle,
    excerpt: role.excerpt,
    intro: role.intro,
    blocks: [
      {
        id: "role-watch-out",
        type: "callout",
        variant: "warn",
        title: role.watchOut.title,
        body: role.watchOut.body,
      },
      {
        id: "role-guide",
        type: "richtext",
        html: role.guide,
      },
      {
        id: "role-faq",
        type: "faq",
        heading: `AI for ${role.lower}: common questions`,
        items: role.faq,
      },
      {
        id: "role-cta",
        type: "cta",
        title: `Not sure which of these fits your work?`,
        body: "Describe the job in one sentence. You get three matches back, with reasons and real prices.",
        buttonLabel: "Find my AI",
        buttonHref: "/match",
      },
    ],
    customSchema: "",
    status: "published",
    createdAt: now,
    updatedAt: now,
  };
}
