import "server-only";
import { MongoClient, type Db, type Collection, type WithId } from "mongodb";
import type { Post, Tool } from "@/lib/types";
import type { Page } from "@/lib/pages/types";

/**
 * MongoDB connection. Returns null when MONGODB_URI is unset so the app runs
 * entirely on seed data (see src/lib/data.ts). Uses a cached client across
 * hot-reloads in dev to avoid exhausting connections.
 */
const uri = process.env.MONGODB_URI;

// Tool document stored in Mongo. `verifiedAt` is a real Date; add an optional
// embedding vector for Atlas Vector Search (semantic search phase).
export type ToolDoc = Omit<Tool, "verifiedAt"> & {
  verifiedAt: Date;
  embedding?: number[];
};

const globalForMongo = globalThis as unknown as {
  _mongoClient?: MongoClient;
  _mongoPromise?: Promise<MongoClient>;
};

function getClientPromise(): Promise<MongoClient> | null {
  if (!uri) return null;
  if (!globalForMongo._mongoPromise) {
    globalForMongo._mongoClient = new MongoClient(uri);
    globalForMongo._mongoPromise = globalForMongo._mongoClient.connect();
  }
  return globalForMongo._mongoPromise;
}

export async function getDb(): Promise<Db | null> {
  const promise = getClientPromise();
  if (!promise) return null;
  const client = await promise;
  // Database name comes from the URI path (…/taify). Fallback to "taify".
  return client.db();
}

export async function toolsCollection(): Promise<Collection<ToolDoc> | null> {
  const db = await getDb();
  return db ? db.collection<ToolDoc>("tools") : null;
}

export type PostDoc = Post;

export async function postsCollection(): Promise<Collection<PostDoc> | null> {
  const db = await getDb();
  return db ? db.collection<PostDoc>("posts") : null;
}

export async function settingsCollection(): Promise<Collection | null> {
  const db = await getDb();
  return db ? db.collection("settings") : null;
}

export async function pagesCollection(): Promise<Collection<Page> | null> {
  const db = await getDb();
  return db ? db.collection<Page>("pages") : null;
}

/**
 * Where a submission sits in review. Nothing is ever deleted on a decision:
 * "approved" keeps the record next to the slug it produced, "rejected" keeps
 * the reason we turned it down so the same tool coming back a third time is
 * recognisable. "spam" is the only status that invites a hard delete.
 */
export type SubmissionStatus = "pending" | "approved" | "rejected" | "spam";

/** What the public form sent on one attempt. */
export interface SubmissionRevision {
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

/**
 * One document per canonical URL, for the lifetime of that URL.
 *
 * Re-submitting a tool updates this record rather than inserting another one:
 * the head fields hold the latest copy, `revisions` keeps every earlier one, and
 * `attempts` counts how insistent the submitter has been. Penroll arrived four
 * times in six hours and JPG2Excel three times in eight days; as separate rows
 * that is a queue that grows faster than it can be reviewed.
 */
export interface Submission {
  /** Canonical dedupe key from canonicalUrlKey(), e.g. "penroll.app". Unique. */
  urlKey: string;
  urlHost: string;
  name: string;
  url: string;
  tagline: string;
  description: string;
  category: string;
  images: string[];
  video: string;
  submitterEmail: string;
  status: SubmissionStatus;
  /** How many times this URL has been submitted, including the first. */
  attempts: number;
  /** Earlier payloads, oldest first. The head fields are the newest. */
  revisions: SubmissionRevision[];
  /**
   * The listing an admin is building from this submission. Saved on every edit
   * in the review screen, so half-finished review work survives a reload and
   * the preview has something to render.
   */
  draft?: Partial<Tool>;
  /** Slug of the tool this became, set on approve. */
  publishedSlug?: string;
  /** Why it was turned down. Sent to the submitter. */
  reviewNote?: string;
  reviewedAt?: string;
  /**
   * Things worth seeing before deciding: "duplicate-of:<slug>",
   * "disposable-email", "no-email", "dead-link", "hotlinked-images".
   */
  flags: string[];
  /** Salted hash - enough to rate-limit and spot a flood, not an IP log. */
  ipHash?: string;
  createdAt: string;
  updatedAt: string;
  /** What the spam classifier concluded. Absent on anything stored before it. */
  spam?: SpamRecord;
}

export async function submissionsCollection(): Promise<Collection<Submission> | null> {
  const db = await getDb();
  return db ? db.collection<Submission>("submissions") : null;
}

/**
 * Rate-limit ledger for the public submit form.
 *
 * The limiter this replaces was a module-level Map, which is per-instance and
 * dies with the instance: on Vercel a cold start hands every submitter a fresh
 * allowance, so it never limited anything in production. A TTL-expiring
 * collection is the same idea with state that outlives the function.
 */
export interface SubmitAttempt {
  ipHash: string;
  /** Full address, lowercased. Capped separately from the domain. */
  email: string;
  emailDomain: string;
  urlKey: string;
  outcome: string;
  /** Real Date, so the TTL index can expire it. */
  at: Date;

