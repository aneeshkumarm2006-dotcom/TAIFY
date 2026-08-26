import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getCategoryPage } from "@/lib/pages/data";
import { filterTools, getTool, toCardTools } from "@/lib/data";
import { getCategories, resolveCategorySlug } from "@/lib/categories/data";
import { buildPageSchema } from "@/lib/pages/schema";
import { JsonLd } from "@/lib/schema/json-ld";
import { Blocks } from "@/components/pages/block-render";
import { PageIntro } from "@/components/pages/page-intro";
import { MotionGrid } from "@/components/motion/motion-grid";
import { absoluteUrl, OG_IMAGE, OG_IMAGE_CARD, SITE_NAME, TITLE_MAX, withBrand } from "@/lib/site";
import type { Tool } from "@/lib/types";

export const revalidate = 300;

/**
 * Only *live* slugs are prerendered. A retired one isn't in this list, so with
 * `dynamicParams` at its default it falls through to an on-demand render, hits
 * resolveCategorySlug below, and 308s - no middleware and no redirects() entry.
 */
export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = await resolveCategorySlug(slug);
  // A moved slug gets its 308 from the page body; metadata just declines to
  // hand a crawler an indexable title for a URL that is about to redirect.
  if (r.kind !== "live") {
    return { title: `Not found | ${SITE_NAME}`, robots: { index: false, follow: true } };
  }
  const page = await getCategoryPage(r.category.id);
  if (!page) {
    return { title: `Not found | ${SITE_NAME}`, robots: { index: false, follow: true } };
  }
  // Guard against an over-long title typed into the admin: anything past the
  // 70-character limit falls back to the generated short form rather than
  // shipping a title Google will truncate.
  const stored = page.metaTitle?.trim();
  const title =
    stored && stored.length <= TITLE_MAX ? stored : withBrand(page.title, TITLE_MAX);
  const url = absoluteUrl(`/category/${r.category.slug}`);
  return {
    title,
    description: page.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description: page.excerpt,
      url,
      siteName: SITE_NAME,
      // Declaring `openGraph` here replaces the layout's copy outright, image
      // included, so the card has to be passed back in - without it every
      // category page shared with no preview image at all.
      images: OG_IMAGE_CARD,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.excerpt,
      images: [OG_IMAGE],
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = await resolveCategorySlug(slug);
  // `to` is always the current slug, so a category renamed twice still redirects
  // in a single hop from every URL it has ever had.
  if (r.kind === "moved") permanentRedirect(`/category/${r.to}`);
  if (r.kind === "none") notFound();

  const cat = r.category;
  const page = await getCategoryPage(cat.id);
  if (!page) notFound();

  // The id, not the URL segment: tool documents store the permanent value.
  const tools = await filterTools({ categoryId: cat.id, sort: "editors" });

  // Tool map for any tool-list blocks.
  const extraSlugs = page.blocks.flatMap((b) => (b.type === "toollist" ? b.slugs : []));
  const extra = (await Promise.all(extraSlugs.map((s) => getTool(s)))).filter(Boolean) as Tool[];
  const toolMap: Record<string, Tool> = {};
  for (const t of [...tools, ...extra]) toolMap[t.slug] = t;

  const path = `/category/${cat.slug}`;
  const graph = buildPageSchema({
    page,
    path,
    tools,
    crumbs: [
      { name: "Home", url: absoluteUrl("/") },
      { name: "Categories", url: absoluteUrl("/categories") },
      { name: cat.name, url: absoluteUrl(path) },
    ],
  });

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-12 lg:px-10">
      <JsonLd graph={graph} />

      <nav className="mono mb-5 flex items-center gap-1.5 text-[12px] text-ink-soft">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span>/</span>
        <Link href="/categories" className="hover:text-accent">Categories</Link>
      </nav>

      <h1 className="text-balance text-[clamp(30px,5vw,46px)] font-extrabold tracking-[-0.04em]">
        {page.title}
      </h1>
      {page.intro && <PageIntro intro={page.intro} className="max-w-2xl" />}

      {tools.length > 0 && (
        <div className="mt-8">
          <MotionGrid
            tools={toCardTools(tools)}
            columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            stagger={false}
          />
        </div>
      )}

      <Blocks blocks={page.blocks} toolMap={toolMap} />
    </div>
  );
}
