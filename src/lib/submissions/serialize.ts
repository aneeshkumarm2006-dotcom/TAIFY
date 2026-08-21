import type { WithId } from "mongodb";
import type { Submission } from "@/lib/db/mongo";

/**
 * A submission as the admin UI sees it: `_id` swapped for a string `id`, and
 * the IP hash left behind - it exists to count attempts server-side and has no
 * business in a page.
 */
export type ClientSubmission = Omit<Submission, "ipHash"> & { id: string };

export function serializeSubmission(d: WithId<Submission>): ClientSubmission {
  const { _id, ipHash, ...rest } = d;
  void ipHash;
  return { ...rest, id: String(_id) };
}
