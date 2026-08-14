import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/blog/data";
import { readingTime } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";
import { OG_IMAGE, OG_IMAGE_CARD, SITE_NAME, absoluteUrl } from "@/lib/site";
import { breadcrumbNode, postStub } from "@/lib/schema/nodes";
import { orgId, ref, websiteId } from "@/lib/schema/ids";
import { JsonLd } from "@/lib/schema/json-ld";

const TITLE = `AI Tool Guides &amp; Comparisons · ${SITE_NAME}`.replace("&amp;", "&");
const DESCRIPTION =
  "Guides and comparisons on AI tools: how to pick one for the job, what it really costs once the free tier runs out, and where it falls over.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/blog") },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/blog"),
    siteName: SITE_NAME,
    images: OG_IMAGE_CARD,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export const dynamic = "force-dynamic";

export default async function BlogIndex() {
  const posts = await getPublishedPosts();

  const graph = [
    {
      "@type": "Blog",
      "@id": `${absoluteUrl("/blog")}#blog`,
      name: `${SITE_NAME} blog`,
      description: DESCRIPTION,
      url: absoluteUrl("/blog"),
      isPartOf: ref(websiteId()),
      publisher: ref(orgId()),
      inLanguage: "en",
      // Each stub carries the same @id its article page mints, so a post listed
      // here and read there is one entity rather than two.
      blogPost: posts.map(postStub),
    },
    breadcrumbNode("/blog", [
      { name: "Home", url: absoluteUrl("/") },
      { name: "Blog", url: absoluteUrl("/blog") },
    ]),
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 lg:px-10">
      <JsonLd graph={graph} />

      <nav className="mono mb-5 flex items-center gap-1.5 text-[12px] text-ink-soft">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span>/</span>
        <span className="text-ink">Blog</span>
      </nav>

      <div className="mb-10">
        <div className="eyebrow mb-2">The TAIFY blog</div>
        <h1 className="text-[clamp(30px,5vw,48px)] font-extrabold tracking-[-0.04em]">
          Guides &amp; comparisons
        </h1>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
          How to choose between AI tools, what they cost once the free tier runs
          out, and where each one falls over. Every tool we mention links back to
          its listing in{" "}
          <Link href="/browse" className="text-accent underline-offset-2 hover:underline">
            the catalog
          </Link>
          , priced the same way as everything else.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-card border border-line bg-card p-12 text-center">
          <p className="text-[15px] font-semibold">No posts yet.</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <Reveal key={p.slug} delay={Math.min(i * 0.05, 0.3)}>
              <Link
                href={`/blog/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-lg"
              >
                {p.coverImage ? (
                  <Image
                    src={p.coverImage}
                    alt={`Cover image for ${p.title}`}
                    width={640}
                    height={360}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                    priority={i === 0}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="aspect-video w-full bg-accent-wash" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="mono mb-2 text-[11px] text-ink-soft">
                    {p.publishedAt?.slice(0, 10)} · {readingTime(p.body)} min read
                  </div>
                  <h2 className="text-[17px] font-bold leading-snug tracking-tight group-hover:text-accent">
                    {p.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-[13.5px] text-ink-soft">
                    {p.excerpt}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
