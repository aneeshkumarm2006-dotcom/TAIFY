import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";
import { getPublishedPost, getPublishedPosts, incrementViews } from "@/lib/blog/data";
import { getTool } from "@/lib/data";
import { applyBacklinks } from "@/lib/blog/backlinks";
import { addHeadingIds } from "@/lib/blog/toc";
import { readingTime } from "@/lib/utils";
import { OG_IMAGE, OG_IMAGE_CARD, SITE_NAME, SITE_URL, absoluteUrl, metaDescription, withBrand } from "@/lib/site";
import { BrandLogo } from "@/components/brand-logo";
import { ReadingProgress, Toc, ShareButtons } from "@/components/blog/reading-aids";
import type { Post, Tool } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * A post's <title> and description both fall back rather than going missing:
 *
 * - Title: `metaTitle` when the author set one, otherwise the headline with the
 *   brand appended. Without the suffix the <title> is character-for-character
 *   the H1, which Semrush flags as "duplicate content in h1 and title".
 * - Description: `excerpt` when present, otherwise the opening of the body —
 *   two published posts had shipped with no meta description at all.
 */
function postTitle(post: Pick<Post, "metaTitle" | "title">): string {
  const meta = post.metaTitle?.trim();
  // A metaTitle copied verbatim from the headline is the same problem as having
  // none — two published posts had exactly that — so brand those too.
  if (meta && meta !== post.title.trim()) return meta;
  return withBrand(post.title);
}

function postDescription(post: Pick<Post, "excerpt" | "body" | "title">): string {
  return (
    post.excerpt?.trim() ||
    metaDescription(post.body) ||
    `${post.title} — a TAIFY guide with real costs, strengths and watch-outs for every tool mentioned.`
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) {
    return { title: `Not found · ${SITE_NAME}`, robots: { index: false, follow: true } };
  }
  const url = absoluteUrl(`/blog/${post.slug}`);
  const images = post.coverImage ? [post.coverImage] : undefined;
  const title = postTitle(post);
  const description = postDescription(post);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: images ?? OG_IMAGE_CARD,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: post.author ? [post.author] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images ?? [OG_IMAGE],
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

  // Other posts, so each article carries more than the single inbound link from
  // /blog. Ring rotation, not a top-of-list slice: post i links to i+1, i+2,
  // i+3, wrapping around. Because the offsets are constant, every post both
  // emits and *receives* three links.
  //
  // The previous `.slice(0, 3)` pointed all 19 posts at the same three newest
  // ones, so 15 were left with a single internal link — it worked when the blog
  // had four posts and quietly stopped as soon as it grew.
  const allPosts = await getPublishedPosts();
  const idx = allPosts.findIndex((p) => p.slug === post.slug);
  const ring =
    idx === -1
      ? allPosts.filter((p) => p.slug !== post.slug)
      : [...allPosts.slice(idx + 1), ...allPosts.slice(0, idx)];
  const morePosts = ring.slice(0, 3);

  const description = postDescription(post);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    wordCount: post.body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length,
    author: { "@type": post.author ? "Person" : "Organization", name: post.author || SITE_NAME },
    publisher: { "@id": `${SITE_URL}/#organization` },
    isPartOf: { "@id": `${SITE_URL}/#website` },
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
              <Image
                src={post.coverImage}
                alt={`Cover image for ${post.title}`}
                width={1200}
                height={675}
                sizes="(max-width: 1024px) 100vw, 760px"
                priority
                className="mt-6 aspect-video w-full rounded-card object-cover"
              />
            )}

            <div className="prose-taify mt-8" dangerouslySetInnerHTML={{ __html: html }} />

            {morePosts.length > 0 && (
              <section className="mt-12 border-t border-line pt-8">
                <h2 className="text-[19px] font-bold tracking-[-0.02em]">
                  Keep reading
                </h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {morePosts.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/blog/${p.slug}`}
                        className="group flex flex-col rounded-card border border-line bg-card p-4 transition-colors hover:border-accent"
                      >
                        <span className="text-[15px] font-semibold group-hover:text-accent">
                          {p.title}
                        </span>
                        {p.excerpt && (
                          <span className="mt-1 line-clamp-2 text-[13.5px] text-ink-soft">
                            {p.excerpt}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[14px] text-ink-soft">
                  Or skip the reading:{" "}
                  <Link href="/browse" className="text-accent underline-offset-2 hover:underline">
                    browse every AI tool
                  </Link>
                  ,{" "}
                  <Link href="/categories" className="text-accent underline-offset-2 hover:underline">
                    pick a category
                  </Link>
                  , or{" "}
                  <Link href="/compare" className="text-accent underline-offset-2 hover:underline">
                    put two head to head
                  </Link>
                  .
                </p>
              </section>
            )}

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
