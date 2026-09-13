import "server-only";

import { lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";

// Ride data doesn't need to stick around forever -- a month after the ride
// itself (post.departAt, not when it was posted, so a request made early for
// a ride scheduled further out doesn't get purged before it even happens)
// the post is hard-deleted. `onDelete: "cascade"` on claim.postId and
// message.claimId (lib/db/schema.ts) takes its claims and every message in
// them with it, regardless of status (OPEN/FILLED/CANCELLED all age out the
// same way). Driven by app/api/cron/purge-old-data/route.ts.
const RETENTION_DAYS = 30;

export async function purgeOldPosts(): Promise<{ deletedCount: number }> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const deleted = await db.delete(posts).where(lt(posts.departAt, cutoff)).returning({ id: posts.id });
  return { deletedCount: deleted.length };
}
