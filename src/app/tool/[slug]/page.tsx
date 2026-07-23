import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, X } from "lucide-react";
import { getTool, getRelated } from "@/lib/data";
import { TOOLS } from "@/data/tools";
import { BrandLogo } from "@/components/brand-logo";
import { PricingBadge, VerifiedBadge } from "@/components/ui/badge";
import { SaveButton } from "@/components/save-button";
import { ButtonLink } from "@/components/ui/button";
import { ToolGrid } from "@/components/tool-rail";
import { compactNumber } from "@/lib/utils";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getTool(slug);
  if (!tool) return { title: "Tool not found · TAIFY" };
  return {
    title: `${tool.name} — ${tool.tagline} · TAIFY`,
    description: tool.description,
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/browse"
        className="mono text-[12px] text-ink-soft transition-colors hover:text-accent"
      >
        ← all tools
      </Link>

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

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-3.5 text-[15px] font-bold tracking-tight">
                People also viewed
              </h3>
              <ToolGrid tools={related} />
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

            <div className="mt-4 flex flex-col border-t border-line pt-3">
              <Row k="last check">
                <span className="text-verified">
                  {tool.verifiedAt.slice(5)}
                </span>
              </Row>
              <Row k="tags">
                <span className="mono max-w-[140px] truncate text-right text-[11.5px] text-ink-soft">
                  {tool.tags.join(", ")}
                </span>
              </Row>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
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
