/**
 * Point every tool in Mongo at the screenshot that exists for it.
 *
 *   npx tsx --env-file=.env.local scripts/backfill-shots.mts          # dry run
 *   npx tsx --env-file=.env.local scripts/backfill-shots.mts --apply
 *
 * The seed catalog folds SCREENSHOTS into `images` when it builds a Tool
 * (src/data/tools.ts), but Mongo is the live source and its documents were
 * written before those captures existed - so a shot could sit in public/shots
 * with no tool referencing it. That gap is now load-bearing: `images` is where
 * the Product node's `image` comes from, and a tool with none falls back to the
 * drawn card at /tool/<slug>/card.
 *
 * Two repairs, both additive - no document is created or removed:
 *  - prepend the captured shot to a tool that has no local one;
 *  - drop a /shots path whose file is gone, so nothing points at a 404.
 *
 * It is deliberately NOT part of db:seed, which replaces the tools collection
 * wholesale and would delete every listing Mongo holds that the seed doesn't.
 */
import { MongoClient } from "mongodb";
import { existsSync } from "node:fs";
import path from "node:path";
import { SCREENSHOTS } from "../src/data/screenshots";

const APPLY = process.argv.includes("--apply");
const PUBLIC_DIR = path.join(process.cwd(), "public");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set - run with --env-file=.env.local");
  process.exit(1);
}

const onDisk = (url: string) => existsSync(path.join(PUBLIC_DIR, url.slice(1)));

const client = new MongoClient(uri);
await client.connect();
const tools = client.db().collection("tools");

const docs = await tools
  .find({}, { projection: { slug: 1, name: 1, images: 1 } })
  .toArray();

let changed = 0;
let carded = 0;

for (const doc of docs) {
  const slug = doc.slug as string;
  const before: string[] = Array.isArray(doc.images) ? doc.images : [];

  // Local paths that no longer resolve are worse than no image at all.
  const kept = before.filter((src) => !src.startsWith("/shots/") || onDisk(src));

  const shot = SCREENSHOTS[slug];
  const after =
    shot && onDisk(shot) && !kept.includes(shot) && !kept.some((s) => s.startsWith("/shots/"))
      ? [shot, ...kept]
      : kept;

  if (!after.length) {
    carded += 1;
    console.log(`  card  ${slug.padEnd(22)} no image - falls back to /tool/${slug}/card`);
  }

  if (after.length === before.length && after.every((s, i) => s === before[i])) continue;

  changed += 1;
  console.log(`  set   ${slug.padEnd(22)} ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  if (APPLY) await tools.updateOne({ slug }, { $set: { images: after } });
}

await client.close();

console.log(
  `\n${docs.length} tools, ${changed} ${APPLY ? "updated" : "would change"}, ${carded} with no image at all`,
);
if (!APPLY && changed) console.log("re-run with --apply to write");
