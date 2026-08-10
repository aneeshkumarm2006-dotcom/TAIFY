import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import type { AiDepth, Pricing } from "@/lib/types";

const PRICING_LABEL: Record<Pricing, string> = {
  free: "FREE",
  freemium: "FREEMIUM",
  trial: "FREE TRIAL",
  paid: "PAID",
};

export function PricingBadge({
  pricing,
  className,
}: {
  pricing: Pricing;
  className?: string;
}) {
  const styles: Record<Pricing, string> = {
    free: "text-verified bg-verified-wash",
    freemium: "text-accent-ink bg-accent-wash",
    trial: "text-paid bg-paid-wash",
    paid: "text-paid bg-paid-wash",
  };
  return (
    <span
      className={cn(
        "mono inline-flex items-center rounded-[7px] px-2 py-[3px] text-[11px] font-semibold",
        styles[pricing],
        className,
      )}
    >
      {PRICING_LABEL[pricing]}
    </span>
  );
}

/**
 * Says whether AI is the whole product or a feature on top of it.
 *
 * Only rendered for `feature` — a badge on all 191 tools would be noise, and
 * "AI-native" is the unmarked default a visitor already assumes on an AI
 * directory. The label is the exception, so it carries information.
 */
export function AiDepthBadge({
  aiDepth,
  className,
}: {
  aiDepth: AiDepth;
  className?: string;
}) {
  if (aiDepth === "native") return null;
  return (
    <span
      className={cn(
        "mono inline-flex items-center rounded-[7px] border border-line-strong px-2 py-[3px] text-[11px] font-semibold text-ink-soft",
        className,
      )}
      title="Established software with AI features added - not an AI-first product"
    >
      AI FEATURE
    </span>
  );
}

export function VerifiedBadge({
  verifiedAt,
  className,
}: {
  verifiedAt: string | Date;
  className?: string;
}) {
  return (
    <span
      // border-verified-soft is a CSS class, not an inline style: this badge
      // renders once per tool card, so the 73-byte inline `style` shipped ~203
      // times on /browse (≈15 KB of markup carrying no text) and fed straight
      // into Semrush's "low text to HTML ratio" on every listing page.
      className={cn(
        "mono border-verified-soft inline-flex items-center gap-[5px] rounded-[7px] border px-2 py-[3px] text-[11px] font-semibold text-verified",
        className,
      )}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
      verified {timeAgo(verifiedAt)}
    </span>
  );
}