  /**
   * Which form the attempt came from. Optional because the four rows already in
   * this collection predate the contact form sharing it; absent means "submit".
   * "match" is the AI matcher, which stores nothing but still has to be counted.
   */
  form?: "contact" | "submit" | "match" | "newsletter";
  /** Salted hash of the /24 or /48 the caller sits in. "" when unparseable. */
  netHash?: string;
  /** Hash of the human-written fields only, for duplicate detection. */
  fingerprint?: string;
}

/**
 * Shared attempt ledger for both public forms.
 *
 * Still the `submitLog` collection underneath: it already carries a 24h TTL
 * index on `at` and the rows that document the one bot-shaped event this site
 * has seen, and renaming it would throw both away for nothing.
 *
 * In the database, not in memory. The Map this replaced lived on one serverless
 * instance and died with it, so every cold start handed the same submitter a
 * fresh allowance.
 */
export async function formLogCollection(): Promise<Collection<SubmitAttempt> | null> {
  const db = await getDb();
  return db ? db.collection<SubmitAttempt>("submitLog") : null;
}

/** @deprecated Use formLogCollection - the ledger now serves both forms. */
export const submitLogCollection = formLogCollection;

/** A message from the public /contact form. */
export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Toggled from the admin inbox so the team can track what it has dealt with. */
  read: boolean;
  createdAt: string;
  /** Everything the classifier decided about this one. See lib/spam/verdict.ts. */
  spam?: SpamRecord;
}

export async function contactsCollection(): Promise<Collection<ContactMessage> | null> {
  const db = await getDb();
  return db ? db.collection<ContactMessage>("contacts") : null;
}

/**
 * One row per address on the Friday newsletter list.
 *
 * Keyed on the lowercased address, which is the only identity a newsletter
 * has. Re-subscribing updates the row rather than inserting a second one:
 * somebody who signs up from a tool page in March and a blog post in June is
 * one subscriber, and `sources` is what tells us which pages earn signups.
 */
export interface Subscriber {
  /** Lowercased and trimmed. Unique - see ensureNewsletterIndexes. */
  email: string;
  emailDomain: string;
  /** "active" until an unsubscribe flow exists to set anything else. */
  status: "active" | "unsubscribed";
  /**
   * Which modal rule fired, most recent last, deduped. "tools" = the second
   * tool page of a session, "dwell" = 30s browsing, "exit" = leaving a post.
   */
  sources: string[];
  /** The page they were reading when they subscribed. */
  path: string;
  /**
   * Things worth knowing that are not worth rejecting over: "fast-fill",
   * "disposable-email". The submit form takes the same line - a disposable
   * domain is a note on the record and never a block, because two of them
   * became published listings.
   */
  flags: string[];
  /** Salted hash - enough to spot a flood, not an IP log. */
  ipHash?: string;
  netHash?: string;
  createdAt: string;
  updatedAt: string;
}

export async function subscribersCollection(): Promise<Collection<Subscriber> | null> {
  const db = await getDb();
  return db ? db.collection<Subscriber>("subscribers") : null;
}

/**
 * The unique index the subscribe route relies on to stay idempotent.
 *
 * Lazy and once per process, like ensureSpamIndexes, because there is still no
 * migration runner in this repo. The upsert is correct without it; the index is
 * what stops two simultaneous submissions of the same address racing into two
 * rows.
 */
