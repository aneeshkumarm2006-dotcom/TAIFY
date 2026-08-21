/**
 * Move the `submissions` collection to one document per canonical URL.
 *
 *   npx tsx scripts/migrate-submissions.mts            # dry run, writes nothing
 *   npx tsx scripts/migrate-submissions.mts --apply    # do it
 *
 * Backfills the fields the new submit route relies on (urlKey, urlHost,
 * attempts, revisions, flags, updatedAt), folds repeat submissions of the same
 * URL into a single record that keeps every earlier payload, flags submissions
 * whose site is already in the catalog, and creates the indexes.
 *
 * Touches `submissions` and `submitLog` only. It never reads or writes `tools`
 * except to look up hosts for the duplicate flag.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { MongoClient, type WithId, type Document } from "mongodb";
import { canonicalUrlKey, urlHost } from "../src/lib/utils";

const APPLY = process.argv.includes("--apply");

const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "yopmail.com", "sharklasers.com", "throwawaymail.com",
  "trashmail.com", "getnada.com", "dispostable.com", "maildrop.cc",
  "agentmail.to", "163cc.online",
]);

interface Rev {
  at: string;
  name: string;
  url: string;
  tagline: string;
  description: string;
  category: string;
  images: string[];
  video: string;
  submitterEmail: string;
}

function revisionOf(d: Document): Rev {
  return {
    at: String(d.updatedAt ?? d.createdAt ?? ""),
    name: String(d.name ?? ""),
    url: String(d.url ?? ""),
    tagline: String(d.tagline ?? ""),
    description: String(d.description ?? ""),
    category: String(d.category ?? ""),
    images: Array.isArray(d.images) ? (d.images as string[]) : [],
    video: String(d.video ?? ""),
    submitterEmail: String(d.submitterEmail ?? ""),
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("✗ No MONGODB_URI set. Add it to site/.env.local.");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const subs = db.collection("submissions");
  const tools = db.collection("tools");

  const docs = (await subs.find({}).sort({ createdAt: 1 }).toArray()) as WithId<Document>[];
  console.log(`${docs.length} submission(s) in "${db.databaseName}.submissions"`);
  if (docs.length === 0) {
    await client.close();
    return;
  }

  // Host -> slug for every published tool, to spot submissions already listed.
  const listed = new Map<string, string>();
  for (const t of await tools.find({}, { projection: { slug: 1, url: 1 } }).toArray()) {
    const host = urlHost(String(t.url ?? ""));
    if (host) listed.set(host, String(t.slug));
  }

  // Group by canonical URL, oldest first within each group.
  const groups = new Map<string, WithId<Document>[]>();
  for (const d of docs) {
    const key = canonicalUrlKey(String(d.url ?? "")) || `no-url:${String(d._id)}`;
    const g = groups.get(key);
    if (g) g.push(d);
    else groups.set(key, [d]);
  }

  let merged = 0;
  let deleted = 0;
  const plan: string[] = [];

  for (const [urlKey, group] of groups) {
    const head = group[group.length - 1]; // newest
    const older = group.slice(0, -1);

    const revisions: Rev[] = [
      ...older.map(revisionOf),
      ...((head.revisions as Rev[] | undefined) ?? []),
    ];
    const attempts = group.reduce(
      (n, d) => n + (typeof d.attempts === "number" ? d.attempts : 1),
      0,
    );

    const emailDomain = String(head.submitterEmail ?? "").split("@")[1]?.toLowerCase() ?? "";
    const host = urlHost(String(head.url ?? ""));
    const flags = new Set<string>((head.flags as string[] | undefined) ?? []);
    if (!String(head.submitterEmail ?? "").trim()) flags.add("no-email");
    if (DISPOSABLE.has(emailDomain)) flags.add("disposable-email");
    const dupe = listed.get(host);
    if (dupe) flags.add(`duplicate-of:${dupe}`);

    const set = {
      urlKey,
      urlHost: host,
      status: String(head.status ?? "pending"),
      attempts,
      revisions,
      flags: [...flags],
      updatedAt: String(head.updatedAt ?? head.createdAt ?? new Date().toISOString()),
    };

    if (older.length) {
      merged += 1;
      deleted += older.length;
      plan.push(
        `  merge  ${urlKey.padEnd(32)} ${group.length} docs -> 1 (attempts ${attempts})`,
      );
    } else if (!head.urlKey) {
      plan.push(
        `  backfill ${urlKey.padEnd(30)} ${set.flags.length ? `flags: ${set.flags.join(", ")}` : ""}`,
      );
    }

    if (APPLY) {
      await subs.updateOne({ _id: head._id }, { $set: set });
      if (older.length)
        await subs.deleteMany({ _id: { $in: older.map((d) => d._id) } });
    }
  }

  console.log(plan.join("\n") || "  nothing to change");
  console.log(
    `\n${docs.length} -> ${docs.length - deleted} document(s); ` +
      `${merged} group(s) merged, ${deleted} duplicate(s) folded in`,
  );

  if (APPLY) {
    await subs.createIndex({ urlKey: 1 }, { unique: true });
    await subs.createIndex({ status: 1, updatedAt: -1 });
    // Rate-limit ledger: entries expire a day after they are written.
    await db.collection("submitLog").createIndex({ at: 1 }, { expireAfterSeconds: 86_400 });
    await db.collection("submitLog").createIndex({ ipHash: 1, at: -1 });
    console.log("✓ Applied, indexes created.");
  } else {
    console.log("\nDry run - nothing written. Re-run with --apply.");
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
