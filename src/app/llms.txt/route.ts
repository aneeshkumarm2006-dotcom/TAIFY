import { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, SITE_URL, absoluteUrl } from "@/lib/site";
import { filterTools, getCategories, categoryCounts } from "@/lib/data";
import { getPublishedPosts } from "@/lib/blog/data";

// /llms.txt — the llmstxt.org convention. Generated from the live catalog so it
// never drifts from the site. The Semrush audit (2026-08-01) flagged this as
// missing; AI answer engines use it to find the pages worth reading.
export const dynamic = "force-dynamic";

function section(title: string, lines: string[]): string {
  return lines.length ? `## ${title}\n\n${lines.join("\n")}\n` : "";
}

export async function GET(): Promise<Response> {
  const [tools, categories, counts, posts] = await Promise.all([
    filterTools({ sort: "most-saved" }),
    getCategories(),
    categoryCounts(),
    getPublishedPosts(),
  ]);

  const body = [
    `# ${SITE_NAME} — ${SITE_TAGLINE}`,
    "",
    `> ${SITE_DESCRIPTION} ${SITE_NAME} lists ${tools.length} AI tools across ${categories.length} categories, each with a real cost-to-use estimate, strengths, watch-outs, and a last-verified date.`,
    "",
    "Every tool page states the actual monthly cost of typical use rather than the headline sticker price, and says plainly what the tool is bad at. Listings are free; promoted placement is labelled as such.",
    "",
    section("Key pages", [
      `- [Home](${absoluteUrl("/")}): search the catalog and see trending, newly launched, and most-saved tools.`,
      `- [Browse all tools](${absoluteUrl("/browse")}): the full catalog with filters for category, pricing, free tier, and verification.`,
      `- [Categories](${absoluteUrl("/categories")}): all ${categories.length} task categories.`,
      `- [AI Match](${absoluteUrl("/match")}): describe a task in one sentence and get the three best-fitting tools with reasoning.`,
      `- [Compare](${absoluteUrl("/compare")}): side-by-side comparison of any two tools with a plain-English verdict.`,
      `- [Blog](${absoluteUrl("/blog")}): guides and comparisons on choosing AI tools.`,
      `- [Submit a tool](${absoluteUrl("/submit")}): free listing for makers.`,
    ]),
    section(
      "Categories",
      categories.map(
        (c) =>
          `- [${c.name}](${absoluteUrl(`/category/${c.slug}`)}): best ${c.name.toLowerCase()} AI tools (${counts[c.slug] ?? 0} listed).`,
      ),
    ),
    section(
      "Tools",
      tools.map(
        (t) =>
          `- [${t.name}](${absoluteUrl(`/tool/${t.slug}`)}): ${t.tagline} ${t.pricing}, ~$${t.costPerMonth}/mo real cost.`,
      ),
    ),
    section(
      "Articles",
      posts.map((p) => `- [${p.title}](${absoluteUrl(`/blog/${p.slug}`)}): ${p.excerpt}`),
    ),
    section("Optional", [
      `- [Sitemap](${SITE_URL}/sitemap.xml): every indexable URL.`,
    ]),
  ]
    .filter(Boolean)
    .join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
