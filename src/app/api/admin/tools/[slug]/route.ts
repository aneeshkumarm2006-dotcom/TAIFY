import { NextResponse } from "next/server";
import { toolsCollection } from "@/lib/db/mongo";
import type { Pricing, Tool } from "@/lib/types";

export const runtime = "nodejs";

const PRICINGS: Pricing[] = ["free", "freemium", "trial", "paid"];

// Update an existing tool.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const col = await toolsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as Partial<Tool>;
  const set: Record<string, unknown> = {};
  const assign = <K extends keyof Tool>(k: K, v: Tool[K] | undefined) => {
    if (v !== undefined) set[k] = v;
  };

  assign("name", body.name?.trim());
  assign("tagline", body.tagline?.trim());
  assign("description", body.description?.trim());
  assign("mark", body.mark?.slice(0, 2));
  assign("color", body.color);
  assign("logo", body.logo?.trim());
  assign("video", body.video?.trim());
  if (Array.isArray(body.images)) set.images = body.images.filter(Boolean);
  assign("company", body.company?.trim());
  assign("category", body.category?.trim());
  assign("url", body.url?.trim());
  assign("bestFor", body.bestFor?.trim());
  assign("listingCost", body.listingCost);
  assign("launched", body.launched);
  if (Array.isArray(body.tags)) set.tags = body.tags;
  if (Array.isArray(body.pros)) set.pros = body.pros;
  if (Array.isArray(body.cons)) set.cons = body.cons;
  if (body.pricing && PRICINGS.includes(body.pricing)) set.pricing = body.pricing;
  if (body.aiDepth === "native" || body.aiDepth === "feature") set.aiDepth = body.aiDepth;
  if (body.costPerMonth !== undefined) set.costPerMonth = Number(body.costPerMonth) || 0;
  if (body.featured !== undefined) set.featured = Boolean(body.featured);

  const res = await col.updateOne({ slug }, { $set: set });
  if (res.matchedCount === 0)
    return NextResponse.json({ error: "Tool not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Toggle featured / re-stamp verified.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const col = await toolsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });

  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  const set: Record<string, unknown> = {};
  if (action === "verify") set.verifiedAt = new Date();
  else if (action === "feature") set.featured = true;
  else if (action === "unfeature") set.featured = false;
  else return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const res = await col.updateOne({ slug }, { $set: set });
  if (res.matchedCount === 0)
    return NextResponse.json({ error: "Tool not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Delete a tool.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const col = await toolsCollection();
  if (!col)
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  const res = await col.deleteOne({ slug });
  if (res.deletedCount === 0)
    return NextResponse.json({ error: "Tool not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
