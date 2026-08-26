import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTool, getRelated, getCategoryById } from "@/lib/data";
import { TOOLS } from "@/data/tools";
import { ToolDetail, buildFaqs } from "@/components/tool-detail";
import {
  OG_IMAGE,
  OG_IMAGE_CARD,
  SITE_NAME,
  absoluteUrl,
  metaDescription,
  pickTitle,
} from "@/lib/site";
import { breadcrumbNode, faqNode, toolNode, webPageNode } from "@/lib/schema/nodes";
import { ref, toolId } from "@/lib/schema/ids";
import { JsonLd } from "@/lib/schema/json-ld";
import type { Tool } from "@/lib/types";

export const revalidate = 300;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

/**
 * `<name> - <tagline> | TAIFY` runs past 70 characters for the wordier taglines
 * (Semrush flagged 8 tool pages), and past ~60 Google truncates it in the SERP.
 * Fall back through progressively shorter shapes until one fits.
 */
function toolTitle(tool: Pick<Tool, "name" | "tagline">): string {
  return pickTitle([
    `${tool.name} - ${tool.tagline.replace(/\.$/, "")} | ${SITE_NAME}`,
    `${tool.name} - ${tool.tagline.replace(/\.$/, "")}`,
    `${tool.name} Review: Pricing, Pros & Cons | ${SITE_NAME}`,
    `${tool.name} Review & Pricing | ${SITE_NAME}`,
    `${tool.name} | ${SITE_NAME}`,
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getTool(slug);
  if (!tool) {
    return { title: `Tool not found | ${SITE_NAME}`, robots: { index: false, follow: true } };
  }

  const title = toolTitle(tool);
  const description = metaDescription(
    tool.description ||
      `${tool.name}: ${tool.tagline} What it really costs a month, what it's good at, what it's not, and what to use instead.`,
  );
  const url = absoluteUrl(`/tool/${tool.slug}`);
  const images = tool.images?.length ? [tool.images[0]] : undefined;

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
      // Falls back to the site card: a tool with no screenshot was shipping no
      // og:image at all, because declaring `openGraph` here drops the layout's.
      images: images ?? OG_IMAGE_CARD,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images ?? [OG_IMAGE],
    },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = await getTool(slug);
  if (!tool) notFound();

  const related = await getRelated(tool, 3);
  const category = await getCategoryById(tool.category);
  const categoryName = category?.name ?? tool.category;
  const categoryPath = `/category/${category?.slug ?? tool.category}`;
  const faqs = buildFaqs(tool, categoryName, related.map((r) => r.name));
  const path = `/tool/${tool.slug}`;
  const shot = tool.images?.[0];
  const graph = [
    // `dateModified` belongs here rather than on the Product: it is a
    // CreativeWork property, and validator.schema.org returns UNKNOWN_FIELD for
    // it on Product. It reports the same date the page prints under "We checked
    // this listing", so it is a real freshness signal rather than a bumped one.
    webPageNode({
      path,
      name: `${tool.name} review, pricing and alternatives`,
      description: tool.description,
      dateModified: tool.verifiedAt,
      primaryImage: shot ? (shot.startsWith("http") ? shot : absoluteUrl(shot)) : undefined,
      mainEntity: ref(toolId(tool.slug)),
    }),
    breadcrumbNode(path, [
      { name: "Home", url: absoluteUrl("/") },
      { name: "Categories", url: absoluteUrl("/categories") },
      { name: categoryName, url: absoluteUrl(categoryPath) },
      { name: tool.name, url: absoluteUrl(path) },
    ]),
    toolNode(tool, categoryName),
    faqNode(path, faqs),
  ];

  return (
    <ToolDetail
      tool={tool}
      category={category}
      related={related}
      faqs={faqs}
      jsonLd={<JsonLd graph={graph} />}
    />
  );
}
