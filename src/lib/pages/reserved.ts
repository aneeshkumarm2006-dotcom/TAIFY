import { ROLE_PAGE_SLUGS } from "@/data/roles";

// Slugs owned by real routes — never usable as custom-page slugs.
//
// The /ai-for-* profession pages are included because they are served by the
// same root-level [slug] route that renders custom pages. Without them here, the
// admin would happily accept a page at "ai-for-doctors" that could never render:
// the role check in that route runs first and would always win.
export const RESERVED = new Set([
  "categories", "category", "browse", "match", "compare", "blog", "submit",
  "login", "admin", "seoteam", "tool", "api", "robots.txt", "sitemap.xml",
  "favicon.ico", "p", "pages",
  ...ROLE_PAGE_SLUGS,
]);
