import { NextResponse } from "next/server";
import { toolsCollection, docToTool } from "@/lib/db/mongo";
import { TOOLS } from "@/data/tools";
import type { Pricing, Tool } from "@/lib/types";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const PRICINGS: Pricing[] = ["free", "freemium", "trial", "paid"];

// List every tool for the admin table (published + all).
export async function GET() {
  const col = await toolsCollection();
  if (!col) return NextResponse.json({ tools: TOOLS, dbEnabled: false });
  const docs = await col.find({}).sort({ saves: -1 }).toArray();
  return NextResponse.json({ tools: docs.map(docToTool), dbEnabled: true });
}

// Create a new tool listing.
export async function POST(req: Request) {
  const col = await toolsCollection();
  if (!col)
    return NextResponse.json(
      { error: "Database not connected (set MONGODB_URI)." },
      { status: 503 },
    );

  const body = (await req.json().catch(() => ({}))) as Partial<Tool>;
  if (!body.name?.trim())
    return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const slug = slugify(body.slug || body.name);
  if (!slug)
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });

  const exists = await col.findOne({ slug });
  if (exists)
    return NextResponse.json(
      { error: `A tool with slug "${slug}" already exists.` },
      { status: 409 },
    );

  const pricing = PRICINGS.includes(body.pricing as Pricing)
    ? (body.pricing as Pricing)
    : "freemium";

  const doc = {
    slug,
    code: body.code?.trim() || `AI·${1000 + Math.floor(Math.random() * 9000)}`,
    name: body.name.trim(),
    tagline: body.tagline?.trim() || "",
    description: body.description?.trim() || "",
    mark: (body.mark?.trim() || body.name.trim().slice(0, 2)).slice(0, 2),
    color: body.color || "#3a7ca5",
    company: body.company?.trim() || "",
    category: body.category?.trim() || "productivity",
    tags: Array.isArray(body.tags) ? body.tags : [],
    pricing,
    costPerMonth: Number(body.costPerMonth) || 0,
    listingCost: body.listingCost || "Free · promoted from $49",
    saves: Number(body.saves) || 0,
    verifiedAt: new Date(),
    launched:
      body.launched ||
      `${new Date().getFullYear()}·${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    url: body.url?.trim() || "",
    featured: Boolean(body.featured),
    pros: Array.isArray(body.pros) ? body.pros : [],
    cons: Array.isArray(body.cons) ? body.cons : [],
    bestFor: body.bestFor?.trim() || "",
  };

  await col.insertOne(doc);
  return NextResponse.json({ ok: true, slug });
}
