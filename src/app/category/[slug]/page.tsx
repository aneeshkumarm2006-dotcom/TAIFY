import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getCategoryPage } from "@/lib/pages/data";
import { filterTools, getTool, toCardTools } from "@/lib/data";
import { CATEGORIES } from "@/data/tools";
import { buildPageSchema } from "@/lib/pages/schema";
import { Blocks } from "@/components/pages/block-render";
import { MotionGrid } from "@/components/motion/motion-grid";
import { absoluteUrl, SITE_NAME, TITLE_MAX, withBrand } from "@/lib/site";
import type { Tool } from "@/lib/types";

export const revalidate = 300;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCategoryPage(slug);
  if (!page) {
    return { title: `Not found · ${SITE_NAME}`, robots: { index: false, follow: true } };
  }
  // Guard against an over-long title typed into the admin: anything past the
  // 70-character limit falls back to the generated short form rather than
  // shipping a title Google will truncate.
  const stored = page.metaTitle?.trim();
  const title =
    stored && stored.length <= TITLE_MAX ? stored : withBrand(page.title, TITLE_MAX);
  const url = absoluteUrl(`/category/${slug}`);
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
    },
    twitter: { card: "summary_large_image", title, description: page.excerpt },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getCategoryPage(slug);
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!page || !cat) notFound();

  const tools = await filterTools({ category: slug, sort: "most-saved" });

  // Tool map for any tool-list blocks.
  const extraSlugs = page.blocks.flatMap((b) => (b.type === "toollist" ? b.slugs : []));
  const extra = (await Promise.all(extraSlugs.map((s) => getTool(s)))).filter(Boolean) as Tool[];
  const toolMap: Record<string, Tool> = {};
  for (const t of [...tools, ...extra]) toolMap[t.slug] = t;

  const url = absoluteUrl(`/category/${slug}`);
  const schema = buildPageSchema({
    page,
    url,
    tools,
    crumbs: [
      { name: "Home", url: absoluteUrl("/") },
      { name: "Categories", url: absoluteUrl("/categories") },
      { name: cat.name, url },
    ],
  });

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-12 lg:px-10">
      {schema.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      <nav className="mono mb-5 flex items-center gap-1.5 text-[12px] text-ink-soft">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span>/</span>
        <Link href="/categories" className="hover:text-accent">Categories</Link>
      </nav>

      <h1 className="text-balance text-[clamp(30px,5vw,46px)] font-extrabold tracking-[-0.04em]">
        {page.title}
      </h1>
      {page.intro && (
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-soft">{page.intro}</p>
      )}

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
