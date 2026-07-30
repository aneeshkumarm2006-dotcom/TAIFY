import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { filterTools } from "@/lib/data";
import type { Tool } from "@/lib/types";

export const runtime = "nodejs";

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

export async function POST(req: Request) {
  const { query } = (await req.json()) as { query?: string };
  const q = (query ?? "").trim();
  if (!q) {
    return NextResponse.json({ error: "Empty query" }, { status: 400 });
  }

  // The catalog is small enough to hand the whole thing to the model - no
  // keyword pre-filter, so the AI reasons over every tool, not a lossy shortlist.
  const catalog = await filterTools({});
  if (catalog.length === 0) {
    return NextResponse.json({ query: q, picks: [], others: [], usedAI: false });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(mockMatch(q, catalog));
  }

  try {
    const result = await aiMatch(key, q, catalog);
    return NextResponse.json(result);
  } catch (err) {
    console.error("AI match failed, using fallback:", err);
    return NextResponse.json(mockMatch(q, catalog));
  }
}

// ---- AI ranking via Claude ----

async function aiMatch(
  apiKey: string,
  query: string,
  catalog: Tool[],
): Promise<MatchResponse> {
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  // Rich per-tool line so the model can weigh cost, use case, and tradeoffs.
  const lines = catalog
    .map(
      (t) =>
        `- ${t.slug} | ${t.name} (${t.company}) | ${t.category} | ${t.tagline} | pricing: ${t.pricing}, ~$${t.costPerMonth}/mo | best for: ${t.bestFor} | strengths: ${t.pros.join("; ")} | watch-outs: ${t.cons.join("; ")} | tags: ${t.tags.join(", ")}`,
    )
    .join("\n");

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      picks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            slug: { type: "string" },
            reason: { type: "string" },
            costNote: { type: "string" },
          },
          required: ["slug", "reason", "costNote"],
        },
      },
      others: { type: "array", items: { type: "string" } },
    },
    required: ["picks", "others"],
  };

  const system = [
    "You are TAIFY's AI-tool matchmaker. A person describes a job, goal, or situation, and you recommend the AI tools genuinely worth their time from the catalog provided.",
    "Reason about the underlying job-to-be-done, not keyword overlap: infer their use case, skill level, and budget from how they phrase it.",
    "Pick the 3 best-fitting tools, most-fitting first. For each pick write ONE specific, honest sentence about why it fits THIS person's task - name the concrete tradeoff that makes it the right call (budget, quality, ease, ecosystem, free tier). Then a short cost note.",
    "Be honest: if a free or cheaper tool covers the need well, rank it first. Don't just pick the most famous tools. Only ever use slugs from the catalog.",
    "Then order the remaining relevant slugs by how well they fit, best first. Omit tools that are clearly irrelevant to the task.",
    "Never invent tools, prices, or slugs. Do not use em dashes anywhere in your output.",
  ].join(" ");

  const res = await client.messages.create({
    model,
    max_tokens: 1200,
    system,
    messages: [
      {
        role: "user",
        content: `Task: "${query}"\n\nCatalog:\n${lines}\n\nReturn the 3 best picks and the remaining relevant slugs ranked by fit.`,
      },
    ],
    // Structured output - guarantees parseable JSON matching the schema.
    output_config: { format: { type: "json_schema", schema } },
  } as Parameters<typeof client.messages.create>[0]);

  const message = res as Anthropic.Message;
  const text = message.content.find((b) => b.type === "text");
  const parsed = JSON.parse(
    text && "text" in text ? text.text : "{}",
  ) as { picks: Pick[]; others: string[] };

  const valid = new Set(catalog.map((c) => c.slug));
  const picks = (parsed.picks ?? [])
    .filter((p) => valid.has(p.slug))
    .slice(0, 3);
  const others = (parsed.others ?? []).filter(
    (s) => valid.has(s) && !picks.some((p) => p.slug === s),
  );

  // Guard against a thin response.
  if (picks.length === 0) return mockMatch(query, catalog);

  return { query, picks, others, usedAI: true };
}

// ---- Fallback (no API key / error): a real semantic-ish scorer, not a filter ----

const STOP = new Set([
  "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "with", "my",
  "me", "i", "want", "need", "help", "best", "tool", "tools", "ai", "some",
  "that", "this", "how", "do", "can", "make", "get", "use", "using", "app",
  "from", "up", "out", "into", "your", "you", "it", "is", "are", "was", "will",
  "when", "what", "which", "who", "about", "more", "most", "like", "just",
  "also", "than", "then", "over", "down", "off", "but", "so", "as", "at", "by",
  "be", "have", "has", "had", "not", "no", "any", "all", "one", "would", "could",
  "should", "am", "im", "were", "our", "their", "them", "they", "we", "us",
  "looking", "trying", "something", "someone", "way", "ways", "good", "great",
]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function scoreTool(tool: Tool, qtokens: string[]): number {
  // Weight fields by how strongly they signal fit.
  const fields: [string, number][] = [
    [tool.tags.join(" "), 3],
    [tool.category, 3],
    [tool.bestFor, 2.5],
    [tool.tagline, 2],
    [tool.name, 2],
    [tool.description, 1],
    [tool.company, 1],
  ];
  let score = 0;
  for (const [text, weight] of fields) {
    const ft = new Set(tokens(text));
    for (const qt of qtokens) if (ft.has(qt)) score += weight;
  }
  // Gentle nudge toward well-loved, free-friendly options on ties.
  score += Math.min(tool.saves, 1_000_000) / 5_000_000;
  if (tool.costPerMonth === 0) score += 0.25;
  return score;
}

function mockMatch(query: string, catalog: Tool[]): MatchResponse {
  const qtokens = tokens(query);
  const ranked = catalog
    .map((t) => ({ t, s: scoreTool(t, qtokens) }))
    .sort((a, b) => b.s - a.s);

  // If nothing matched at all, fall back to the most-saved tools.
  const anyMatch = (ranked[0]?.s ?? 0) > 0.5;
  const ordered = anyMatch
    ? ranked
    : [...catalog].sort((a, b) => b.saves - a.saves).map((t) => ({ t, s: 0 }));

  const top = ordered.slice(0, 3).map(({ t }) => t);
  const picks: Pick[] = top.map((t, i) => ({
    slug: t.slug,
    reason:
      i === 0
        ? `Closest fit for "${query}" - ${t.bestFor.toLowerCase().replace(/\.$/, "")}${t.pricing === "free" ? ", and it's free" : ""}.`
        : `Also worth a look: ${t.tagline.toLowerCase()}`,
    costNote: t.costPerMonth === 0 ? "free" : `~$${t.costPerMonth}/mo typical`,
  }));

  return {
    query,
    picks,
    others: ordered.slice(3, 12).map(({ t }) => t.slug),
    usedAI: false,
  };
}
