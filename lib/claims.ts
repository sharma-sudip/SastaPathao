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
 *
 * `offerAmountCents` is optional -- a claim works exactly as it always did
 * if left out. When set, it's the opening number in a small negotiation
 * (see confirmClaim/counterOffer below): `offerBy: "claimant"` means it's
 * the author's turn to accept, decline, or counter it.
 */
export async function createClaim(
  claimantId: string,
  postId: string,
  message: string | null,
  offerAmountCents: number | null
) {
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
      .values({
        postId,
        claimantId,
        message: message || null,
        offerAmountCents,
        offerBy: offerAmountCents != null ? "claimant" : null,
      })
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

/**
 * Accepts whichever offer is currently on the table. For a claim with no
 * price attached (`offerBy` null), this is exactly the original
 * author-only "confirm a volunteer" action. Once a price is in play,
 * whoever *didn't* put the current number there is the one who can accept
 * it -- the other party already agreed to it by proposing it -- so this is
 * also how a claimant accepts the author's counter-offer.
 *
 * Either way: locks in offerAmountCents (if any) as the agreed price, fills
 * the post, and auto-declines every other pending claim.
 */
export async function confirmClaim(actingUserId: string, claimId: string) {
  return db.transaction(async (tx) => {
    const claim = await tx.query.claims.findFirst({ where: eq(claims.id, claimId) });
    if (!claim) throw new Error("Claim not found.");

    const post = await tx.query.posts.findFirst({
      where: eq(posts.id, claim.postId),
      with: { claims: { columns: { id: true, status: true } } },
    });
    if (!post) throw new Error("Post not found.");
    if (claim.status !== "PROPOSED") throw new Error("This claim is no longer pending.");

    const isAuthor = post.authorId === actingUserId;
    const isClaimant = claim.claimantId === actingUserId;

    if (claim.offerBy == null) {
      // No price was ever entered on this claim -- same as before pricing
      // existed, only the author can confirm it.
      if (!isAuthor) throw new Error("Forbidden.");
    } else {
      if (!isAuthor && !isClaimant) throw new Error("Forbidden.");
      if (isAuthor && claim.offerBy === "author") {
        throw new Error("Waiting on the other person to respond to your offer.");
      }
      if (isClaimant && claim.offerBy === "claimant") {
        throw new Error("Waiting on the other person to respond to your offer.");
      }
    }

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
      authorId: post.authorId,
      agreedPriceCents: claim.offerAmountCents,
      autoDeclinedClaimantIds,
    };
  });
}

/** Requester declines a still-pending volunteer -- regardless of whose turn it is. */
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

/**
 * Proposes a different amount than whatever's currently on the table.
 * Only the party who did *not* set the current number can do this -- the
 * other one already agreed to it by proposing it, so it's their turn.
 * Flips `offerBy` to whoever just countered and keeps the claim PROPOSED;
 * the other party can now accept (confirmClaim), decline, or counter back.
 * Also how either side attaches a price to a claim that started without
 * one (`offerBy` null accepts a counter from either role).
 */
export async function counterOffer(actingUserId: string, claimId: string, newAmountCents: number) {
  return db.transaction(async (tx) => {
    const claim = await tx.query.claims.findFirst({ where: eq(claims.id, claimId) });
    if (!claim) throw new Error("Claim not found.");
    if (claim.status !== "PROPOSED") throw new Error("This claim is no longer pending.");

    const post = await tx.query.posts.findFirst({ where: eq(posts.id, claim.postId) });
    if (!post) throw new Error("Post not found.");

    const isAuthor = post.authorId === actingUserId;
    const isClaimant = claim.claimantId === actingUserId;
    if (!isAuthor && !isClaimant) throw new Error("Forbidden.");
    if (isAuthor && claim.offerBy === "author") {
      throw new Error("Waiting on the other person to respond to your offer.");
    }
    if (isClaimant && claim.offerBy === "claimant") {
      throw new Error("Waiting on the other person to respond to your offer.");
    }

    await tx
      .update(claims)
      .set({ offerAmountCents: newAmountCents, offerBy: isAuthor ? "author" : "claimant" })
      .where(eq(claims.id, claimId));

    return {
      postId: claim.postId,
      authorId: post.authorId,
      claimantId: claim.claimantId,
      counteredByAuthor: isAuthor,
      amountCents: newAmountCents,
    };
  });
}
