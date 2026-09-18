import "server-only";

import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, claims, coupons } from "@/lib/db/schema";

// Matches lib/posts.ts's STALE_HOURS -- see autoCompleteStaleFilledPosts
// below and autoCancelStalePosts there.
const STALE_HOURS = 24;

/**
 * Driver (the CONFIRMED claimant, not the rider) marks a FILLED ride
 * COMPLETED once it actually happened. That's what mints the rider's
 * coupon -- one per completed ride, for the post's author only (rider
 * earns it, not the driver -- per discussion).
 */
export async function completeRide(driverId: string, postId: string) {
  return db.transaction(async (tx) => {
    const post = await tx.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: { claims: { where: eq(claims.status, "CONFIRMED") } },
    });
    if (!post) throw new Error("Post not found.");
    if (post.status !== "FILLED") throw new Error("This ride isn't in a confirmed state.");

    const confirmedClaim = post.claims[0];
    if (!confirmedClaim || confirmedClaim.claimantId !== driverId) {
      throw new Error("Only the confirmed driver can mark this ride completed.");
    }
    // Light guard against marking a ride "done" before it was ever
    // scheduled to happen -- doesn't stop deliberate abuse, but rules out
    // marking a future-dated ride complete by mistake.
    if (new Date() < new Date(post.departAt)) {
      throw new Error("This ride hasn't happened yet.");
    }

    await tx.update(posts).set({ status: "COMPLETED", updatedAt: new Date() }).where(eq(posts.id, postId));

    const [coupon] = await tx
      .insert(coupons)
      .values({ postId, userId: post.authorId, code: crypto.randomUUID() })
      .returning({ id: coupons.id, code: coupons.code });

    return { riderId: post.authorId, couponCode: coupon.code };
  });
}

/**
 * FILLED posts whose ride time passed more than a day ago but the driver
 * never marked it completed -- auto-completes the same way completeRide
 * above does (mints the rider's coupon), rather than leaving it FILLED
 * forever and the rider's coupon in limbo. Used by the daily cron
 * (app/api/cron/purge-old-data); the caller does the notify/email fan-out
 * for each returned post, mirroring completeRideAction.
 */
export async function autoCompleteStaleFilledPosts() {
  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

  const stale = await db.query.posts.findMany({
    where: and(eq(posts.status, "FILLED"), lt(posts.departAt, cutoff)),
    columns: { id: true, authorId: true, origin: true, destination: true },
    with: { claims: { where: eq(claims.status, "CONFIRMED"), columns: { claimantId: true } } },
  });

  const results: Array<{
    postId: string;
    riderId: string;
    driverId: string;
    origin: string;
    destination: string;
    couponCode: string;
  }> = [];

  for (const post of stale) {
    const confirmedClaim = post.claims[0];
    // Shouldn't happen for a FILLED post -- confirmClaim always leaves
    // exactly one CONFIRMED claim behind -- but skip rather than throw if
    // the data's ever in a state that doesn't hold.
    if (!confirmedClaim) continue;

    const couponCode = await db.transaction(async (tx) => {
      await tx.update(posts).set({ status: "COMPLETED", updatedAt: new Date() }).where(eq(posts.id, post.id));

      const [coupon] = await tx
        .insert(coupons)
        .values({ postId: post.id, userId: post.authorId, code: crypto.randomUUID() })
        .returning({ code: coupons.code });

      return coupon.code;
    });

    results.push({
      postId: post.id,
      riderId: post.authorId,
      driverId: confirmedClaim.claimantId,
      origin: post.origin,
      destination: post.destination,
      couponCode,
    });
  }

  return results;
}

export async function getCouponByCode(code: string) {
  return db.query.coupons.findFirst({
    where: eq(coupons.code, code),
    with: {
      user: { columns: { id: true, name: true } },
      post: { columns: { origin: true, destination: true, departAt: true } },
    },
  });
}

/** Only the partner (checked by the caller) should ever reach this. */
export async function redeemCoupon(code: string, redeemedByUserId: string) {
  return db.transaction(async (tx) => {
    const coupon = await tx.query.coupons.findFirst({ where: eq(coupons.code, code) });
    if (!coupon) throw new Error("Coupon not found.");
    if (coupon.redeemed) throw new Error("Already redeemed.");

    await tx
      .update(coupons)
      .set({ redeemed: true, redeemedAt: new Date(), redeemedBy: redeemedByUserId })
      .where(eq(coupons.id, coupon.id));

    return { id: coupon.id };
  });
}

/** For the dashboard's "My coupons" list. */
export async function getUserCoupons(userId: string) {
  return db.query.coupons.findMany({
    where: eq(coupons.userId, userId),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
    with: { post: { columns: { origin: true, destination: true } } },
  });
}
