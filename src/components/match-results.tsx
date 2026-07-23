"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Tool } from "@/lib/types";
import { LogoTile } from "./logo-tile";
import { PricingBadge, VerifiedBadge } from "./ui/badge";
import { cn } from "@/lib/utils";

interface Pick {
  slug: string;
  reason: string;
  costNote: string;
}
interface MatchResponse {
  query: string;
  picks: Pick[];
  others: string[];
  usedAI: boolean;
}

export function MatchResults({
  query,
  tools,
}: {
  query: string;
  tools: Tool[];
}) {
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [data, setData] = useState<MatchResponse | null>(null);
  const bySlug = new Map(tools.map((t) => [t.slug, t]));

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setData(null);
    fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })
      .then((r) => r.json())
      .then((json: MatchResponse) => {
        if (cancelled) return;
        setData(json);
        setState("done");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div>
      {/* Echoed query */}
      <div className="mb-2 flex items-start gap-3 rounded-[12px] border border-dashed border-accent bg-card p-3.5">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <p className="text-[16px] font-semibold">
          <span className="text-ink-soft">I need to </span>
          {query}
        </p>
      </div>

      {state === "loading" && <Thinking />}

      {state === "error" && (
        <p className="mt-6 text-[14px] text-ink-soft">
          Something went wrong matching your task. Try rephrasing.
        </p>
      )}

      {state === "done" && data && (
        <>
          {!data.usedAI && (
            <p className="mono mt-4 text-[11.5px] text-ink-soft">
              (ranked by keyword match — add ANTHROPIC_API_KEY for AI reasoning)
            </p>
          )}

          <div className="mt-5 flex flex-col gap-3.5">
            {data.picks.map((p, i) => {
              const tool = bySlug.get(p.slug);
              if (!tool) return null;
              return (
                <MatchRow
                  key={p.slug}
                  tool={tool}
                  pick={p}
                  rank={i + 1}
                  hero={i === 0}
                />
              );
            })}
          </div>

          {data.others.length > 0 && (
            <div className="mt-8">
              <div className="mono mb-3 text-[12px] text-accent">
                + {data.others.length} more matches
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {data.others.map((slug) => {
                  const t = bySlug.get(slug);
                  if (!t) return null;
                  return (
                    <Link
                      key={slug}
                      href={`/tool/${t.slug}`}
                      className="flex items-center gap-3 rounded-card border border-line bg-card p-3 transition-colors hover:border-line-strong"
                    >
                      <LogoTile mark={t.mark} color={t.color} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-semibold">
                          {t.name}
                        </div>
                        <div className="mono truncate text-[11px] text-ink-soft">
                          {t.tagline}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Thinking() {
  return (
    <div className="mono mt-4 mb-5 flex items-center gap-2.5 text-[12px] text-accent">
      reading the catalog · matching on intent, price &amp; freshness
      <span className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-line">
        <span className="absolute inset-0 w-[62%] animate-[load_1.6s_ease-in-out_infinite_alternate] rounded-full bg-gradient-to-r from-accent to-accent-ink" />
      </span>
      <style>{`@keyframes load{from{width:38%}to{width:85%}}`}</style>
    </div>
  );
}

function MatchRow({
  tool,
  pick,
  rank,
  hero,
}: {
  tool: Tool;
  pick: Pick;
  rank: number;
  hero: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-card border bg-card p-4",
        hero
          ? "border-accent shadow-[0_0_0_3px_var(--accent-wash)]"
          : "border-line",
      )}
    >
      <span className="mono w-6 shrink-0 pt-1.5 text-center text-[15px] font-extrabold text-accent">
        {rank}
      </span>
      <LogoTile mark={tool.mark} color={tool.color} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/tool/${tool.slug}`}
            className="text-[16px] font-bold tracking-tight hover:text-accent"
          >
            {tool.name}
          </Link>
          <PricingBadge pricing={tool.pricing} />
          <VerifiedBadge verifiedAt={tool.verifiedAt} />
          <span className="mono text-[11.5px] text-ink-soft">
            {pick.costNote}
          </span>
        </div>
        <p className="mt-2 rounded-[9px] bg-accent-wash px-3 py-2.5 text-[13.5px] leading-relaxed text-ink">
          <b className="text-accent-ink">Why this fits you:</b> {pick.reason}
        </p>
      </div>
    </div>
  );
}
