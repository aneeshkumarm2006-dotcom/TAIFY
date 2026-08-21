import { NextResponse } from "next/server";
import type { Tool } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export interface LinkResult {
  kind: "site" | "logo" | "image" | "video";
  url: string;
  status: number;
  ok: boolean;
  note?: string;
}

/**
 * Fetch everything the draft points at and report what actually answers.
 *
 * Two failures this exists to catch. Google's favicon service returns HTTP 404
 * for a domain it cannot resolve with a generic globe in the body, so a dead
 * logo looks fine in a browser and renders as a broken image once Vercel's
 * optimiser refuses the non-2xx upstream (see the note in src/data/tools.ts).
 * And submitters paste screenshots hot-linked from other directories' CDNs,
 * which vanish or start blocking us later.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await params; // the draft comes from the request, not the stored copy
  const body = (await req.json().catch(() => ({}))) as { draft?: Partial<Tool> };
  const draft = body.draft ?? {};

  const targets: { kind: LinkResult["kind"]; url: string }[] = [];
  if (draft.url?.trim()) targets.push({ kind: "site", url: draft.url.trim() });
  if (draft.logo?.trim()) targets.push({ kind: "logo", url: draft.logo.trim() });
  for (const src of toList(draft.images).slice(0, 8))
    targets.push({ kind: "image", url: src });
  if (draft.video?.trim()) targets.push({ kind: "video", url: draft.video.trim() });

  const results = await Promise.all(targets.map((t) => probe(t.kind, t.url)));
  return NextResponse.json({ results });
}

function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string")
    return v.split("\n").map((s) => s.trim()).filter(Boolean);
  return [];
}

async function probe(kind: LinkResult["kind"], url: string): Promise<LinkResult> {
  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  // HEAD first; plenty of hosts answer 405 to it, so fall back to a GET.
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await fetch(target, {
        method,
        redirect: "follow",
        headers: { "user-agent": UA },
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok || method === "GET")
        return {
          kind,
          url,
          status: res.status,
          ok: res.ok,
          note: res.ok ? undefined : res.statusText || undefined,
        };
    } catch (err) {
      if (method === "GET")
        return {
          kind,
          url,
          status: 0,
          ok: false,
          note: err instanceof Error ? err.message : "request failed",
        };
    }
  }
  return { kind, url, status: 0, ok: false, note: "no response" };
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";
