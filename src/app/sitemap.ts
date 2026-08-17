import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getPublishedPosts } from "@/lib/blog/data";
import { getPublishedCustomSlugs } from "@/lib/pages/data";
import { filterTools, getCategories } from "@/lib/data";
import { ROLE_PAGE_SLUGS } from "@/data/roles";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // "/" not "": Next writes sitemap <loc> values verbatim, and Semrush string-
  // matches them against crawled URLs without normalising an empty path to "/".
  // Every internal link to the homepage is href="/", which resolves to
  // ".../"— so a bare-origin loc matched nothing, and the same one string was
  // reported twice: once as "orphaned sitemap pages", once as the homepage's
  // "In sitemap = 0".
  const staticRoutes: MetadataRoute.Sitemap = [
    "/",
    "/browse",
    "/categories",
    "/match",
    "/compare",
    "/blog",
    "/submit",
    "/contact",
  ].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: p === "/" ? 1 : 0.7,
  }));

  const [tools, categories, posts, customSlugs] = await Promise.all([
    filterTools({}),
    getCategories(),
    getPublishedPosts(),
    getPublishedCustomSlugs(),
  ]);

  const toolRoutes: MetadataRoute.Sitemap = tools.map((t) => ({
    url: `${SITE_URL}/tool/${t.slug}`,
    lastModified: new Date(t.verifiedAt),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Profession pages. Static content, but high-intent landing pages, so they
  // carry the same priority as categories rather than the custom-page default.
  const roleRoutes: MetadataRoute.Sitemap = ROLE_PAGE_SLUGS.map((s) => ({
    url: `${SITE_URL}/${s}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const customRoutes: MetadataRoute.Sitemap = customSlugs.map((s) => ({
    url: `${SITE_URL}/${s}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...toolRoutes,
    ...categoryRoutes,
    ...roleRoutes,
    ...customRoutes,
    ...postRoutes,
  ];
}
