import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, X } from "lucide-react";
import { getTool, getRelated, toCardTools } from "@/lib/data";
import { TOOLS, CATEGORIES } from "@/data/tools";
import { ToolBackLink } from "@/components/tool-back-link";
import { ToolGallery } from "@/components/tool-gallery";
import { BrandLogo } from "@/components/brand-logo";
import { PricingBadge, VerifiedBadge } from "@/components/ui/badge";
import { SaveButton } from "@/components/save-button";
import { ButtonLink } from "@/components/ui/button";
import { ToolGrid } from "@/components/tool-rail";
import { compactNumber, embedUrl, timeAgo } from "@/lib/utils";
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  metaDescription,
  pickTitle,
} from "@/lib/site";
import type { Tool } from "@/lib/types";

export const revalidate = 300;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

/**
 * `<name> - <tagline> · TAIFY` runs past 70 characters for the wordier taglines
 * (Semrush flagged 8 tool pages), and past ~60 Google truncates it in the SERP.
 * Fall back through progressively shorter shapes until one fits.
 */
function toolTitle(tool: Pick<Tool, "name" | "tagline">): string {
  return pickTitle([
    `${tool.name} - ${tool.tagline.replace(/\.$/, "")} · ${SITE_NAME}`,
    `${tool.name} - ${tool.tagline.replace(/\.$/, "")}`,
    `${tool.name} Review: Pricing, Pros & Cons · ${SITE_NAME}`,
    `${tool.name} Review & Pricing · ${SITE_NAME}`,
    `${tool.name} · ${SITE_NAME}`,
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
    return { title: `Tool not found · ${SITE_NAME}`, robots: { index: false, follow: true } };
  }

  const title = toolTitle(tool);
  const description = metaDescription(
    tool.description ||
      `${tool.name} — ${tool.tagline} Real cost, strengths, watch-outs and alternatives.`,
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
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

/** SoftwareApplication + Breadcrumb for the tool. */
function buildToolSchema(tool: Tool, categoryName: string): object[] {
  const url = absoluteUrl(`/tool/${tool.slug}`);
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": `${url}#software`,
      name: tool.name,
      alternateName: tool.tagline,
      description: tool.description,
      url,
      sameAs: tool.url,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: categoryName,
      operatingSystem: "Web",
      ...(tool.logo ? { image: tool.logo } : {}),
      ...(tool.images?.length ? { screenshot: tool.images } : {}),
      author: { "@type": "Organization", name: tool.company },
      offers: {
        "@type": "Offer",
        price: tool.costPerMonth,
        priceCurrency: "USD",
        ...(tool.costPerMonth > 0
          ? { priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: tool.costPerMonth,
              priceCurrency: "USD",
              unitCode: "MON",
            } }
          : {}),
        availability: "https://schema.org/InStock",
        url: tool.url,
      },
      keywords: tool.tags.join(", "),
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Categories", item: absoluteUrl("/categories") },
        {
          "@type": "ListItem",
          position: 3,
          name: categoryName,
          item: absoluteUrl(`/category/${tool.category}`),
        },
        { "@type": "ListItem", position: 4, name: tool.name, item: url },
      ],
    },
  ];
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
  const schema = [
    ...buildToolSchema(tool, categoryName),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
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
              </div>
              <div className="mono mt-1 text-[12px] text-ink-soft">
                {tool.code} · {tool.category} · by {tool.company} ·{" "}
                {compactNumber(tool.saves)} saves
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
                {tool.name} is a {categoryName.toLowerCase()} tool from{" "}
                {tool.company}, launched {tool.launched.replace("·", " ")}. It is
                the right pick when {tool.bestFor.charAt(0).toLowerCase()}
                {tool.bestFor.slice(1).replace(/\.$/, "")}.{" "}
                {tool.pros[0] ? `Its strongest card is ${tool.pros[0].charAt(0).toLowerCase()}${tool.pros[0].slice(1).replace(/\.$/, "")}.` : ""}
              </p>
              <p>
                Budget for{" "}
                <b className="text-ink">
                  {tool.costPerMonth === 0
                    ? "nothing — it is genuinely free"
                    : `about $${tool.costPerMonth} a month`}
                </b>{" "}
                if you use it the way most people do.{" "}
                {tool.pricing === "free"
                  ? "There is no paid tier to upgrade into."
                  : tool.pricing === "freemium"
                    ? "There is a free tier that is workable for light use, so you can test it before paying."
                    : tool.pricing === "trial"
                      ? "There is a time-limited trial rather than a lasting free tier, so plan to decide before it expires."
                      : "There is no free tier, so the first month is the trial."}{" "}
                {tool.cons[0]
                  ? `The main thing to weigh against it: ${tool.cons[0].charAt(0).toLowerCase()}${tool.cons[0].slice(1).replace(/\.$/, "")}.`
                  : ""}
              </p>
              <p>
                We last verified this listing {timeAgo(tool.verifiedAt)} — pricing,
                features and the destination link were all checked then. If you
                want a second opinion before committing,{" "}
                <Link href={`/compare?a=${tool.slug}`} className="text-accent underline-offset-2 hover:underline">
                  compare {tool.name} against another tool
                </Link>{" "}
                or{" "}
                <Link href="/match" className="text-accent underline-offset-2 hover:underline">
                  describe your task
                </Link>{" "}
                and let AI Match narrow the field to three.
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
            <div className="mt-2 flex items-center justify-center">
              <SaveButton slug={tool.slug} saves={tool.saves} />
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="mono text-[12px] text-ink-soft">Last verified</span>
                <span className="font-medium text-verified">{timeAgo(tool.verifiedAt)}</span>
              </div>
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
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, "");
  const out: { q: string; a: string }[] = [];

  out.push({
    q: `How much does ${tool.name} cost?`,
    a:
      tool.costPerMonth === 0
        ? `${tool.name} is free for the way most people use it, so the realistic monthly cost is $0. Listing it here costs ${tool.listingCost.toLowerCase()}.`
        : `Typical use runs to about $${tool.costPerMonth} a month. That is the real cost of the plan most people end up on, not the cheapest advertised tier.`,
  });

  out.push({
    q: `Does ${tool.name} have a free tier?`,
    a:
      tool.pricing === "free"
        ? `Yes — ${tool.name} is free to use, with no paid tier to upgrade into.`
        : tool.pricing === "freemium"
          ? `Yes. ${tool.name} has a free tier that is workable for light use, so you can test it properly before paying for the ~$${tool.costPerMonth}/mo plan.`
          : tool.pricing === "trial"
            ? `Not a lasting one. ${tool.name} offers a time-limited trial rather than a permanent free tier, so plan to evaluate it inside that window.`
            : `No. ${tool.name} is paid-only, at roughly $${tool.costPerMonth} a month for typical use.`,
  });

  out.push({
    q: `What is ${tool.name} best for?`,
    a: `${tool.bestFor.replace(/\.$/, "")}. ${tool.description}`,
  });

  if (tool.cons.length) {
    out.push({
      q: `What are the downsides of ${tool.name}?`,
      a: `The watch-outs we list are: ${tool.cons.map(lower).join("; ")}. None of these are dealbreakers on their own, but they are the things people most often hit after signing up.`,
    });
  }

  if (alternatives.length) {
    out.push({
      q: `What are the best alternatives to ${tool.name}?`,
      a: `The closest ${categoryName.toLowerCase()} alternatives in our catalog are ${alternatives.slice(0, 3).join(", ")}. Each is listed with the same real-cost estimate so you can compare them on what they actually cost rather than sticker price.`,
    });
  }

  out.push({
    q: `Is the ${tool.name} listing up to date?`,
    a: `Yes — pricing, features and the destination link were last verified on ${tool.verifiedAt.slice(0, 10)}. Listings that go more than a week without a check lose their verified badge until they are re-confirmed.`,
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
