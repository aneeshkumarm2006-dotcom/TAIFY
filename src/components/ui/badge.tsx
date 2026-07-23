import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import type { Pricing } from "@/lib/types";

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

export function VerifiedBadge({
  verifiedAt,
  className,
}: {
  verifiedAt: string | Date;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mono inline-flex items-center gap-[5px] rounded-[7px] border px-2 py-[3px] text-[11px] font-semibold text-verified",
        className,
      )}
      style={{ borderColor: "color-mix(in srgb, var(--verified) 34%, transparent)" }}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
      verified {timeAgo(verifiedAt)}
    </span>
  );
}
