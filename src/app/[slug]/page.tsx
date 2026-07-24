import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCustomPage } from "@/lib/pages/data";
import { getTool } from "@/lib/data";
import { buildPageSchema } from "@/lib/pages/schema";
import { Blocks } from "@/components/pages/block-render";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { Tool } from "@/lib/types";
import { RESERVED } from "@/lib/pages/reserved";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED.has(slug)) return {};
  const page = await getCustomPage(slug);
  if (!page) return { title: `Not found · ${SITE_NAME}` };
  return {
    title: page.metaTitle || page.title,
    description: page.excerpt,
    alternates: { canonical: absoluteUrl(`/${slug}`) },
    openGraph: { title: page.metaTitle || page.title, description: page.excerpt, url: absoluteUrl(`/${slug}`), siteName: SITE_NAME },
  };
}

export default async function CustomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED.has(slug)) notFound();
  const page = await getCustomPage(slug);
  if (!page) notFound();

  const extraSlugs = page.blocks.flatMap((b) => (b.type === "toollist" ? b.slugs : []));
  const extra = (await Promise.all(extraSlugs.map((s) => getTool(s)))).filter(Boolean) as Tool[];
  const toolMap: Record<string, Tool> = {};
  for (const t of extra) toolMap[t.slug] = t;

  const url = absoluteUrl(`/${slug}`);
  const schema = buildPageSchema({
    page,
    url,
    crumbs: [
      { name: "Home", url: absoluteUrl("/") },
      { name: page.title, url },
    ],
  });

  return (
    <div className="mx-auto max-w-[820px] px-6 py-12">
      {schema.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <h1 className="text-balance text-[clamp(30px,5vw,46px)] font-extrabold tracking-[-0.04em]">
        {page.title}
      </h1>
      {page.intro && (
        <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">{page.intro}</p>
      )}
      <Blocks blocks={page.blocks} toolMap={toolMap} />
    </div>
  );
}
