"use client";

import { Check, AlertTriangle } from "lucide-react";
import { runSeoChecks, type PostLike } from "@/lib/blog/seo-check";
import { cn } from "@/lib/utils";

export function SeoPanel({ post }: { post: PostLike }) {
  const checks = runSeoChecks(post);
  const passing = checks.filter((c) => c.status === "pass").length;

  return (
    <div className="rounded-card border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="eyebrow">SEO checks</h3>
        <span className="mono text-[11px] text-ink-soft">
          {passing}/{checks.length} ready
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2 text-[13px]">
            {c.status === "pass" ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-verified" strokeWidth={2.5} />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-paid" strokeWidth={2.2} />
            )}
            <span>
              <span className="font-medium">{c.label}</span>
              <span className={cn("ml-1", c.status === "warn" ? "text-paid" : "text-ink-soft")}>
                — {c.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
