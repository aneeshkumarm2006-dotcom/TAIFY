import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { searchTools } from "@/lib/data";
import { TOOLS } from "@/data/tools";
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

  // Shortlist candidates with keyword search; fall back to top tools if sparse.
  let candidates = await searchTools(q, 12);
  if (candidates.length < 3) {
    const extra = TOOLS.filter((t) => !candidates.includes(t)).slice(0, 6);
    candidates = [...candidates, ...extra];
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(mockMatch(q, candidates));
  }

  try {
    const result = await aiMatch(key, q, candidates);
    return NextResponse.json(result);
  } catch (err) {
    console.error("AI match failed, using fallback:", err);
    return NextResponse.json(mockMatch(q, candidates));
  }
}

// ---- AI ranking via Claude ----

async function aiMatch(
  apiKey: string,
  query: string,
  candidates: Tool[],
): Promise<MatchResponse> {
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

  const catalog = candidates
    .map(
      (t) =>
        `- slug: ${t.slug} | ${t.name} | ${t.tagline} | pricing: ${t.pricing} | real ~$${t.costPerMonth}/mo | tags: ${t.tags.join(", ")}`,
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

  const res = await client.messages.create({
    model,
    max_tokens: 1024,
    system:
      "You are TAIFY's tool-matching engine. Given a user's task and a candidate list of AI tools, pick the best 3 and rank the rest. For each pick, write one plain, specific sentence starting with why it fits THIS user's task (mention budget/bulk/quality tradeoffs when relevant), and a short cost note. Only use slugs from the candidate list. Be honest - if a cheaper option covers the need, rank it first.",
    messages: [
      {
        role: "user",
        content: `Task: "${query}"\n\nCandidates:\n${catalog}\n\nReturn the best 3 picks (most-fitting first) and the slugs of the remaining candidates ordered by relevance.`,
      },
    ],
    // Structured output - guarantees parseable JSON.
    output_config: { format: { type: "json_schema", schema } },
  });

  const text = res.content.find((b) => b.type === "text");
  const parsed = JSON.parse(text && "text" in text ? text.text : "{}") as {
    picks: Pick[];
    others: string[];
  };

  const valid = new Set(candidates.map((c) => c.slug));
  const picks = (parsed.picks ?? []).filter((p) => valid.has(p.slug)).slice(0, 3);
  const others = (parsed.others ?? []).filter(
    (s) => valid.has(s) && !picks.some((p) => p.slug === s),
  );

  // Guard against a thin response.
  if (picks.length === 0) return mockMatch(query, candidates);

  return { query, picks, others, usedAI: true };
}

// ---- Mock fallback (no API key / error) ----

function mockMatch(query: string, candidates: Tool[]): MatchResponse {
  const top = candidates.slice(0, 3);
  const picks: Pick[] = top.map((t, i) => ({
    slug: t.slug,
    reason:
      i === 0
        ? `Strong keyword match for "${query}", and ${t.pricing === "free" ? "it's free" : `runs about $${t.costPerMonth}/mo`} - the closest fit in the catalog.`
        : `Also fits "${query}" - ${t.tagline.toLowerCase()}`,
    costNote:
      t.costPerMonth === 0 ? "free" : `~$${t.costPerMonth}/mo typical`,
  }));
  return {
    query,
    picks,
    others: candidates.slice(3, 12).map((t) => t.slug),
    usedAI: false,
  };
}
