import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { SubmitForm } from "@/components/submit-form";
import { OG_IMAGE, OG_IMAGE_CARD, SITE_NAME, absoluteUrl } from "@/lib/site";
import { breadcrumbNode, faqNode, webPageNode } from "@/lib/schema/nodes";
import { JsonLd } from "@/lib/schema/json-ld";

const TITLE = `Submit Your AI Tool - Free Listing · ${SITE_NAME}`;
const DESCRIPTION =
  "List your AI tool in the TAIFY field guide for free. Verified by a person, indexed, and shown in AI Match results. Honest pricing throughout, with optional promoted placement from $49.";

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
    images: OG_IMAGE_CARD,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
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
    a: "Nothing, and it stays nothing. A basic listing gets verified, indexed, and shown in AI Match and category pages like everything else. Promoted placement starts at $49 and always carries a label, so readers can tell which is which.",
  },
  {
    q: "What do you need from me?",
    a: "A name, a one-line tagline, a link, and a straight answer on price: what people really pay per month, not your cheapest tier. Screenshots and a demo video are optional. They also make a listing far more convincing, so send them if you have them.",
  },
  {
    q: "How long does review take?",
    a: "Every submission is read by a person rather than auto-published. We check the link works, the price matches your own pricing page, and the tool does what the tagline claims. If something doesn't line up we come back to you instead of publishing it wrong.",
  },
  {
    q: "Will you list the downsides of my tool?",
    a: "Yes. Every listing has a watch-outs section next to its strengths, and that's the whole reason readers trust the catalog enough to click anything. Saying plainly what a tool isn't for tends to send you better-qualified traffic, not less of it.",
  },
  {
    q: "What does 'verified' mean on a listing?",
    a: "A person opened your pricing page on the date shown and confirmed it still says what we say it says. Go a week without a re-check and the badge drops off until someone looks again. That's what keeps it worth anything.",
  },
  {
    q: "Can I update my listing later?",
    a: "Yes. Send the change and it goes in at the next verification pass. Flag price changes especially, since that figure is the one readers compare on.",
  },
];

export default function SubmitPage() {
  const graph = [
    webPageNode({ path: "/submit", name: TITLE, description: DESCRIPTION }),
    breadcrumbNode("/submit", [
      { name: "Home", url: absoluteUrl("/") },
      { name: "Submit a tool", url: absoluteUrl("/submit") },
    ]),
    faqNode("/submit", FAQS),
  ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <JsonLd graph={graph} />

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
          Submit your AI tool to TAIFY
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
          Have an AI tool that you want more people to discover? Submit your AI
          tool to TAIFY for a free basic listing. Every submission is reviewed by
          our team before it goes live, so users can find tools with clear
          descriptions, transparent pricing, and useful information.
        </p>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
          A basic listing is free and can appear in relevant AI tool categories
          and AI Match results. You can also include screenshots and a demo video
          to help potential users understand what your tool does and whether it is
          right for their needs.
        </p>

        <h2 className="mt-10 text-[20px] font-bold tracking-[-0.02em]">
          What happens after you submit?
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
          Once you submit your AI tool, our team reviews the listing to make sure
          the website works, the pricing information is accurate, and the tool
          matches the description provided. If everything checks out, your listing
          can be published in the TAIFY catalog.
        </p>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
          You can update your listing later when your tool, pricing, or other
          important information changes. We also verify pricing and listing
          information so users can make informed choices.
        </p>
      </section>

      <section className="mt-12">
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
          Want to see a finished listing first? Look through{" "}
          <Link href="/browse" className="text-accent underline-offset-2 hover:underline">
            the catalog
          </Link>
          , or go straight to{" "}
          <Link href="/categories" className="text-accent underline-offset-2 hover:underline">
            the category
          </Link>{" "}
          your tool would sit in.
        </p>
      </section>
    </div>
  );
}
