import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { SubmitForm } from "@/components/submit-form";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

const TITLE = `Submit Your AI Tool - Free Listing · ${SITE_NAME}`;
const DESCRIPTION =
  "List your AI tool in the TAIFY field guide for free. Verified, indexed for SEO, surfaced in AI Match results, with honest pricing shown and optional promoted placement from $49.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/submit") },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/submit"),
    siteName: SITE_NAME,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const PERKS = [
  "Free basic listing - verified & indexed for SEO",
  "Honest pricing shown, including a real cost-to-use estimate",
  "Appear in AI Match results when you fit the task",
  "Add screenshots and a demo video",
  "Promoted placement from $49 (optional)",
];

const FAQS = [
  {
    q: "How much does a listing cost?",
    a: "Nothing. A basic listing is free and stays free — it is verified, indexed, and eligible to appear in AI Match results and category pages like any other tool. Promoted placement starts at $49 and is always visibly labelled, so readers can tell the difference.",
  },
  {
    q: "What do you need from me?",
    a: "A name, a one-line tagline, a link, and an honest answer on pricing — specifically what the tool costs per month for the way most people actually use it, not the cheapest advertised tier. Screenshots and a demo video are optional but make a listing noticeably more convincing.",
  },
  {
    q: "How long does review take?",
    a: "Submissions are reviewed by hand rather than auto-published. We check the link resolves, the pricing claim matches the pricing page, and the tool does what the tagline says. Anything that fails those checks comes back to you rather than going live wrong.",
  },
  {
    q: "Will you list the downsides of my tool?",
    a: "Yes. Every listing carries a watch-outs section alongside its strengths, because that is the reason readers trust the catalog enough to click through. Being honest about what a tool is not for tends to bring better-qualified traffic, not less of it.",
  },
  {
    q: "What does 'verified' mean on a listing?",
    a: "It means a human confirmed the pricing, the feature list, and the destination URL on the date shown. Listings that go more than a week without a re-check lose the badge until they are confirmed again, so the freshness signal stays meaningful.",
  },
  {
    q: "Can I update my listing later?",
    a: "Yes — send the change and it is applied at the next verification pass. Pricing changes in particular are worth flagging, since the real-cost figure is the number readers compare on.",
  },
];

export default function SubmitPage() {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: TITLE,
      description: DESCRIPTION,
      url: absoluteUrl("/submit"),
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Submit a tool", item: absoluteUrl("/submit") },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <nav className="mono mb-5 flex items-center gap-1.5 text-[12px] text-ink-soft">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span>/</span>
        <span className="text-ink">Submit a tool</span>
      </nav>

      <div className="eyebrow mb-3">For makers</div>
      <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-[-0.035em]">
        List your AI tool.
      </h1>
      <p className="mt-3 max-w-lg text-[16px] text-ink-soft">
        TAIFY is transparent about cost - for users <em>and</em> for you. Basic
        listing is free; promotion is optional and clearly labeled.
      </p>

      <ul className="mt-8 flex flex-col gap-3">
        {PERKS.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-[14.5px]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-verified" strokeWidth={2.5} />
            {p}
          </li>
        ))}
      </ul>

      <SubmitForm />

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">
          Before you submit
        </h2>
        <dl className="mt-5 space-y-5">
          {FAQS.map((f) => (
            <div key={f.q}>
              <dt className="text-[15px] font-semibold">{f.q}</dt>
              <dd className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-[14.5px] leading-relaxed text-ink-soft">
          Want to see what a finished listing looks like first? Have a look at{" "}
          <Link href="/browse" className="text-accent underline-offset-2 hover:underline">
            the catalog
          </Link>{" "}
          or{" "}
          <Link href="/categories" className="text-accent underline-offset-2 hover:underline">
            pick the category
          </Link>{" "}
          your tool would sit in.
        </p>
      </section>
    </div>
  );
}
