import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCustomPage } from "@/lib/pages/data";
import { getTool } from "@/lib/data";
import { buildPageSchema } from "@/lib/pages/schema";
import { JsonLd } from "@/lib/schema/json-ld";
import { Blocks } from "@/components/pages/block-render";
import { PageIntro } from "@/components/pages/page-intro";
import { absoluteUrl, metaDescription, OG_IMAGE, OG_IMAGE_CARD, SITE_NAME, withBrand } from "@/lib/site";
import type { Tool } from "@/lib/types";
import { RESERVED } from "@/lib/pages/reserved";
import { roleByPageSlug } from "@/data/roles";
import { RolePageView, roleMetadata } from "./role-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // Profession pages (/ai-for-doctors and friends) are code, not admin content,
  // so they resolve before the database lookup. Their slugs are also in RESERVED,
  // which is what stops an admin page ever shadowing one.
  const role = roleByPageSlug(slug);
  if (role) return roleMetadata(role);
  if (RESERVED.has(slug)) return {};
  const page = await getCustomPage(slug);
  if (!page) {
    return { title: `Not found | ${SITE_NAME}`, robots: { index: false, follow: true } };
  }
  const title = page.metaTitle || withBrand(page.title);
  const description = page.excerpt || metaDescription(page.intro);
  const url = absoluteUrl(`/${slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: OG_IMAGE_CARD,
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}

export default async function CustomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const role = roleByPageSlug(slug);
  if (role) return <RolePageView role={role} />;
  if (RESERVED.has(slug)) notFound();
  const page = await getCustomPage(slug);
  if (!page) notFound();

  const extraSlugs = page.blocks.flatMap((b) => (b.type === "toollist" ? b.slugs : []));
  const extra = (await Promise.all(extraSlugs.map((s) => getTool(s)))).filter(Boolean) as Tool[];
  const toolMap: Record<string, Tool> = {};
  for (const t of extra) toolMap[t.slug] = t;

  const path = `/${slug}`;
  const graph = buildPageSchema({
    page,
    path,
    crumbs: [
      { name: "Home", url: absoluteUrl("/") },
      { name: page.title, url: absoluteUrl(path) },
    ],
  });

  return (
    <div className="mx-auto max-w-[820px] px-6 py-12">
      <JsonLd graph={graph} />
      <h1 className="text-balance text-[clamp(30px,5vw,46px)] font-extrabold tracking-[-0.04em]">
        {page.title}
      </h1>
      {page.intro && <PageIntro intro={page.intro} />}
      <Blocks blocks={page.blocks} toolMap={toolMap} />
    </div>
  );
}
