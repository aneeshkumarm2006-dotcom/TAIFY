import { Check } from "lucide-react";

export const metadata = {
  title: "Submit a tool · TAIFY",
  description: "List your AI tool in the field guide.",
};

const PERKS = [
  "Free basic listing — verified & indexed for SEO",
  "Honest pricing shown, including a real cost-to-use estimate",
  "Appear in AI Match results when you fit the task",
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

      <form className="mt-10 flex flex-col gap-4 rounded-card border border-line bg-card p-6 shadow-card">
        <Field label="Tool name" placeholder="e.g. Rewrite Studio" />
        <Field label="Website" placeholder="https://…" type="url" />
        <Field label="One-line tagline" placeholder="What it does, in a sentence" />
        <div className="flex flex-col gap-1.5">
          <label className="eyebrow">What task does it solve?</label>
          <textarea
            rows={3}
            placeholder="Describe the job your tool is best at…"
            className="rounded-lg border border-line-strong bg-ground px-3 py-2 text-[14px] outline-none focus:border-accent"
          />
        </div>
        <button
          type="button"
          className="mt-1 cursor-pointer self-start rounded-[10px] bg-accent px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-accent-ink"
        >
          Submit for review
        </button>
        <p className="mono text-[11px] text-ink-soft">
          Form is a placeholder — wiring to Supabase comes with the maker
          dashboard.
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="eyebrow">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="rounded-lg border border-line-strong bg-ground px-3 py-2 text-[14px] outline-none focus:border-accent"
      />
    </div>
  );
}
