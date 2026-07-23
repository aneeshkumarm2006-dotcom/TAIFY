/**
 * Seed the MongoDB `tools` collection from the local catalog (src/data/tools.ts).
 * Run with:  pnpm db:seed
 * Requires MONGODB_URI in .env.local (…/taify names the database).
 */
import { config } from "dotenv";
// Next.js keeps secrets in .env.local; load it (then .env as fallback).
config({ path: ".env.local" });
config();
import { MongoClient } from "mongodb";
import { TOOLS } from "../src/data/tools";
import type { Tool } from "../src/lib/types";

type ToolDoc = Omit<Tool, "verifiedAt"> & { verifiedAt: Date };

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("✗ No MONGODB_URI set. Add it to taify/.env.local.");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(); // database name from the URI (…/taify)
  const col = db.collection<ToolDoc>("tools");

  // Remove any tools no longer in the catalog (e.g. old placeholder entries).
  const slugs = TOOLS.map((t) => t.slug);
  const removed = await col.deleteMany({ slug: { $nin: slugs } });
  if (removed.deletedCount) console.log(`  removed ${removed.deletedCount} stale tool(s)`);

  // Idempotent: upsert each tool by slug so re-running is safe.
  const ops = TOOLS.map((t) => ({
    updateOne: {
      filter: { slug: t.slug },
      update: { $set: { ...t, verifiedAt: new Date(t.verifiedAt) } },
      upsert: true,
    },
  }));

  const res = await col.bulkWrite(ops);

  // Helpful indexes for browse/detail queries.
  await col.createIndex({ slug: 1 }, { unique: true });
  await col.createIndex({ category: 1 });
  await col.createIndex({ pricing: 1 });
  await col.createIndex({ saves: -1 });

  console.log(
    `✓ Seeded ${TOOLS.length} tools into "${db.databaseName}.tools" ` +
      `(${res.upsertedCount} new, ${res.modifiedCount} updated).`,
  );
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
