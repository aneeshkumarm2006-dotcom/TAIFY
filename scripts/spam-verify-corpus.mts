/**
 * Run the classifier over every real submission and contact message in the
 * database and print the verdict for each one.
 *
 * Read-only. Touches nothing, writes nothing, decides nothing. It exists so a
 * rule change can be checked against reality before it ships: if any genuine
 * message in here stops being "allow", the rule is wrong, however much junk it
 * catches.
 *
 *   pnpm spam:verify
 */
import { MongoClient } from "mongodb";
import { classify, type Assessment } from "../src/lib/spam/classify";
import { CATEGORIES } from "../src/data/tools";

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run with: pnpm spam:verify");
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db();

const pad = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s.padEnd(n);

const mark = (a: Assessment) =>
  a.verdict === "allow" ? "PASS" : a.verdict === "quarantine" ? "QUAR" : "DROP";

let allowed = 0;
let flagged = 0;

console.log("\n=== SUBMISSIONS ===\n");
const subs = await db
  .collection("submissions")
  .find({})
  .sort({ createdAt: 1 })
  .toArray();

for (const s of subs) {
  // Replayed exactly as the route would see it today, with one honest gap: the
  // stored documents never captured a timing stamp, so every one of them looks
  // like a browser that sent none. That is the worst case on purpose - if the
  // corpus survives with the no-stamp penalty applied to all 22, it survives.
  const a = classify({
    form: "submit",
    name: s.name,
    email: s.submitterEmail ?? "",
    message: [s.tagline, s.description].filter(Boolean).join("\n"),
    url: s.url,
    category: s.category,
    allowedCategories: CATEGORY_IDS,
    elapsedMs: undefined,
  });
  if (a.verdict === "allow") allowed++;
  else flagged++;
  console.log(
    `${mark(a)}  ${String(a.score).padStart(3)}  ${pad(s.name ?? "", 26)} ${pad(s.status ?? "", 9)} ${pad(s.submitterEmail || "(no email)", 32)}`,
  );
  if (a.verdict !== "allow") for (const r of a.reasons) console.log(`        · ${r}`);
}

console.log("\n=== CONTACT MESSAGES ===\n");
const msgs = await db
  .collection("contacts")
  .find({})
  .sort({ createdAt: 1 })
  .toArray();

for (const m of msgs) {
  const a = classify({
    form: "contact",
    name: m.name,
    email: m.email,
    subject: m.subject,
    message: m.message,
    elapsedMs: undefined,
  });
  if (a.verdict === "allow") allowed++;
  else flagged++;
  console.log(
    `${mark(a)}  ${String(a.score).padStart(3)}  ${pad(m.subject ?? "", 34)} ${pad(m.email ?? "", 32)}`,
  );
  if (a.verdict !== "allow") for (const r of a.reasons) console.log(`        · ${r}`);
}

console.log("\n=== BLOCKED BIN (already rejected, kept 30 days) ===\n");
const binned = await db
  .collection("blockedSubmissions")
  .find({})
  .sort({ at: -1 })
  .limit(50)
  .toArray();
if (binned.length === 0) console.log("(empty)");
for (const b of binned) {
  console.log(`DROP  ${String(b.score).padStart(3)}  ${b.form}  ${b.category}`);
  for (const r of b.reasons ?? []) console.log(`        · ${r}`);
}

console.log(
  `\n${allowed} allowed, ${flagged} flagged, out of ${subs.length + msgs.length} real records.\n`,
);
if (flagged > 0) {
  console.log(
    "Every line above that is not PASS is a genuine record the filter would\n" +
      "interfere with. Read each one before shipping the rule that caused it.\n",
  );
}

await client.close();
