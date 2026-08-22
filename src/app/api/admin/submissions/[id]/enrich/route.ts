import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parse } from "node-html-parser";
import { CATEGORIES } from "@/data/tools";
import { PRICINGS, faviconFor } from "@/lib/tools/create";
import type { Tool } from "@/lib/types";
import { urlHost } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * "Auto-fill from site": read the tool's own homepage, then let Claude draft the
 * judgement fields from what it says.
 *
 * Two stages on purpose. The scrape supplies facts the page states about itself
 * - title, description, social image, brand colour - and works with no API key.
 * The model only ever proposes: nothing here writes to the database, and the
 * admin edits every field before publishing.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await params;
  const body = (await req.json().catch(() => ({}))) as { draft?: Partial<Tool> };
  const url = (body.draft?.url ?? "").trim();
  if (!url)
    return NextResponse.json({ error: "The draft has no URL." }, { status: 400 });

  const page = await scrape(url);
  if (!page)
    return NextResponse.json(
      { error: "Could not load that site. Fill the listing in by hand." },
      { status: 502 },
    );

  const suggestion: Partial<Tool> = {
    tagline: page.tagline,
    description: page.description,
    images: page.image ? [page.image] : [],
    // Deliberately the Google favicon rather than the site's own icon, even
    // though we just scraped one: the logo renders through next/image, which
    // throws on a host missing from next.config.ts. A self-hosted favicon would
    // 500 the published page. Google's service 404s for some domains - the link
    // check catches that, and an empty logo falls back to the letter tile.
    logo: faviconFor(url),
    color: page.themeColor || undefined,
  };

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key)
    return NextResponse.json({
      suggestion: prune(suggestion),
      usedAI: false,
      note: "No ANTHROPIC_API_KEY set - filled in from the site's own metadata only.",
    });

  try {
    const drafted = await draftWithClaude(key, url, page);
    return NextResponse.json({
      suggestion: prune({ ...suggestion, ...drafted }),
      usedAI: true,
    });
  } catch (err) {
    console.error("[enrich] Claude draft failed:", err);
    return NextResponse.json({
      suggestion: prune(suggestion),
      usedAI: false,
      note: "AI drafting failed - filled in from the site's own metadata only.",
    });
  }
}

/** Drop empty values so a suggestion never blanks a field the admin has filled. */
function prune(v: Partial<Tool>): Partial<Tool> {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    if (val === undefined || val === null || val === "") continue;
    if (Array.isArray(val) && val.length === 0) continue;
    out[k] = val;
  }
  return out as Partial<Tool>;
}

interface ScrapedPage {
  tagline: string;
  description: string;
  image: string;
  icon: string;
  themeColor: string;
  text: string;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";

async function scrape(url: string): Promise<ScrapedPage | null> {
  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  let html: string;
  try {
    const res = await fetch(target, {
      headers: { "user-agent": UA, accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  const root = parse(html);
  const meta = (sel: string, attr = "content") =>
    (root.querySelector(sel)?.getAttribute(attr) ?? "").trim();

  const title =
    meta('meta[property="og:title"]') ||
    root.querySelector("title")?.text?.trim() ||
    "";
  const description =
    meta('meta[name="description"]') ||
    meta('meta[property="og:description"]') ||
    "";

  // Strip the parts of a page that are never prose before taking the text.
  for (const el of root.querySelectorAll("script, style, noscript, svg"))
    el.remove();
  const text = root.text.replace(/\s+/g, " ").trim().slice(0, 8000);

  const iconHref =
    root.querySelector('link[rel="icon"]')?.getAttribute("href") ||
    root.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ||
    root.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href") ||
    "";

  return {
    // og:title is usually "Name - what it does"; keep the descriptive half.
    tagline: title.replace(/^[^|\-–—:]+[|\-–—:]\s*/, "").trim() || title,
    description,
    image: absolutize(meta('meta[property="og:image"]'), target),
    icon: absolutize(iconHref, target),
    themeColor: meta('meta[name="theme-color"]'),
    text,
  };
}

function absolutize(href: string, base: string): string {
  if (!href) return "";
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

async function draftWithClaude(
  apiKey: string,
  url: string,
  page: ScrapedPage,
): Promise<Partial<Tool>> {
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      tagline: { type: "string" },
      description: { type: "string" },
      company: { type: "string" },
      category: { type: "string", enum: CATEGORIES.map((c) => c.slug) },
      tags: { type: "array", items: { type: "string" } },
      pricing: { type: "string", enum: PRICINGS },
      costPerMonth: { type: "number" },
      aiDepth: { type: "string", enum: ["native", "feature"] },
      bestFor: { type: "string" },
      pros: { type: "array", items: { type: "string" } },
      cons: { type: "array", items: { type: "string" } },
    },
    required: [
      "tagline", "description", "company", "category", "tags",
      "pricing", "costPerMonth", "aiDepth", "bestFor", "pros", "cons",
    ],
  };

  const system = [
    "You are drafting a catalog listing for TAIFY, a directory of AI tools whose whole value is that it is honest about what things cost and what they are not good at.",
    "Work only from the page text provided. Never invent a price, a feature, or a company name: if the page does not say, leave the field to its safest value (costPerMonth 0, company empty).",
    "tagline: one plain sentence, under 90 characters, saying what the tool does. No marketing adjectives.",
    "description: two or three sentences on the job it does and who for.",
    "bestFor: a noun phrase completing 'It's built for …', e.g. 'small teams hiring their first employees'.",
    "tags: 3 to 6 lowercase single words or short phrases someone would search for.",
    "pros: 3 concrete strengths. cons: 2 or 3 honest watch-outs - real limitations, not disguised compliments. A listing with no watch-outs is worthless to readers.",
    "costPerMonth: what a normal paying user actually pays per month, not the cheapest tier and not the enterprise one. 0 if the tool is genuinely free.",
    "aiDepth: 'native' if the product does not exist without AI, 'feature' if it is established software that added AI later.",
    "Do not use em dashes anywhere in your output.",
  ].join(" ");

  const res = await client.messages.create({
    model,
    max_tokens: 1500,
    system,
    messages: [
      {
        role: "user",
        content: `Tool website: ${url} (${urlHost(url)})\nPage title/tagline: ${page.tagline}\nMeta description: ${page.description}\n\nPage text:\n${page.text}`,
      },
    ],
    output_config: { format: { type: "json_schema", schema } },
  } as Parameters<typeof client.messages.create>[0]);

  const message = res as Anthropic.Message;
  const block = message.content.find((b) => b.type === "text");
  const parsed = JSON.parse(
    block && "text" in block ? block.text : "{}",
  ) as Partial<Tool>;

  return {
    tagline: str(parsed.tagline),
    description: str(parsed.description),
    company: str(parsed.company),
    category: CATEGORIES.some((c) => c.slug === parsed.category)
      ? parsed.category
      : undefined,
    tags: list(parsed.tags).slice(0, 6),
    pricing: PRICINGS.includes(parsed.pricing as (typeof PRICINGS)[number])
      ? parsed.pricing
      : undefined,
    costPerMonth: Number(parsed.costPerMonth) || 0,
    aiDepth: parsed.aiDepth === "feature" ? "feature" : "native",
    bestFor: str(parsed.bestFor),
    pros: list(parsed.pros).slice(0, 4),
    cons: list(parsed.cons).slice(0, 4),
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function list(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : [];
}
