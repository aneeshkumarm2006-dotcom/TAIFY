import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, X } from "lucide-react";
import { getTool, getRelated, toCardTools } from "@/lib/data";
import { TOOLS, CATEGORIES } from "@/data/tools";
import { ToolBackLink } from "@/components/tool-back-link";
import { ToolGallery } from "@/components/tool-gallery";
import { BrandLogo } from "@/components/brand-logo";
import { AiDepthBadge, PricingBadge, VerifiedBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ToolGrid } from "@/components/tool-rail";
import { embedUrl, sameEntity, timeAgo } from "@/lib/utils";
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

/**
 * Lowercase the first letter and drop a trailing period, so a stored sentence
 * can be spliced mid-sentence. Must stay one string: rendering it as two
 * adjacent JSX expressions makes JSX insert a space and splits the word
 * ("s tudents and researchers").
 */
function lcFirst(s: string): string {
  return (s.charAt(0).toLowerCase() + s.slice(1)).replace(/\.$/, "");
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2024·03" reads as "March 2024" in prose, not "2024 03". */
function launchedLabel(v: string): string {
  const [year, month] = v.split(/[·./-]/);
  const name = MONTHS[Number(month) - 1];
  return name ? `in ${name} ${year}` : `in ${year}`;
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
  const category = CATEGORIES.find((c) => c.slug === tool.category);
  const categoryName = category?.name ?? tool.category;
  const faqs = buildFaqs(tool, categoryName, related.map((r) => r.name));
  // The sentence before this already covers the pricing model, so a watch-out
  // that only restates it ("no free tier") would read twice in a row.
  const catch_ =
    tool.cons.find((c) => !/free tier|no free|paid only|paid-only/i.test(c)) ??
    (tool.pricing === "paid" ? undefined : tool.cons[0]);
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
      { name: categoryName, url: absoluteUrl(`/category/${tool.category}`) },
      { name: tool.name, url: absoluteUrl(path) },
    ]),
    toolNode(tool, categoryName),
    faqNode(path, faqs),
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <JsonLd graph={graph} />
      <ToolBackLink
        categorySlug={category?.slug ?? tool.category}
        categoryName={categoryName}
      />

      <div className="mt-5 grid grid-cols-1 gap-8 md:grid-cols-[1fr_270px]">
        {/* Main */}
        <div>
          <div className="flex items-center gap-4">
            <BrandLogo name={tool.name} mark={tool.mark} color={tool.color} logo={tool.logo} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">
                  {tool.name}
                </h1>
                <VerifiedBadge verifiedAt={tool.verifiedAt} />
                <AiDepthBadge aiDepth={tool.aiDepth} />
              </div>
              <div className="mono mt-1 text-[12px] text-ink-soft">
                {tool.code} · {tool.category} · by {tool.company}
              </div>
            </div>
          </div>

          <div className="mt-7 max-w-[62ch] space-y-3.5 text-[14.5px] leading-relaxed text-ink">
            <p>{tool.description}</p>
            <p>
              <strong>Best for:</strong> {tool.bestFor}
            </p>
          </div>

          {/* Media: demo video + screenshots */}
          {(tool.video || (tool.images && tool.images.length > 0)) && (
            <div className="mt-8 space-y-4">
              {tool.video &&
                (embedUrl(tool.video) ? (
                  <iframe
                    src={embedUrl(tool.video)!}
                    title={`${tool.name} demo`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="aspect-video w-full rounded-card border border-line"
                  />
                ) : (
                  <video
                    src={tool.video}
                    controls
                    className="aspect-video w-full rounded-card border border-line"
                  />
                ))}
              {tool.images && tool.images.length > 0 && (
                <ToolGallery images={tool.images} name={tool.name} />
              )}
            </div>
          )}

          {/* Pros / cons */}
          <div className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <ProsCons title="Strengths" items={tool.pros} kind="pro" />
            <ProsCons title="Watch-outs" items={tool.cons} kind="con" />
          </div>

          {/* Honest pricing */}
          <div className="mt-8 rounded-card border border-line bg-card p-5">
            <h3 className="eyebrow mb-4">Honest pricing</h3>
            <dl className="flex flex-col">
              <Row k="Pricing model">
                <PricingBadge pricing={tool.pricing} />
              </Row>
              <Row k="Real cost, typical use">
                <span className="font-semibold text-accent-ink">
                  {tool.costPerMonth === 0
                    ? "$0 · free"
                    : `~$${tool.costPerMonth} / mo`}
                </span>
              </Row>
              <Row k="Cost to get listed here">
                <span className="font-semibold text-verified">
                  {tool.listingCost}
                </span>
              </Row>
              <Row k="Launched">
                <span className="mono text-[12px]">{tool.launched}</span>
              </Row>
            </dl>
          </div>

          {/* Verdict + FAQ — real answers built from the listing's own data.
              Gives thin template pages substantive, indexable copy. */}
          <section className="mt-10 border-t border-line pt-8">
            <h2 className="text-[19px] font-bold tracking-[-0.02em]">
              Is {tool.name} worth it?
            </h2>
            <div className="mt-4 max-w-[68ch] space-y-3.5 text-[14.5px] leading-relaxed text-ink-soft">
              <p>
                {/* bestFor is a noun phrase ("Working developers who want…"),
                    so it needs "built for", not "the right call when". */}
                {sameEntity(tool.name, tool.company)
                  ? `${tool.name} launched ${launchedLabel(tool.launched)}.`
                  : `${tool.name} comes from ${tool.company} and launched ${launchedLabel(tool.launched)}.`}
                {` It's built for ${lcFirst(tool.bestFor)}.`}
                {tool.pros[0] ? ` What it does best: ${lcFirst(tool.pros[0])}.` : ""}
              </p>
              <p>
                {tool.costPerMonth === 0 ? "Costs you " : "Budget "}
                <b className="text-ink">
                  {tool.costPerMonth === 0
                    ? "nothing"
                    : `about $${tool.costPerMonth} a month`}
                </b>
                {" if you use it like most people do. "}
                {tool.pricing === "free"
                  ? "There's no paid tier waiting behind it."
                  : tool.pricing === "freemium"
                    ? "The free tier is real, so you can try it on your own work first."
                    : tool.pricing === "trial"
                      ? "The free window is time-limited, so make your mind up before it closes."
                      : "No free tier, so month one is your trial."}
                {catch_ ? ` The catch: ${lcFirst(catch_)}.` : ""}
              </p>
              <p>
                {`We checked this listing ${timeAgo(tool.verifiedAt)}. Still weighing it up? `}
                <Link href={`/compare?a=${tool.slug}`} className="text-accent underline-offset-2 hover:underline">
                  Put {tool.name} head to head
                </Link>{" "}
                with something else, or{" "}
                <Link href="/match" className="text-accent underline-offset-2 hover:underline">
                  describe your task
                </Link>{" "}
                and let AI Match cut the field to three.
              </p>
            </div>

            <h2 className="mt-8 text-[19px] font-bold tracking-[-0.02em]">
              Common questions
            </h2>
            <dl className="mt-4 max-w-[68ch] space-y-4">
              {faqs.map((f) => (
                <div key={f.q}>
                  <dt className="text-[14.5px] font-semibold">{f.q}</dt>
                  <dd className="mt-1 text-[14.5px] leading-relaxed text-ink-soft">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-3.5 text-[15px] font-bold tracking-tight">
                {categoryName} alternatives to {tool.name}
              </h3>
              <ToolGrid tools={toCardTools(related)} />
            </div>
          )}
        </div>

        {/* Sticky aside */}
        <aside className="md:sticky md:top-20 md:self-start">
          <div className="rounded-card border border-line bg-card p-5 shadow-card">
            <div className="text-[26px] font-extrabold tracking-[-0.03em]">
              {tool.costPerMonth === 0 ? "$0" : `~$${tool.costPerMonth}`}
              <span className="mono ml-1 text-[12px] font-medium text-ink-soft">
                {tool.costPerMonth === 0 ? "free" : "/mo real"}
              </span>
            </div>
            <div className="mono mt-1 text-[12px] text-ink-soft">
              {tool.pricing === "paid" ? "no free tier" : "free tier available"}
            </div>

            <ButtonLink
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              className="mt-4 w-full"
            >
              Visit site <ArrowUpRight className="h-4 w-4" />
            </ButtonLink>

            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="mono text-[12px] text-ink-soft">Last verified</span>
                <span className="font-medium text-verified">{timeAgo(tool.verifiedAt)}</span>
              </div>
              {tool.aiDepth === "feature" && (
                <p className="text-[12.5px] leading-relaxed text-ink-soft">
                  {tool.name} isn&apos;t an AI-first product. It was a working{" "}
                  {categoryName.toLowerCase()} tool before AI, and the AI is a
                  layer on top - useful, but not the reason the product exists.
                </p>
              )}
              {tool.tags.length > 0 && (
                <div>
                  <div className="mono mb-2 text-[12px] text-ink-soft">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {tool.tags.map((t) => (
                      <span
                        key={t}
                        className="mono rounded-full bg-ground px-2 py-0.5 text-[11px] text-ink-soft"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * Questions answered straight from the listing's own fields. Everything here is
 * derived — nothing is invented — so the copy stays true as the catalog updates,
 * and it gives the page the substance a bare spec template lacks.
 */
function buildFaqs(
  tool: Tool,
  categoryName: string,
  alternatives: string[],
): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];

  out.push({
    q: `How much does ${tool.name} cost?`,
    a:
      tool.costPerMonth === 0
        ? `Nothing, for the way most people use it. There's no paid tier waiting behind the free one.`
        : `About $${tool.costPerMonth} a month in practice. That's the plan people actually land on, not the cheapest one on the pricing page.`,
  });

  out.push({
    q: `Does ${tool.name} have a free tier?`,
    a:
      tool.pricing === "free"
        ? `Yes, and there's nothing to upgrade into. ${tool.name} is free to use.`
        : tool.pricing === "freemium"
          ? `Yes, and it's a real one. You can do proper work on it before deciding whether the ~$${tool.costPerMonth}/mo plan earns its keep.`
          : tool.pricing === "trial"
            ? `Not a permanent one. You get a time-limited trial, so plan to make your mind up inside it.`
            : `No. ${tool.name} is paid-only, at roughly $${tool.costPerMonth} a month for normal use.`,
  });

  out.push({
    q: `What is ${tool.name} best for?`,
    a: `${tool.bestFor.replace(/\.$/, "")}. ${tool.description}`,
  });

  if (tool.cons.length) {
    out.push({
      q: `What are the downsides of ${tool.name}?`,
      a: `The ones we list: ${tool.cons.map(lcFirst).join("; ")}. None of them are dealbreakers by themselves. They're what people tend to run into a week or two after signing up.`,
    });
  }

  if (alternatives.length) {
    out.push({
      q: `What are the best alternatives to ${tool.name}?`,
      a: `Closest matches in the catalog: ${alternatives.slice(0, 3).join(", ")}. All priced the same way, so you can compare what they really cost rather than what they advertise.`,
    });
  }

  out.push({
    q: `Is the ${tool.name} listing up to date?`,
    a: `Last checked on ${tool.verifiedAt.slice(0, 10)}: price, features and the link out. Leave a listing longer than a week and it loses its verified badge until someone looks again.`,
  });

  return out;
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-line py-2.5 text-[13.5px] last:border-0">
      <dt className="mono text-[12px] text-ink-soft">{k}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function ProsCons({
  title,
  items,
  kind,
}: {
  title: string;
  items: string[];
  kind: "pro" | "con";
}) {
  return (
    <div className="rounded-card border border-line bg-card p-4">
      <h4 className="eyebrow mb-3">{title}</h4>
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2 text-[13.5px]">
            {kind === "pro" ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-verified" strokeWidth={2.5} />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-paid" strokeWidth={2.5} />
            )}
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
