import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, claims } from "@/lib/db/schema";
import type { PostFormValues } from "@/lib/validation";
import { parseEasternDatetimeLocal } from "@/lib/format-date";
import { dollarsToCents } from "@/lib/pricing";

export async function createPost(authorId: string, values: PostFormValues) {
  const [post] = await db
    .insert(posts)
    .values({
      authorId,
      origin: values.origin,
      destination: values.destination,
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
