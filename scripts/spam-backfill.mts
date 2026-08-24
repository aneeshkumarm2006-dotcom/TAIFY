/**
 * Classify submissions and contact messages that were already stored before the
 * classifier existed, and attach the verdict to each one.
 *
 *   pnpm spam:backfill              # dry run, prints what it would do
 *   pnpm spam:backfill -- --apply   # writes the verdicts
 *   pnpm spam:backfill -- --apply --move
 *                                   # also moves quarantined PENDING submissions
 *                                   # into the Spam tab
 *
 * Three rules this script obeys without exception:
 *
 *  1. It never deletes anything.
 *  2. It never overrides a decision a person made by hand. Anything reviewed,
 *     published, or already cleared by a human is annotated at most, and skipped
 *     entirely if a human verdict is already on it.
 *  3. Status only ever changes with --move, only ever from "pending" to "spam",
 *     and never on a record that has been reviewed. Everything else is
 *     annotation: the record gains a `spam` field and nothing else moves.
 *
 * The default is a dry run because the whole point of the exercise is that you
 * see the list before anything is written.
 */
import { MongoClient, type Document } from "mongodb";
import { classify, type Assessment } from "../src/lib/spam/classify";
import { CATEGORIES } from "../src/data/tools";

const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

const APPLY = process.argv.includes("--apply");
const MOVE = process.argv.includes("--move");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db();

const pad = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s.padEnd(n);

function record(a: Assessment) {
  return {
    verdict: a.verdict,
    score: a.score,
    category: a.category,
    reasons: a.reasons,
    codes: a.signals.map((s) => s.code),
    at: new Date().toISOString(),
  };
}

/** True when a person has already had their say about this document. */
function humanDecided(d: Document): boolean {
  if (d.spam?.clearedByHuman) return true;
  if (d.reviewedAt) return true;
  if (d.publishedSlug) return true;
  if (d.status && d.status !== "pending") return true;
  return false;
}

interface Plan {
  kind: "submission" | "contact";
  label: string;
  detail: string;
  verdict: string;
  score: number;
  reasons: string[];
  /** What would change, in words, or "" when nothing would. */
  action: string;
  write: (() => Promise<unknown>) | null;
}

const plans: Plan[] = [];
let skippedHuman = 0;
let alreadyDone = 0;

// ── Submissions ──────────────────────────────────────────────────────────────

const subs = await db.collection("submissions").find({}).toArray();
for (const s of subs) {
  if (s.spam?.clearedByHuman) {
    skippedHuman++;
    continue;
  }
  if (s.spam) {
    alreadyDone++;
    continue;
  }

  const a = classify({
    form: "submit",
    name: s.name,
    email: s.submitterEmail ?? "",
    message: [s.tagline, s.description].filter(Boolean).join("\n"),
    url: s.url,
    category: s.category,
    allowedCategories: CATEGORY_SLUGS,
    // Nothing stored predates the timing stamp, so every historical record
    // looks like a browser that sent none. That is the honest replay.
    elapsedMs: undefined,
  });

  const decided = humanDecided(s);
  const wouldMove =
    MOVE && !decided && s.status === "pending" && a.verdict === "quarantine";

  const set: Document = { spam: record(a) };
  if (wouldMove) set.status = "spam";

  plans.push({
    kind: "submission",
    label: s.name ?? "(unnamed)",
    detail: `${s.status} · ${s.submitterEmail || "(no email)"}`,
    verdict: a.verdict,
    score: a.score,
    reasons: a.reasons,
    action: wouldMove
      ? "annotate + move pending → spam"
      : decided && a.verdict !== "allow"
        ? "annotate only (a person already decided this one)"
        : "annotate",
    write: () =>
      db.collection("submissions").updateOne({ _id: s._id }, { $set: set }),
  });
}

// ── Contact messages ─────────────────────────────────────────────────────────

const msgs = await db.collection("contacts").find({}).toArray();
for (const m of msgs) {
  if (m.spam?.clearedByHuman) {
    skippedHuman++;
    continue;
  }
  if (m.spam) {
    alreadyDone++;
    continue;
  }

  const a = classify({
    form: "contact",
    name: m.name,
    email: m.email,
    subject: m.subject,
    message: m.message,
    elapsedMs: undefined,
  });

  // A message a person has already read and dealt with is theirs. Annotate it
  // so the record is complete, but it stays in the inbox regardless.
  const alreadyRead = Boolean(m.read);

  plans.push({
    kind: "contact",
    label: m.subject ?? "(no subject)",
    detail: `${m.email ?? ""}${alreadyRead ? " · already read" : ""}`,
    verdict: a.verdict,
    score: a.score,
    reasons: a.reasons,
    action: "annotate",
    write: () =>
      db.collection("contacts").updateOne({ _id: m._id }, { $set: { spam: record(a) } }),
  });
}

// ── Report ───────────────────────────────────────────────────────────────────

console.log(
  `\n${APPLY ? "APPLYING" : "DRY RUN"}${MOVE ? " (with --move)" : ""}: ${plans.length} record(s) to process.\n`,
);

const byVerdict = { allow: 0, quarantine: 0, reject: 0 } as Record<string, number>;
for (const p of plans) byVerdict[p.verdict] = (byVerdict[p.verdict] ?? 0) + 1;

for (const p of plans) {
  const tag =
    p.verdict === "allow" ? "PASS" : p.verdict === "quarantine" ? "QUAR" : "DROP";
  console.log(
    `${tag}  ${String(p.score).padStart(3)}  ${pad(p.kind, 10)} ${pad(p.label, 30)} ${pad(p.detail, 40)} → ${p.action}`,
  );
  if (p.verdict !== "allow") for (const r of p.reasons) console.log(`        · ${r}`);
}

console.log(
  `\nallow ${byVerdict.allow ?? 0} · quarantine ${byVerdict.quarantine ?? 0} · reject ${byVerdict.reject ?? 0}`,
);
console.log(
  `${alreadyDone} already classified, ${skippedHuman} skipped because a person overruled the machine.`,
);

if (!APPLY) {
  console.log(
    "\nNothing was written. Re-run with --apply once the list above looks right.",
  );
  if (!MOVE) {
    console.log(
      "Add --move as well to have quarantined PENDING submissions moved into the Spam tab;\n" +
        "without it this only annotates and every record stays exactly where it is.\n",
    );
  }
} else {
  let written = 0;
  for (const p of plans) {
    if (!p.write) continue;
    await p.write();
    written++;
  }
  console.log(`\n${written} record(s) updated. Nothing was deleted.\n`);
}

await client.close();
