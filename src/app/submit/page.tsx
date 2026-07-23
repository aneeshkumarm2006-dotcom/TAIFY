import { Check } from "lucide-react";
import { SubmitForm } from "@/components/submit-form";

export const metadata = {
  title: "Submit a tool · TAIFY",
  description: "List your AI tool in the field guide.",
};

const PERKS = [
  "Free basic listing — verified & indexed for SEO",
  "Honest pricing shown, including a real cost-to-use estimate",
  "Appear in AI Match results when you fit the task",
  "Add screenshots and a demo video",
  "Promoted placement from $49 (optional)",
];

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <div className="eyebrow mb-3">For makers</div>
      <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-[-0.035em]">
        List your AI tool.
      </h1>
      <p className="mt-3 max-w-lg text-[16px] text-ink-soft">
        TAIFY is transparent about cost — for users <em>and</em> for you. Basic
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
    </div>
  );
}
