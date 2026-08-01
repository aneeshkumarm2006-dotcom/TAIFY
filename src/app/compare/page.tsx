import Link from "next/link";
import { Check } from "lucide-react";
import { getTool } from "@/lib/data";
import { TOOLS } from "@/data/tools";
import type { Tool } from "@/lib/types";
import { ComparePicker } from "@/components/compare-picker";
import { PricingBadge } from "@/components/ui/badge";
import { compactNumber, cn } from "@/lib/utils";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import type { Metadata } from "next";

const TITLE = `Compare AI Tools Side by Side · ${SITE_NAME}`;
const DESCRIPTION =
  "Put any two AI tools head to head on real monthly cost, free tier, strengths and freshness, and get a verdict that names one instead of hedging.";

/**
 * Comparison URLs are ?a=&b= permutations of one page. Each pairing gets its own
 * title and description, and every variant canonicalises to /compare so the
 * combinatorial URL space can't fragment into duplicate-title pages.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const [a, b] = await Promise.all([
    sp.a ? getTool(sp.a) : Promise.resolve(undefined),
    sp.b ? getTool(sp.b) : Promise.resolve(undefined),
  ]);

  const title =
    a && b ? `${a.name} vs ${b.name}: Which Should You Use? · ${SITE_NAME}` : TITLE;
  const description =
    a && b
      ? `${a.name} vs ${b.name} on real monthly cost, free tier, strengths and freshness, with a verdict on which one fits your budget and your job.`
      : DESCRIPTION;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/compare") },
    openGraph: { type: "website", title, description, url: absoluteUrl("/compare"), siteName: SITE_NAME },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const sp = await searchParams;
  const options = TOOLS.map((t) => ({ slug: t.slug, name: t.name }));
  const a = sp.a ? await getTool(sp.a) : undefined;
  const b = sp.b ? await getTool(sp.b) : undefined;

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: a && b ? `${a.name} vs ${b.name}` : TITLE,
      description: DESCRIPTION,
      url: absoluteUrl("/compare"),
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Compare", item: absoluteUrl("/compare") },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <nav className="mono mb-4 flex items-center gap-1.5 text-[12px] text-ink-soft">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span>/</span>
        <span className="text-ink">Compare</span>
      </nav>

      <div className="mb-6">
        <div className="eyebrow mb-2">Compare · A vs B, decided</div>
        <h1 className="mb-3 text-[clamp(24px,3.4vw,34px)] font-extrabold tracking-[-0.03em]">
          Head-to-head
        </h1>
        <p className="mb-5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          Pick two and they go on the same six rows: pricing, real monthly cost,
          free tier, biggest strength, last verified, saves. The better cell in
          each row gets highlighted. Underneath, a verdict that names one and
          tells you what it would take to justify the other.
        </p>
        <ComparePicker options={options} a={sp.a} b={sp.b} />
      </div>

      {a && b ? (
        <Comparison a={a} b={b} />
      ) : (
        <div className="rounded-card border border-line bg-card p-10 text-center">
          <p className="text-[15px] font-semibold">Pick two tools to compare.</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Every pairing generates a shareable comparison with a verdict.
          </p>
        </div>
      )}

      <section className="mt-14 border-t border-line pt-10">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">
          How the verdict gets decided
        </h2>
        <div className="mt-4 space-y-4 text-[14.5px] leading-relaxed text-ink-soft">
          <p>
            Cost carries the most weight, because it&apos;s the row people get
            wrong. We use the plan you&apos;ll realistically end up on, divided
            down to a month if it bills annually. A tool that&apos;s technically
            free but useless below the $20 tier gets compared at $20.
          </p>
          <p>
            A real free tier breaks close calls. Being able to try something on
            your own work before paying is worth more than a marginal feature win.
            Trials sit in their own bucket: handy, but you&apos;re on a clock.
          </p>
          <p>
            Then the verified date. Pricing here changes month to month, and a
            comparison built on last year&apos;s numbers is worse than no
            comparison at all.
          </p>
          <p>
            Not sure which two to line up?{" "}
            <Link href="/match" className="text-accent underline-offset-2 hover:underline">
              Describe the job
            </Link>{" "}
            and AI Match will shortlist three, or{" "}
            <Link href="/browse" className="text-accent underline-offset-2 hover:underline">
              browse the catalog
            </Link>{" "}
            by category and price.
          </p>
        </div>
      </section>
    </div>
  );
}

function Comparison({ a, b }: { a: Tool; b: Tool }) {
  const rows = buildRows(a, b);
  const verdict = buildVerdict(a, b);

  return (
    <div className="mt-6">
      <h2 className="mb-4 text-[20px] font-bold tracking-[-0.02em]">
        <Link href={`/tool/${a.slug}`} className="hover:text-accent">
          {a.name}
        </Link>{" "}
        <span className="font-medium text-ink-soft">vs</span>{" "}
        <Link href={`/tool/${b.slug}`} className="hover:text-accent">
          {b.name}
        </Link>
      </h2>

      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th className="mono border-b border-line px-3.5 py-3 text-left text-[11.5px] uppercase tracking-wider text-ink-soft"></th>
              <th className="border-b border-line px-3.5 py-3 text-left font-bold">
                {a.name}
              </th>
              <th className="border-b border-line px-3.5 py-3 text-left font-bold">
                {b.name}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="mono border-b border-line px-3.5 py-3 text-[11.5px] uppercase tracking-wide text-ink-soft">
                  {r.label}
                </td>
                <td className={cn("border-b border-line px-3.5 py-3", r.aWins && "font-bold text-verified")}>
                  {r.a}
                </td>
                <td className={cn("border-b border-line px-3.5 py-3", r.bWins && "font-bold text-verified")}>
                  {r.b}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-[12px] border bg-accent-wash p-4" style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)" }}>
        <div className="mono mb-1.5 text-[11px] uppercase tracking-widest text-accent-ink">
          TAIFY verdict
        </div>
        <p className="text-[14px] leading-relaxed">{verdict}</p>
      </div>
    </div>
  );
}

interface Row {
  label: string;
  a: React.ReactNode;
  b: React.ReactNode;
  aWins?: boolean;
  bWins?: boolean;
}

function buildRows(a: Tool, b: Tool): Row[] {
  const cost = (t: Tool) => (t.costPerMonth === 0 ? "$0" : `~$${t.costPerMonth}`);
  const freeTier = (t: Tool) => t.pricing === "free" || t.pricing === "freemium";
  return [
    { label: "Pricing", a: <PricingBadge pricing={a.pricing} />, b: <PricingBadge pricing={b.pricing} /> },
    {
      label: "Real cost / mo",
      a: cost(a),
      b: cost(b),
      aWins: a.costPerMonth < b.costPerMonth,
      bWins: b.costPerMonth < a.costPerMonth,
    },
    {
      label: "Free tier",
      a: freeTier(a) ? yes() : "No",
      b: freeTier(b) ? yes() : "No",
      aWins: freeTier(a) && !freeTier(b),
      bWins: freeTier(b) && !freeTier(a),
    },
    { label: "Best strength", a: a.pros[0] ?? "-", b: b.pros[0] ?? "-" },
    {
      label: "Verified",
      a: a.verifiedAt.slice(5),
      b: b.verifiedAt.slice(5),
      aWins: a.verifiedAt > b.verifiedAt,
      bWins: b.verifiedAt > a.verifiedAt,
    },
    {
      label: "Saves",
      a: <span className="tnum">{compactNumber(a.saves)}</span>,
      b: <span className="tnum">{compactNumber(b.saves)}</span>,
      aWins: a.saves > b.saves,
      bWins: b.saves > a.saves,
    },
  ];
}

function yes() {
  return (
    <span className="inline-flex items-center gap-1">
      <Check className="h-3.5 w-3.5 text-verified" strokeWidth={3} /> Yes
    </span>
  );
}

function buildVerdict(a: Tool, b: Tool): string {
  const cheaper = a.costPerMonth <= b.costPerMonth ? a : b;
  const pricier = cheaper === a ? b : a;
  const cheaperFree = cheaper.pricing === "free" || cheaper.pricing === "freemium";
  return `Pick ${cheaper.name} if budget matters - it's ${cheaper.costPerMonth === 0 ? "free" : `cheaper at ~$${cheaper.costPerMonth}/mo`}${cheaperFree ? " with a real free tier" : ""}, and it's strong at ${cheaper.pros[0]?.toLowerCase() ?? "the core job"}. Choose ${pricier.name} only if you specifically need ${pricier.pros[0]?.toLowerCase() ?? "its edge"} and can justify the higher cost.`;
}
