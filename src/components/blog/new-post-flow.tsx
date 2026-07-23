"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { POST_TEMPLATES } from "@/lib/blog/templates";
import type { PostTemplate } from "@/lib/types";
import { PostEditor } from "./post-editor";

export function NewPostFlow() {
  const [picked, setPicked] = useState<PostTemplate | null>(null);

  if (picked) {
    const tpl = POST_TEMPLATES.find((t) => t.id === picked)!;
    return (
      <PostEditor
        isNew
        initial={{
          template: tpl.id,
          body: tpl.body,
          linkFirstOnly: true,
          keywords: [],
          status: "draft",
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-8 lg:px-10">
      <Link href="/seoteam" className="mono inline-flex items-center gap-1 text-[12px] text-ink-soft hover:text-accent">
        <ArrowLeft className="h-3.5 w-3.5" /> All posts
      </Link>
      <h1 className="mt-4 text-[26px] font-extrabold tracking-[-0.03em]">
        Pick a template
      </h1>
      <p className="mt-1 text-[14px] text-ink-soft">
        Each one pre-fills a proven SEO structure. You can edit everything after.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {POST_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setPicked(t.id)}
            className="rounded-card border border-line bg-card p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-card"
          >
            <div className="text-[15px] font-bold">{t.name}</div>
            <div className="mt-1 text-[13px] text-ink-soft">{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
