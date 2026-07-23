import "server-only";
import { MongoClient, type Db, type Collection } from "mongodb";
import type { Post, Tool } from "@/lib/types";

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

export interface Submission {
  name: string;
  url: string;
  tagline: string;
  description: string;
  category: string;
  images: string[];
  video: string;
  submitterEmail: string;
  status: "pending";
  createdAt: string;
}

export async function submissionsCollection(): Promise<Collection<Submission> | null> {
  const db = await getDb();
  return db ? db.collection<Submission>("submissions") : null;
}

export const isDbEnabled = Boolean(uri);

/** Serialize a ToolDoc (Date) back to the app's Tool (ISO string). */
export function docToTool(doc: ToolDoc): Tool {
  const { embedding, verifiedAt, ...rest } = doc;
  void embedding;
  return { ...rest, verifiedAt: new Date(verifiedAt).toISOString() };
}
