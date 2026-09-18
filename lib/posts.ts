import "server-only";

import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, claims } from "@/lib/db/schema";
import type { PostFormValues } from "@/lib/validation";
import { parseEasternDatetimeLocal } from "@/lib/format-date";
import { dollarsToCents } from "@/lib/pricing";

// How long past its ride time a post gets to be matched/completed before
// the daily cron (app/api/cron/purge-old-data) steps in -- see
// autoCancelStalePosts here and autoCompleteStaleFilledPosts in
// lib/coupons.ts.
const STALE_HOURS = 24;

export async function createPost(authorId: string, values: PostFormValues) {
  const [post] = await db
    .insert(posts)
    .values({
      authorId,
      origin: values.origin,
      originLat: values.originLat ?? null,
      originLng: values.originLng ?? null,
      destination: values.destination,
      destLat: values.destLat ?? null,
      destLng: values.destLng ?? null,
      // values.departAt is a <input type="datetime-local"> value -- no
      // timezone attached, so `new Date(...)` would silently misinterpret
      // it using the server's zone (UTC on Vercel) instead of the Eastern
      // time its poster meant. See lib/format-date.ts's comment.
      departAt: parseEasternDatetimeLocal(values.departAt),
      notes: values.notes || null,
      askingPriceCents: values.askingPrice != null ? dollarsToCents(values.askingPrice) : null,
    })
    .returning({ id: posts.id });

  return post;
}

/**
 * Admin hard-delete: removes the post row entirely (not a status change like
 * cancelPost below). `onDelete: "cascade"` on claim.postId and
 * message.claimId (lib/db/schema.ts) takes care of that post's claims and
 * every message in them -- no manual cleanup needed here. Used by
 * app/(site)/admin/actions.ts and the retention purge in lib/retention.ts;
 * callers are responsible for the admin check.
 */
export async function deletePost(postId: string) {
  await db.delete(posts).where(eq(posts.id, postId));
}

/** Author cancels their own post any time before it's FILLED. */
export async function cancelPost(authorId: string, postId: string) {
  return db.transaction(async (tx) => {
    const post = await tx.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) throw new Error("Post not found.");
    if (post.authorId !== authorId) throw new Error("Forbidden.");
    if (post.status === "FILLED" || post.status === "CANCELLED") {
      throw new Error("This post can no longer be cancelled.");
    }

    const declined = await tx
      .update(claims)
      .set({ status: "DECLINED", respondedAt: new Date() })
      .where(and(eq(claims.postId, postId), eq(claims.status, "PROPOSED")))
      .returning({ claimantId: claims.claimantId });

    await tx.update(posts).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(posts.id, postId));

    return { autoDeclinedClaimantIds: declined.map((d) => d.claimantId) };
  });
}

/**
 * OPEN/PENDING posts whose ride time passed more than a day ago -- nobody
 * ever got confirmed to drive them, so auto-cancel rather than let them
 * linger forever. Declines any still-PROPOSED claims the same way
 * cancelPost above does. Used by the daily cron
 * (app/api/cron/purge-old-data); the caller does the notify/email fan-out
 * for each returned post, mirroring cancelPostAction.
 */
export async function autoCancelStalePosts() {
  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

  const stale = await db.query.posts.findMany({
    where: and(inArray(posts.status, ["OPEN", "PENDING"]), lt(posts.departAt, cutoff)),
    columns: { id: true, authorId: true, origin: true, destination: true },
  });

  const results: Array<{
    postId: string;
    authorId: string;
    origin: string;
    destination: string;
    declinedClaimantIds: string[];
  }> = [];

  for (const post of stale) {
    const declinedClaimantIds = await db.transaction(async (tx) => {
      const declined = await tx
        .update(claims)
        .set({ status: "DECLINED", respondedAt: new Date() })
        .where(and(eq(claims.postId, post.id), eq(claims.status, "PROPOSED")))
        .returning({ claimantId: claims.claimantId });

      await tx.update(posts).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(posts.id, post.id));

      return declined.map((d) => d.claimantId);
    });

    results.push({
      postId: post.id,
      authorId: post.authorId,
      origin: post.origin,
      destination: post.destination,
      declinedClaimantIds,
    });
  }

  return results;
}
