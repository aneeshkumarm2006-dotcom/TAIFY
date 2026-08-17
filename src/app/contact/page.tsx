import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { OG_IMAGE, OG_IMAGE_CARD, SITE_NAME, absoluteUrl } from "@/lib/site";
import { breadcrumbNode, faqNode, webPageNode } from "@/lib/schema/nodes";
import { JsonLd } from "@/lib/schema/json-ld";

const TITLE = `Contact Us | ${SITE_NAME}`;
const DESCRIPTION =
  "Get in touch with the TAIFY team. Corrections to a listing, pricing that has changed, partnership questions, or anything else about the field guide to AI tools.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/contact") },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/contact"),
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

const FAQS = [
  {
    q: "How quickly do you reply?",
    a: "A person reads every message. Most get an answer within a couple of working days. Corrections to a listing's pricing jump the queue, because a wrong price is the one error that costs a reader money.",
  },
  {
    q: "Something on a listing is wrong. Who do I tell?",
    a: "Use this form and name the tool. Pricing changes are the most common report and the most useful: send the link to your pricing page and it goes in at the next verification pass.",
  },
  {
    q: "I want my tool listed. Is this the right form?",
    a: "No, there's a dedicated one at /submit that asks for everything a listing needs. Use this form only if you have already submitted and want to follow up.",
  },
  {
    q: "Do you take paid placements?",
    a: "Yes, and every one carries a label so readers can tell which is which. Promoted placement starts at $49. Ask here and you get the real numbers, not a sales call.",
  },
];

export default function ContactPage() {
  const graph = [
    webPageNode({
      path: "/contact",
      name: TITLE,
      description: DESCRIPTION,
      type: "ContactPage",
    }),
    breadcrumbNode("/contact", [
      { name: "Home", url: absoluteUrl("/") },
      { name: "Contact", url: absoluteUrl("/contact") },
    ]),
    faqNode("/contact", FAQS),
  ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <JsonLd graph={graph} />

      <nav className="mono mb-5 flex items-center gap-1.5 text-[12px] text-ink-soft">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span>/</span>
        <span className="text-ink">Contact</span>
      </nav>

      <div className="eyebrow mb-3">Get in touch</div>
      <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-[-0.035em]">
        Contact us.
      </h1>
      <p className="mt-3 max-w-lg text-[16px] text-ink-soft">
        Spotted a price that has moved, a link that has died, or a tool we have
        described wrong? Tell us and it gets fixed. Everything else - partnerships,
        promoted placement, press - lands in the same inbox.
      </p>

      <ContactForm />

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">
          What to send us
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
          The most valuable message we get is a correction. TAIFY only works if
          the prices are right, so if a tool has changed its plans, moved a
          feature behind a higher tier, or dropped its free option, that is worth
          telling us about. Include a link to the pricing page and it goes in at
          the next verification pass.
        </p>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
          Want your tool in the catalog? Use{" "}
          <Link href="/submit" className="text-accent underline-offset-2 hover:underline">
            the submission form
          </Link>{" "}
          instead - it asks for everything a listing needs, so nothing has to go
          back and forth over email.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">
          Common questions
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
      </section>
    </div>
  );
}
