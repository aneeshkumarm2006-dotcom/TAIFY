import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/blog/data";
import { readingTime } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Blog · ${SITE_NAME}`,
  description:
    "Guides, comparisons, and news on AI tools - how to pick the right one for any task.",
};

export const dynamic = "force-dynamic";

export default async function BlogIndex() {
  const posts = await getPublishedPosts();

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 lg:px-10">
      <div className="mb-10">
        <div className="eyebrow mb-2">The TAIFY blog</div>
        <h1 className="text-[clamp(30px,5vw,48px)] font-extrabold tracking-[-0.04em]">
          Guides &amp; comparisons
        </h1>
        <p className="mt-3 max-w-xl text-[16px] text-ink-soft">
          Deep dives on AI tools - how to choose, compare, and get the most from them.
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.coverImage}
                    alt={p.title}
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
