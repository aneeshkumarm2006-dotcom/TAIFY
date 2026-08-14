import { SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * Stable `@id` values for every node the site emits.
 *
 * These strings are each entity's permanent identity: Google and the AI crawlers
 * use them to tell "the ChatGPT listing I saw last week" from a new thing, so a
 * changed `@id` reads as a deletion plus a creation. Never rewrite one to tidy
 * it up. The three that were already live before this module existed —
 * `#organization`, `#website` and the tool `#product` — are reproduced here
 * character for character for exactly that reason.
 *
 * They are also what lets a page emit one node once and point at it from three
 * others, which is the pattern Google documents for pages carrying more than one
 * kind of thing. Note that this only works *within* a page: Google gives no
 * assurance it resolves an `@id` defined on a different URL, which is why the
 * Organization node is repeated in every page's <head> rather than referenced
 * from the homepage.
 */

export const orgId = () => `${SITE_URL}/#organization`;
export const websiteId = () => `${SITE_URL}/#website`;

export const webPageId = (path: string) => `${absoluteUrl(path)}#webpage`;
export const breadcrumbId = (path: string) => `${absoluteUrl(path)}#breadcrumb`;
export const faqId = (path: string) => `${absoluteUrl(path)}#faq`;

export const toolId = (slug: string) => `${absoluteUrl(`/tool/${slug}`)}#product`;
export const postId = (slug: string) => `${absoluteUrl(`/blog/${slug}`)}#post`;

/** A named list on a page, e.g. listId("/categories", "professions"). */
export const listId = (path: string, key: string) => `${absoluteUrl(path)}#${key}`;

/** A reference to a node defined elsewhere in the same @graph. */
export const ref = (id: string): { "@id": string } => ({ "@id": id });
