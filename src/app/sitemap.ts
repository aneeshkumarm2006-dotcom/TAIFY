import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getPublishedPosts } from "@/lib/blog/data";
import { getPublishedCustomSlugs } from "@/lib/pages/data";
import { filterTools, getCategories } from "@/lib/data";
import { ROLE_PAGE_SLUGS } from "@/data/roles";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/browse",
    "/categories",
    "/match",
    "/compare",
    "/blog",
    "/submit",
  ].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: p === "" ? 1 : 0.7,
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
