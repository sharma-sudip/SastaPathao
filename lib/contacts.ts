import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, claims, users } from "@/lib/db/schema";

/**
 * The ONLY function in the codebase allowed to select `users.phone`.
 *
 * Authorization runs first, as a separate query with no phone column in its
 * projection. Only if it succeeds does a second query select the phone --
 * an unauthorized caller gets `null` back without the phone column ever
 * being fetched from the database. Do not add `phone` to any other query;
 * route every contact-reveal need (the post-detail <ContactCard>, and the
 * claim-confirmed email) through this function instead.
 */
export async function revealContactIfAuthorized(
  postId: string,
  viewerId: string | undefined
): Promise<{ name: string | null; phone: string | null } | null> {
  if (!viewerId) return null;

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    columns: { id: true, authorId: true },
  });
  if (!post) return null;

  let targetUserId: string | null = null;

  if (post.authorId === viewerId) {
    // Viewer is the post's author: reveal the matched claimant's contact,
    // if there is a proposed/confirmed one.
    const activeClaim = await db.query.claims.findFirst({
      where: and(eq(claims.postId, postId), inArray(claims.status, ["PROPOSED", "CONFIRMED"])),
      columns: { claimantId: true },
    });
    targetUserId = activeClaim?.claimantId ?? null;
  } else {
    // Viewer might be the claimant: only reveal the author's contact if the
    // viewer has an active (proposed/confirmed) claim on this post.
    const ownClaim = await db.query.claims.findFirst({
      where: and(
        eq(claims.postId, postId),
        eq(claims.claimantId, viewerId),
        inArray(claims.status, ["PROPOSED", "CONFIRMED"])
      ),
      columns: { id: true },
    });
    targetUserId = ownClaim ? post.authorId : null;
  }

  if (!targetUserId) return null;

  const [contact] = await db
    .select({ name: users.name, phone: users.phone })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  return contact ?? null;
}
