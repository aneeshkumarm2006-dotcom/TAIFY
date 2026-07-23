import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPost, incrementViews } from "@/lib/blog/data";
import { applyBacklinks } from "@/lib/blog/backlinks";
import { readingTime } from "@/lib/utils";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

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

  const html = applyBacklinks(post.body, post.keywords, post.linkFirstOnly);
  const url = absoluteUrl(`/blog/${post.slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": post.author ? "Person" : "Organization", name: post.author || SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
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
    <article className="mx-auto max-w-[760px] px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Breadcrumb */}
      <nav className="mono mb-6 flex items-center gap-1.5 text-[12px] text-ink-soft">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-accent">Blog</Link>
      </nav>

      <h1 className="text-balance text-[clamp(28px,5vw,44px)] font-extrabold leading-[1.08] tracking-[-0.035em]">
        {post.title}
      </h1>
      <div className="mono mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-soft">
        {post.publishedAt && <span>{post.publishedAt.slice(0, 10)}</span>}
        <span>·</span>
        <span>{readingTime(post.body)} min read</span>
        {post.author && (
          <>
            <span>·</span>
            <span>by {post.author}</span>
          </>
        )}
      </div>

      {post.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage}
          alt={post.title}
          className="mt-6 aspect-video w-full rounded-card object-cover"
        />
      )}

      <div
        className="prose-taify mt-8"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="mt-12 border-t border-line pt-6">
        <Link href="/blog" className="mono text-[13px] text-accent hover:opacity-70">
          ← more from the blog
        </Link>
      </div>
    </article>
  );
}
