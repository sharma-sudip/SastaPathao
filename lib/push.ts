import "server-only";

import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:noreply@sastapathao.dev", PUBLIC_KEY, PRIVATE_KEY);
}

type PushPayload = { title: string; body: string; url?: string };

/**
 * Best-effort, like sendEmailSafely -- never throws, so a push failure never
 * blocks the action that triggered it. Fans out to every device/browser the
 * user has enabled notifications on, and quietly forgets any subscription
 * the push service reports as gone (404/410 -- the browser unsubscribed,
 * uninstalled, etc.) instead of retrying it forever.
 */
export async function sendPushSafely(userId: string, payload: PushPayload) {
  if (!PUBLIC_KEY || !PRIVATE_KEY) return; // not configured -- skip silently

  try {
    const subs = await db.query.pushSubscriptions.findMany({ where: eq(pushSubscriptions.userId, userId) });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload)
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          } else {
            console.error("Push send failed:", err);
          }
        }
      })
    );
  } catch (err) {
    console.error("sendPushSafely failed:", err);
  }
}
