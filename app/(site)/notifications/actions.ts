"use server";

import { auth } from "@/auth";
import { getNotificationsForUser, getUnreadCount, markAllRead } from "@/lib/notifications";

/** Polled by <NotificationBell>. Returns null for a signed-out viewer so the
 *  client can just stop polling rather than treat it as an error. */
export async function fetchNotificationsAction() {
  const session = await auth();
  if (!session?.user) return null;

  const [items, unreadCount] = await Promise.all([
    getNotificationsForUser(session.user.id),
    getUnreadCount(session.user.id),
  ]);
  return { items, unreadCount };
}

export async function markNotificationsReadAction() {
  const session = await auth();
  if (!session?.user) return;
  await markAllRead(session.user.id);
}
