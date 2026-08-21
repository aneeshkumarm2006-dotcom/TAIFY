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
}

export async function submitLogCollection(): Promise<Collection<SubmitAttempt> | null> {
  const db = await getDb();
  return db ? db.collection<SubmitAttempt>("submitLog") : null;
}

/** A message from the public /contact form. */
export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Toggled from the admin inbox so the team can track what it has dealt with. */
  read: boolean;
  createdAt: string;
}

export async function contactsCollection(): Promise<Collection<ContactMessage> | null> {
  const db = await getDb();
  return db ? db.collection<ContactMessage>("contacts") : null;
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
