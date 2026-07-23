import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { getPublishedPost, incrementViews } from "@/lib/blog/data";
import { getTool } from "@/lib/data";
import { applyBacklinks } from "@/lib/blog/backlinks";
import { addHeadingIds } from "@/lib/blog/toc";
import { readingTime } from "@/lib/utils";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { BrandLogo } from "@/components/brand-logo";
import { ReadingProgress, Toc, ShareButtons } from "@/components/blog/reading-aids";
import type { Tool } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Not found · TAIFY" };
  const url = absoluteUrl(`/blog/${post.slug}`);
  const images = post.coverImage ? [post.coverImage] : [];
  return {
    title: post.metaTitle || post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.metaTitle || post.title,
      description: post.excerpt,
      url,
      siteName: SITE_NAME,
      images,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle || post.title,
      description: post.excerpt,
      images,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  await incrementViews(slug);

  const linked = applyBacklinks(post.body, post.keywords, post.linkFirstOnly);
  const { html, toc } = addHeadingIds(linked);
  const url = absoluteUrl(`/blog/${post.slug}`);

  // Related tools = the tools this post links to internally.
  const relSlugs = Array.from(
    new Set(
      post.keywords
        .map((k) => k.url.match(/^\/tool\/([a-z0-9-]+)/i)?.[1])
        .filter(Boolean) as string[],
    ),
  ).slice(0, 4);
  const related = (await Promise.all(relSlugs.map((s) => getTool(s)))).filter(
    Boolean,
  ) as Tool[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": post.author ? "Person" : "Organization", name: post.author || SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <>
      <ReadingProgress />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <div className="mx-auto max-w-[1180px] px-6 py-10 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[210px_minmax(0,1fr)_250px]">
          {/* Left rail - TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <Toc items={toc} />
            </div>
          </aside>

          {/* Article */}
          <article className="min-w-0">
            <nav className="mono mb-5 flex items-center gap-1.5 text-[12px] text-ink-soft">
              <Link href="/" className="hover:text-accent">Home</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-accent">Blog</Link>
            </nav>

            <h1 className="text-balance text-[clamp(28px,4.4vw,42px)] font-extrabold leading-[1.08] tracking-[-0.035em]">
              {post.title}
            </h1>
            <div className="mono mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-soft">
              {post.publishedAt && <span>{post.publishedAt.slice(0, 10)}</span>}
              <span>·</span>
              <span>{readingTime(post.body)} min read</span>
              {post.author && (<><span>·</span><span>by {post.author}</span></>)}
            </div>

            {post.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.coverImage} alt={post.title} className="mt-6 aspect-video w-full rounded-card object-cover" />
            )}

            <div className="prose-taify mt-8" dangerouslySetInnerHTML={{ __html: html }} />

            {/* Mobile related + share */}
            <div className="mt-10 border-t border-line pt-6 lg:hidden">
              {related.length > 0 && <RelatedTools related={related} />}
              <div className="mt-6"><ShareButtons url={url} title={post.title} /></div>
            </div>

            <div className="mt-10 hidden border-t border-line pt-6 lg:flex lg:items-center lg:justify-between">
              <Link href="/blog" className="mono text-[13px] text-accent hover:opacity-70">
                ← more from the blog
              </Link>
              <ShareButtons url={url} title={post.title} />
            </div>
          </article>

          {/* Right rail - related tools + CTA */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 flex flex-col gap-5">
              {related.length > 0 && <RelatedTools related={related} />}

              <div className="rounded-card border border-accent/30 bg-accent-wash p-4">
                <Sparkles className="h-5 w-5 text-accent" />
                <p className="mt-2 text-[14px] font-bold leading-snug">
                  Not sure which tool fits?
                </p>
                <p className="mt-1 text-[12.5px] text-ink-soft">
                  Describe your task and get the best 3 with reasons.
                </p>
                <Link
                  href="/match"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-accent-ink"
                >
                  Find my AI <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function RelatedTools({ related }: { related: Tool[] }) {
  return (
    <div>
      <div className="eyebrow mb-3">Tools in this post</div>
      <div className="flex flex-col gap-2">
        {related.map((t) => (
          <Link
            key={t.slug}
            href={`/tool/${t.slug}`}
            className="flex items-center gap-3 rounded-card border border-line bg-card p-2.5 transition-colors hover:border-line-strong"
          >
            <BrandLogo name={t.name} mark={t.mark} color={t.color} logo={t.logo} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-semibold">{t.name}</div>
              <div className="mono truncate text-[10.5px] text-ink-soft">{t.tagline}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
