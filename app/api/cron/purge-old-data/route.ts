import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { autoCancelStalePosts } from "@/lib/posts";
import { autoCompleteStaleFilledPosts } from "@/lib/coupons";
import { purgeOldPosts } from "@/lib/retention";
import { sendEmailSafely, EMAIL_FROM } from "@/lib/resend";
import { notifyUser } from "@/lib/notify";
import { generateQrDataUrl } from "@/lib/qr";
import { PostExpiredEmail } from "@/emails/post-expired-email";
import { ClaimDeclinedEmail } from "@/emails/claim-declined-email";
import { CouponEarnedEmail } from "@/emails/coupon-earned-email";

function siteUrl(path: string) {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

async function emailFor(userId: string) {
  const [row] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.email ?? null;
}

// Hit daily by Vercel Cron (vercel.json). Gated on CRON_SECRET -- Vercel
// signs its own cron requests with `Authorization: Bearer $CRON_SECRET`
// automatically once that env var is set, so this also blocks the route
// from being triggered by anyone who just finds the URL. In local dev,
// where CRON_SECRET typically isn't set, the check is skipped so this stays
// easy to hit by hand for testing.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Order matters: settle yesterday's stale OPEN/PENDING and FILLED posts
  // into a final status *before* the 30-day purge below, which deletes
  // rows outright regardless of status -- doing it the other way around
  // wouldn't lose correctness (a post more than 30 days old is stale by
  // either measure), but "settle, then eventually purge" is the more
  // obviously correct order to read.
  const cancelled = await autoCancelStalePosts();
  for (const post of cancelled) {
    const url = siteUrl(`/posts/${post.postId}`);
    await notifyUser(post.authorId, {
      title: "Your ride request expired",
      body: `${post.origin} → ${post.destination}`,
      url,
    });
    const authorEmail = await emailFor(post.authorId);
    if (authorEmail) {
      await sendEmailSafely({
        from: EMAIL_FROM,
        to: authorEmail,
        subject: "Your ride request expired",
        react: PostExpiredEmail({ postUrl: url, origin: post.origin, destination: post.destination }),
      });
    }

    for (const claimantId of post.declinedClaimantIds) {
      await notifyUser(claimantId, {
        title: "A ride you claimed expired",
        body: `${post.origin} → ${post.destination}`,
        url,
      });
      const claimantEmail = await emailFor(claimantId);
      if (claimantEmail) {
        await sendEmailSafely({
          from: EMAIL_FROM,
          to: claimantEmail,
          subject: "A ride you claimed expired",
          react: ClaimDeclinedEmail({ postUrl: url, origin: post.origin, destination: post.destination }),
        });
      }
    }
  }

  const completed = await autoCompleteStaleFilledPosts();
  for (const post of completed) {
    const redeemUrl = siteUrl(`/coupons/${post.couponCode}`);
    await notifyUser(post.riderId, {
      title: "You earned $5 off 💈",
      body: `Completed: ${post.origin} → ${post.destination}`,
      url: redeemUrl,
    });
    const riderEmail = await emailFor(post.riderId);
    if (riderEmail) {
      const qrDataUrl = await generateQrDataUrl(redeemUrl);
      await sendEmailSafely({
        from: EMAIL_FROM,
        to: riderEmail,
        subject: "You earned a $5 coupon",
        react: CouponEarnedEmail({
          origin: post.origin,
          destination: post.destination,
          redeemUrl,
          qrDataUrl,
          couponCode: post.couponCode,
        }),
      });
    }
  }

  const { deletedCount } = await purgeOldPosts();

  return NextResponse.json({
    ok: true,
    expiredCount: cancelled.length,
    autoCompletedCount: completed.length,
    deletedCount,
  });
}
