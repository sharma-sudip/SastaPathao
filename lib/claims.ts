import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, claims } from "@/lib/db/schema";

const ACTIVE = ["PROPOSED", "CONFIRMED"] as const;

/**
 * A driver volunteers to help with an open request. Multiple people can
 * volunteer on the same post at once (mirrors how this worked in the
 * WhatsApp group -- several people reply "I can take you," and the
 * requester picks one); confirming one automatically declines the rest.
 */
export async function createClaim(claimantId: string, postId: string, message: string | null) {
  return db.transaction(async (tx) => {
    const post = await tx.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: { claims: { columns: { status: true, claimantId: true } } },
    });
    if (!post) throw new Error("Post not found.");
    if (post.authorId === claimantId) throw new Error("You can't claim your own post.");
    if (post.status === "FILLED" || post.status === "CANCELLED") {
      throw new Error("This post is no longer open.");
    }

    const alreadyActive = post.claims.some(
      (c) => c.claimantId === claimantId && ACTIVE.includes(c.status as (typeof ACTIVE)[number])
    );
    if (alreadyActive) throw new Error("You already have an open claim on this post.");

    const [claim] = await tx
      .insert(claims)
      .values({ postId, claimantId, message: message || null })
      .returning({ id: claims.id });

    if (post.status === "OPEN") {
      await tx.update(posts).set({ status: "PENDING", updatedAt: new Date() }).where(eq(posts.id, postId));
    }

    return { claimId: claim.id, authorId: post.authorId };
  });
}

/** Claimant withdraws their own still-open claim. */
export async function withdrawClaim(claimantId: string, claimId: string) {
  return db.transaction(async (tx) => {
    const claim = await tx.query.claims.findFirst({ where: eq(claims.id, claimId) });
    if (!claim) throw new Error("Claim not found.");
    if (claim.claimantId !== claimantId) throw new Error("Forbidden.");
    if (claim.status !== "PROPOSED") throw new Error("This claim can no longer be withdrawn.");

    await tx.update(claims).set({ status: "WITHDRAWN", respondedAt: new Date() }).where(eq(claims.id, claimId));

    const post = await tx.query.posts.findFirst({ where: eq(posts.id, claim.postId) });
    if (post?.status === "PENDING") {
      const stillActive = await tx.query.claims.findFirst({
        where: and(eq(claims.postId, claim.postId), inArray(claims.status, [...ACTIVE])),
      });
      if (!stillActive) {
        await tx.update(posts).set({ status: "OPEN", updatedAt: new Date() }).where(eq(posts.id, claim.postId));
      }
    }

    return { postId: claim.postId, authorId: post?.authorId };
  });
}

/** Requester confirms a volunteer: fills the post and auto-declines every other pending claim. */
export async function confirmClaim(authorId: string, claimId: string) {
  return db.transaction(async (tx) => {
    const claim = await tx.query.claims.findFirst({ where: eq(claims.id, claimId) });
    if (!claim) throw new Error("Claim not found.");

    const post = await tx.query.posts.findFirst({
      where: eq(posts.id, claim.postId),
      with: { claims: { columns: { id: true, status: true } } },
    });
    if (!post) throw new Error("Post not found.");
    if (post.authorId !== authorId) throw new Error("Forbidden.");
    if (claim.status !== "PROPOSED") throw new Error("This claim is no longer pending.");

    await tx.update(claims).set({ status: "CONFIRMED", respondedAt: new Date() }).where(eq(claims.id, claimId));

    const otherProposedIds = post.claims.filter((c) => c.status === "PROPOSED" && c.id !== claimId).map((c) => c.id);

    let autoDeclinedClaimantIds: string[] = [];
    if (otherProposedIds.length > 0) {
      const declined = await tx
        .update(claims)
        .set({ status: "DECLINED", respondedAt: new Date() })
        .where(inArray(claims.id, otherProposedIds))
        .returning({ claimantId: claims.claimantId });
      autoDeclinedClaimantIds = declined.map((d) => d.claimantId);
    }

    await tx.update(posts).set({ status: "FILLED", updatedAt: new Date() }).where(eq(posts.id, post.id));

    return {
      postId: post.id,
      claimantId: claim.claimantId,
      autoDeclinedClaimantIds,
    };
  });
}

/** Requester declines a still-pending volunteer. */
export async function declineClaim(authorId: string, claimId: string) {
  return db.transaction(async (tx) => {
    const claim = await tx.query.claims.findFirst({ where: eq(claims.id, claimId) });
    if (!claim) throw new Error("Claim not found.");

    const post = await tx.query.posts.findFirst({ where: eq(posts.id, claim.postId) });
    if (!post) throw new Error("Post not found.");
    if (post.authorId !== authorId) throw new Error("Forbidden.");
    if (claim.status !== "PROPOSED") throw new Error("This claim is no longer pending.");

    await tx.update(claims).set({ status: "DECLINED", respondedAt: new Date() }).where(eq(claims.id, claimId));

    if (post?.status === "PENDING") {
      const stillActive = await tx.query.claims.findFirst({
        where: and(eq(claims.postId, claim.postId), inArray(claims.status, [...ACTIVE])),
      });
      if (!stillActive) {
        await tx.update(posts).set({ status: "OPEN", updatedAt: new Date() }).where(eq(posts.id, claim.postId));
      }
    }

    return { postId: claim.postId, claimantId: claim.claimantId };
  });
}
