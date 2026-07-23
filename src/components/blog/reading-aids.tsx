"use client";

import { useEffect, useState } from "react";
import { Link2, Check } from "lucide-react";
import type { TocItem } from "@/lib/blog/toc";
import { cn } from "@/lib/utils";

/** Thin progress bar under the nav that fills as you scroll the article. */
export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? Math.min(1, h.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed left-0 right-0 top-[60px] z-40 h-[3px] bg-transparent">
      <div
        className="h-full origin-left bg-accent transition-[width] duration-100"
        style={{ width: `${p * 100}%` }}
      />
    </div>
  );
}

/** Sticky table of contents with active-section highlighting. */
export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (!items.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [items]);

  if (!items.length) return null;

  return (
    <nav aria-label="On this page">
      <div className="eyebrow mb-3">On this page</div>
      <ul className="flex flex-col gap-0.5 border-l border-line">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={cn(
                "-ml-px block border-l-2 py-1.5 text-[13px] transition-colors",
                i.level === 3 ? "pl-6" : "pl-3.5",
                active === i.id
                  ? "border-accent font-medium text-accent"
                  : "border-transparent text-ink-soft hover:text-ink",
              )}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Share row: X, LinkedIn, copy link. */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  return (
    <div className="flex items-center gap-2">
      <a
        href={`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mono rounded-lg border border-line-strong px-2.5 py-1.5 text-[12px] text-ink-soft transition-colors hover:border-accent hover:text-ink"
      >
        Share on X
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mono rounded-lg border border-line-strong px-2.5 py-1.5 text-[12px] text-ink-soft transition-colors hover:border-accent hover:text-ink"
      >
        LinkedIn
      </a>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="grid h-8 w-8 place-items-center rounded-lg border border-line-strong text-ink-soft transition-colors hover:border-accent hover:text-ink"
        title="Copy link"
      >
        {copied ? <Check className="h-4 w-4 text-verified" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