let newsletterIndexesReady: Promise<void> | null = null;
export function ensureNewsletterIndexes(): Promise<void> {
  if (newsletterIndexesReady) return newsletterIndexesReady;
  newsletterIndexesReady = (async () => {
    const db = await getDb();
    if (!db) return;
    await Promise.allSettled([
      db.collection("subscribers").createIndex({ email: 1 }, { unique: true }),
      db.collection("subscribers").createIndex({ createdAt: -1 }),
    ]);
  })().catch(() => {});
  return newsletterIndexesReady;
}

/**
 * What the spam classifier concluded, stored on the document it judged.
 *
 * `reasons` is stored rather than recomputed on read, so the Spam view always
 * shows the reasoning that actually produced the verdict rather than whatever
 * today's rules would say. An operator who cannot see why something was flagged
 * cannot correct it, and a reason that silently changes under them is worse
 * than none.
 */
export interface SpamRecord {
  verdict: "allow" | "quarantine" | "reject";
  score: number;
  category: string;
  reasons: string[];
  /** Machine codes, for grouping and for the backfill to reason about. */
  codes: string[];
  at: string;
  /**
   * True once a person has overridden the machine ("not spam", or a manual
   * status change in the review screen). The backfill never touches these.
   */
  clearedByHuman?: boolean;
}

/**
 * The blocked bin: a copy of every submission the classifier rejected outright.
 *
 * This collection is what earns the right to reject anything at all. A hard
 * filter with nothing behind it turns one false positive into a destroyed
 * customer nobody ever finds out about, and this site has already had one -
 * ideahunter.today, dropped by the 3-second timer on 2026-08-23, payload gone.
 *
 * Expires after 30 days via a TTL index on `at` (see ensureSpamIndexes).
 */
export interface BlockedSubmission {
  form: "contact" | "submit";
  /** The whole payload as it arrived, so nothing is lost while it is here. */
  payload: Record<string, unknown>;
  verdict: "reject";
  score: number;
  category: string;
  reasons: string[];
  codes: string[];
  ipHash: string;
  netHash: string;
  /** Real Date, so the TTL index can expire it. */
  at: Date;
}

export async function blockedCollection(): Promise<Collection<BlockedSubmission> | null> {
  const db = await getDb();
  return db ? db.collection<BlockedSubmission>("blockedSubmissions") : null;
}

/**
 * Create the indexes the spam machinery needs, once per process.
 *
 * There is no migration runner in this repo, so they are created lazily on
 * first write. createIndex is idempotent, and every failure is swallowed: an
 * index that could not be built must never cost us a submission.
 */
let indexesReady: Promise<void> | null = null;
export function ensureSpamIndexes(): Promise<void> {
  if (indexesReady) return indexesReady;
  indexesReady = (async () => {
    const db = await getDb();
    if (!db) return;
    await Promise.allSettled([
      // 30-day bin. The number is the promise made to the operator: anything
      // the machine threw away is recoverable for a month.
      db
        .collection("blockedSubmissions")
        .createIndex({ at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }),
      db.collection("blockedSubmissions").createIndex({ form: 1, at: -1 }),
      // Duplicate-payload lookups over the last 24h.
      db.collection("submitLog").createIndex({ fingerprint: 1, at: -1 }),
      // Per-neighbourhood rate limiting.
      db.collection("submitLog").createIndex({ netHash: 1, at: -1 }),
      db.collection("contacts").createIndex({ createdAt: -1 }),
      db.collection("contacts").createIndex({ "spam.verdict": 1, createdAt: -1 }),
    ]);
  })().catch(() => {});
  return indexesReady;
}

export const isDbEnabled = Boolean(uri);

/**
 * Serialize a ToolDoc back to the app's Tool: Date to ISO string, and drop
 * `_id`/`embedding` so the result is a plain object safe to hand to a client
 * component (an ObjectId prop throws at the server/client boundary).
 */
export function docToTool(doc: WithId<ToolDoc> | ToolDoc): Tool {
  const { _id, embedding, verifiedAt, ...rest } = doc as WithId<ToolDoc>;
  void _id;
  void embedding;
  return {
    ...rest,
    // Documents seeded before aiDepth existed have no value; treat them as
    // AI-native so the badge stays the labelled exception, never a false one.
    aiDepth: rest.aiDepth ?? "native",
    verifiedAt: new Date(verifiedAt).toISOString(),
  };
}
