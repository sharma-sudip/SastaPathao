import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export type NotificationPayload = { title: string; body: string; url?: string };

export async function createNotification(userId: string, payload: NotificationPayload) {
  await db.insert(notifications).values({
    userId,
    title: payload.title,
    body: payload.body,
    url: payload.url ?? null,
  });
}

/** Most recent notifications for the bell dropdown, newest first. */
export async function getNotificationsForUser(userId: string, limit = 20) {
  return db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: desc(notifications.createdAt),
    limit,
  });
}

export async function getUnreadCount(userId: string) {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return rows.length;
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}
