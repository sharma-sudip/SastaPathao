import "server-only";

import { createNotification, type NotificationPayload } from "@/lib/notifications";
import { sendPushSafely } from "@/lib/push";

/**
 * The one call site every claim/message/post-lifecycle event should use for
 * "let this user know" -- writes the persistent in-app notification (what
 * the bell in Nav lists) and fans out a push notification, in parallel.
 * Both are already best-effort/non-throwing on their own; email for the
 * same event is still sent separately alongside this, since each event's
 * email uses its own React Email template rather than this generic payload.
 */
export async function notifyUser(userId: string, payload: NotificationPayload) {
  await Promise.all([
    createNotification(userId, payload).catch((err) => console.error("createNotification failed:", err)),
    sendPushSafely(userId, payload),
  ]);
}
