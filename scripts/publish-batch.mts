/**
 * Publish reviewed submissions from submissions/tools/<slug>/final.md.
 *
 * Uses the same buildToolDoc / uniqueSlug / findToolByUrl the admin publish
 * route uses, so a listing created here is byte-identical in shape to one
 * created by a human clicking Publish. It deliberately does NOT send the
 * submitter email that route sends - notifying 45 third parties is a separate
 * decision from putting the pages live.
 *
 *   pnpm tsx --env-file=.env.local scripts/publish-batch.mts --dry
 *   pnpm tsx --env-file=.env.local scripts/publish-batch.mts --go
 */
import fs from "node:fs";
import path from "node:path";
import { MongoClient, type Collection } from "mongodb";
import { buildToolDoc, findToolByUrl, uniqueSlug } from "../src/lib/tools/create";
import { canPublish, checkDraft, normalizeDraft } from "../src/lib/submissions/draft";
import type { Tool } from "../src/lib/types";

const ROOT = path.resolve(process.cwd(), "..", "submissions");
const GO = process.argv.includes("--go");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",").filter(Boolean);
const SKIP = new Set(
  (process.argv.find((a) => a.startsWith("--skip="))?.slice(7) ?? "").split(",").filter(Boolean),
);

/** Parse a final.md field record into a Partial<Tool>. */
function parseFinal(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const hits = [...text.matchAll(/^## +(.+?)\s*$/gm)];
  hits.forEach((h, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].index! : text.length;
    out[h[1].trim()] = text.slice(h.index! + h[0].length, end).trim();
  });
  return out;
}

const delist = (v: string | undefined): string[] =>
  (v ?? "")
    .split(/\n/)
    .map((s) => s.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

function toDraft(f: Record<string, string>, slug: string): Partial<Tool> {
  const draft: Partial<Tool> = {
    slug,
    name: f.name,
    url: f.url,
    tagline: f.tagline,
    description: f.description,
    category: f.category,
    bestFor: f.bestFor,
    logo: f.logo,
    images: delist(f.images),
    tags: (f.tags ?? "").split(/[,\n]/).map((s) => s.replace(/^[-*]\s*/, "").trim()).filter(Boolean),
    pros: delist(f.pros),
    cons: delist(f.cons),
    pricing: f.pricing as Tool["pricing"],
    costPerMonth: Number(f.costPerMonth) || 0,
    aiDepth: f.aiDepth === "feature" ? "feature" : "native",
    company: f.company ?? "",
    mark: f.mark,
    color: f.color,
  };
  if (f.launched) draft.launched = f.launched;
  if (f.billing === "one-time") draft.billing = "one-time";
  return normalizeDraft(draft);
}

async function main() {
  const queue = JSON.parse(fs.readFileSync(path.join(ROOT, "queue.json"), "utf8")) as {
    slug: string;
    name: string;
    url: string;
    status: string;
  }[];

  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db();
  const tools = db.collection("tools") as unknown as Collection<
    ReturnType<typeof buildToolDoc>
  >;
  const subs = db.collection("submissions");

  const before = await tools.countDocuments();
  console.log(`${GO ? "PUBLISH" : "DRY RUN"} - tools collection currently holds ${before}\n`);

  let published = 0;
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const row of queue) {
    if (ONLY && !ONLY.includes(row.slug)) continue;
    if (SKIP.has(row.slug)) {
      skipped.push(`${row.slug} (held by operator)`);
      continue;
    }
    const file = path.join(ROOT, "tools", row.slug, "final.md");
    if (!fs.existsSync(file)) {
      failed.push(`${row.slug} - no final.md`);
      continue;
    }

    const f = parseFinal(fs.readFileSync(file, "utf8"));
    const draft = toDraft(f, row.slug);

    if (!canPublish(draft)) {
      failed.push(
        `${row.slug} - ${checkDraft(draft).filter((i) => i.blocking).map((i) => i.label).join("; ")}`,
      );
      continue;
    }

    const listed = await findToolByUrl(tools as never, draft.url ?? "");
    if (listed) {
      skipped.push(`${row.slug} - host already listed as /tool/${listed.slug}`);
      continue;
    }

    const slug = await uniqueSlug(tools as never, draft.slug || draft.name || "");
    if (!slug) {
      failed.push(`${row.slug} - could not derive slug`);
      continue;
    }

    const doc = buildToolDoc(slug, draft);
    const note = f.pricing_note ? `  [pricing_note: ${f.pricing_note.slice(0, 60)}...]` : "";

    if (!GO) {
      console.log(
        `  would publish /tool/${slug.padEnd(24)} ${doc.category.padEnd(12)} ${doc.pricing.padEnd(9)} $${doc.costPerMonth}${note}`,
      );
      published++;
      continue;
    }

    await tools.insertOne(doc);
    const now = new Date().toISOString();
    const res = await subs.updateOne(
      { urlKey: { $exists: true }, name: row.name, status: "pending" },
      { $set: { status: "approved", publishedSlug: slug, draft, reviewedAt: now, updatedAt: now } },
    );
    console.log(
      `  published /tool/${slug.padEnd(24)} ${doc.category.padEnd(12)} submission ${res.modifiedCount ? "marked approved" : "NOT MATCHED"}`,
    );
    published++;
  }

  console.log(
    `\n${GO ? "published" : "would publish"}: ${published}   skipped: ${skipped.length}   failed: ${failed.length}`,
  );
  if (skipped.length) console.log("\nSKIPPED\n" + skipped.map((s) => "  " + s).join("\n"));
  if (failed.length) console.log("\nFAILED\n" + failed.map((s) => "  " + s).join("\n"));
  if (GO) console.log(`\ntools collection now holds ${await tools.countDocuments()}`);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
