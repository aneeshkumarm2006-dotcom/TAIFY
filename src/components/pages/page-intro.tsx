import { cn } from "@/lib/utils";

/**
 * The intro copy under a page's H1.
 *
 * `Page.intro` is one string, but a category sometimes needs two paragraphs:
 * the standing line about how we price things, then a plain-English sentence
 * about what the category covers, which is the part search actually matches.
 * A blank line in the stored intro starts a new paragraph rather than running
 * both into one wall of text.
 */
export function PageIntro({
  intro,
  className,
}: {
  intro: string;
  className?: string;
}) {
  const paras = intro
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paras.length) return null;
  return (
    <>
      {paras.map((p, i) => (
        <p
          key={i}
          className={cn(
            "text-[17px] leading-relaxed text-ink-soft",
            i === 0 ? "mt-4" : "mt-3",
            className,
          )}
        >
          {p}
        </p>
      ))}
    </>
  );
}
