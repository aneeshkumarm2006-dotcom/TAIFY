import Link from "next/link";
import { Info, Lightbulb, TriangleAlert, ArrowRight } from "lucide-react";
import type { Block } from "@/lib/pages/types";
import type { Tool } from "@/lib/types";
import { ToolCard } from "@/components/tool-card";
import { FaqAccordion } from "./faq-accordion";
import { cn } from "@/lib/utils";

export function Blocks({
  blocks,
  toolMap,
}: {
  blocks: Block[];
  toolMap: Record<string, Tool>;
}) {
  if (!blocks.length) return null;
  return (
    <div className="mt-12 flex flex-col gap-10">
      {blocks.map((b) => (
        <BlockView key={b.id} block={b} toolMap={toolMap} />
      ))}
    </div>
  );
}

function BlockView({ block: b, toolMap }: { block: Block; toolMap: Record<string, Tool> }) {
  switch (b.type) {
    case "heading":
      return b.level === 3 ? (
        <h3 className="text-[20px] font-bold tracking-[-0.02em]">{b.text}</h3>
      ) : (
        <h2 className="text-[26px] font-extrabold tracking-[-0.025em]">{b.text}</h2>
      );

    case "richtext":
      return <div className="prose-taify" dangerouslySetInnerHTML={{ __html: b.html }} />;

    case "faq":
      return (
        <section>
          {b.heading && <h2 className="mb-4 text-[24px] font-extrabold tracking-[-0.025em]">{b.heading}</h2>}
          <FaqAccordion items={b.items.filter((it) => it.q.trim())} />
        </section>
      );

    case "guide":
      return (
        <section>
          {b.heading && <h2 className="mb-5 text-[24px] font-extrabold tracking-[-0.025em]">{b.heading}</h2>}
          <ol className="flex flex-col gap-4">
            {b.steps.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="mono grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <div className="text-[16px] font-bold">{s.title}</div>
                  {s.body && <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{s.body}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      );

    case "table":
      return (
        <section>
          {b.heading && <h2 className="mb-4 text-[24px] font-extrabold tracking-[-0.025em]">{b.heading}</h2>}
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  {b.columns.map((c, i) => (
                    <th key={i} className="border-b border-line px-3.5 py-3 text-left font-bold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border-b border-line px-3.5 py-3">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );

    case "callout": {
      const V = {
        info: { Icon: Info, cls: "border-accent/30 bg-accent-wash", ic: "text-accent-ink" },
        tip: { Icon: Lightbulb, cls: "border-verified/30 bg-verified-wash", ic: "text-verified" },
        warn: { Icon: TriangleAlert, cls: "border-paid/40 bg-paid-wash", ic: "text-paid" },
      }[b.variant];
      return (
        <div className={cn("flex gap-3 rounded-card border p-4", V.cls)}>
          <V.Icon className={cn("mt-0.5 h-5 w-5 shrink-0", V.ic)} />
          <div>
            {b.title && <div className="text-[14px] font-bold">{b.title}</div>}
            <p className="whitespace-pre-line text-[14px] leading-relaxed">{b.body}</p>
          </div>
        </div>
      );
    }

    case "cta":
      return (
        <div className="rounded-card border border-accent/30 bg-accent-wash p-6 text-center">
          <h3 className="text-[20px] font-extrabold tracking-[-0.02em]">{b.title}</h3>
          {b.body && <p className="mx-auto mt-1.5 max-w-md text-[14px] text-ink-soft">{b.body}</p>}
          <Link
            href={b.buttonHref || "/match"}
            className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-accent-ink"
          >
            {b.buttonLabel || "Get started"} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      );

    case "image":
      return b.url ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.url} alt={b.alt || ""} loading="lazy" className="w-full rounded-card border border-line" />
          {b.caption && <figcaption className="mono mt-2 text-center text-[12px] text-ink-soft">{b.caption}</figcaption>}
        </figure>
      ) : null;

    case "toollist": {
      const tools = b.slugs.map((s) => toolMap[s]).filter(Boolean);
      if (!tools.length) return null;
      return (
        <section>
          {b.heading && <h2 className="mb-4 text-[24px] font-extrabold tracking-[-0.025em]">{b.heading}</h2>}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <ToolCard key={t.slug} tool={t} className="h-full" />
            ))}
          </div>
        </section>
      );
    }
  }
}
