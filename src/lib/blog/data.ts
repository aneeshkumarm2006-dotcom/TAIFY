import "server-only";
import { postsCollection } from "@/lib/db/mongo";
import type { Post } from "@/lib/types";

function strip(p: Post & { _id?: unknown }): Post {
  const { _id, ...rest } = p;
  void _id;
  return rest;
}

/** Public: only published posts, newest first. */
export async function getPublishedPosts(): Promise<Post[]> {
  const col = await postsCollection();
  if (!col) return [];
  const docs = await col
    .find({ status: "published" })
    .sort({ publishedAt: -1 })
    .toArray();
  return docs.map(strip);
}

/** Public: a single published post by slug. */
export async function getPublishedPost(slug: string): Promise<Post | null> {
  const col = await postsCollection();
  if (!col) return null;
  const doc = await col.findOne({ slug, status: "published" });
  return doc ? strip(doc) : null;
}

/** Admin: any post (draft or published) by slug. */
export async function getPostForEdit(slug: string): Promise<Post | null> {
  const col = await postsCollection();
  if (!col) return null;
  const doc = await col.findOne({ slug });
  return doc ? strip(doc) : null;
}

/** Admin: all posts for the dashboard table. */
export async function getAllPosts(): Promise<Post[]> {
  const col = await postsCollection();
  if (!col) return [];
  const docs = await col.find({}).sort({ updatedAt: -1 }).toArray();
  return docs.map(strip);
}

/** Fire-and-forget view increment. */
export async function incrementViews(slug: string): Promise<void> {
  const col = await postsCollection();
  if (!col) return;
  await col.updateOne({ slug }, { $inc: { views: 1 } });
}
