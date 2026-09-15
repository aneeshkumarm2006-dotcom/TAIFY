import { NextResponse } from "next/server";
import { toolsCollection } from "@/lib/db/mongo";
import { categoryPath } from "@/lib/categories/data";
import { pingIndexNow } from "@/lib/indexnow";
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
  if (body.billing === "one-time" || body.billing === "monthly")
    set.billing = body.billing === "one-time" ? "one-time" : undefined;
  if (body.featured !== undefined) set.featured = Boolean(body.featured);

  // "before" so a category move can submit the index it left as well as the one
  // it joined - the old category page still lists the tool until it is recrawled.
  const before = await col.findOneAndUpdate(
    { slug },
    { $set: set },
    { returnDocument: "before" },
  );
  if (!before)
    return NextResponse.json({ error: "Tool not found." }, { status: 404 });

  const paths = [`/tool/${slug}`];
  const moved = typeof set.category === "string" ? set.category : null;
  if (moved && moved !== before.category) {
    paths.push(
      "/browse",
      await categoryPath(before.category),
      await categoryPath(moved),
    );
  }
  pingIndexNow(paths);
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
  // A verify re-stamps the sitemap's lastmod and the "verified Nd ago" line;
  // featuring reorders /browse. Both are worth a recrawl of the page itself.
  pingIndexNow(action === "verify" ? `/tool/${slug}` : [`/tool/${slug}`, "/browse"]);
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
  // findOneAndDelete so the category page the listing was on can be submitted
  // too - the document is gone by the time a ping would otherwise look it up.
  const deleted = await col.findOneAndDelete({ slug });
  if (!deleted)
    return NextResponse.json({ error: "Tool not found." }, { status: 404 });
  // The dead URL is submitted on purpose: that is what gets the crawler back to
  // see the 404 and drop it, rather than serving a stale listing for weeks.
  pingIndexNow([`/tool/${slug}`, "/browse", await categoryPath(deleted.category)]);
  return NextResponse.json({ ok: true });
}
