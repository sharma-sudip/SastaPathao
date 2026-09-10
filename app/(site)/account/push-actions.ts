"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";

export async function subscribeToPushAction(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in.");

  await db
    .insert(pushSubscriptions)
    .values({
      userId: session.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    // Re-subscribing the same browser (e.g. after clearing permission and
    // re-enabling) reuses the same endpoint -- keep the existing row as-is
    // rather than erroring on the unique constraint.
    .onConflictDoNothing({ target: pushSubscriptions.endpoint });
}

export async function unsubscribeFromPushAction(endpoint: string) {
  const session = await auth();
  if (!session?.user) return;

  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, session.user.id), eq(pushSubscriptions.endpoint, endpoint)));
}
