"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { subscribeToPushAction, unsubscribeFromPushAction } from "@/app/(site)/account/push-actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Brave's own feature-detection API (not a user-agent guess) -- the same
// pushManager.subscribe() AbortError shows up on plain Chrome too, for
// unrelated reasons (an ad blocker/privacy extension, a managed device
// policy, a network blocking Google's push endpoints), so Brave-specific
// guidance would be actively wrong there.
async function isBrave(): Promise<boolean> {
  const nav = navigator as Navigator & { brave?: { isBrave: () => Promise<boolean> } };
  try {
    return nav.brave ? await nav.brave.isBrave() : false;
  } catch {
    return false;
  }
}

type Status = "unsupported" | "loading" | "off" | "on" | "denied";

// Lives on the account page. Web Push needs a registered service worker
// (public/sw.js) plus an explicit browser permission grant -- this handles
// both, and syncs the subscription to the server via push-actions.ts.
export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (!cancelled) setStatus(sub ? "on" : "off");
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setError(null);
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      // Previously a silent no-op -- clicking "Turn on" did nothing at all,
      // with no feedback, if this env var wasn't set on the server.
      setError("Notifications aren't configured on this server yet.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      if (json.endpoint && json.keys?.p256dh && json.keys.auth) {
        await subscribeToPushAction({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        });
      }
      setStatus("on");
    } catch (err) {
      // Same silent-no-op problem as the missing key above -- any failure
      // here (bad key format, the browser rejecting the subscription, etc.)
      // used to leave the button looking like it just didn't respond.
      console.error("Failed to enable push notifications:", err);

      if (err instanceof DOMException && err.name === "AbortError") {
        // Every Chromium browser relies on a push service (Google's, by
        // default) for pushManager.subscribe() to work at all -- this
        // AbortError means it's blocked, but *why* differs by browser:
        // Brave disables it for privacy by default (its own toggle to
        // re-enable it); on plain Chrome the same error usually means an ad
        // blocker/privacy extension, a managed device policy, or a network
        // blocking Google's push endpoints. Detecting Brave properly (its
        // own feature-detection API, not a guess) avoids sending a Chrome
        // user to a settings page that doesn't exist there.
        if (await isBrave()) {
          setError(
            'Push service blocked by Brave. Settings → Privacy and security → enable "Use Google services for push messaging", then try again.'
          );
        } else {
          setError(
            "Push service blocked -- check for an ad blocker/privacy extension, a managed-device policy, or a network blocking Google's push service, then try again."
          );
        }
      } else {
        setError("Couldn't turn on notifications -- please try again.");
      }
    }
  }

  async function disable() {
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch (err) {
      console.error("Failed to disable push notifications:", err);
      setError("Couldn't turn off notifications -- please try again.");
    }
  }

  if (status === "loading") return null;

  if (status === "unsupported") {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-bold text-card-foreground">Browser notifications</p>
        <p className="text-xs text-muted-foreground">
          Not supported by this browser. Some mobile browsers (e.g. Samsung Internet) don&apos;t
          support push notifications yet — try Chrome instead.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-card-foreground">Browser notifications</p>
          <p className="text-xs text-muted-foreground">
            {status === "denied"
              ? "Blocked in your browser settings — re-allow notifications for this site to turn it on."
              : "Get notified here (new claims, messages, matches) even when the tab's closed."}
          </p>
        </div>
        {status !== "denied" && (
          <button
            type="button"
            onClick={status === "on" ? disable : enable}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              status === "on"
                ? "border border-border text-foreground hover:bg-muted"
                : "bg-gradient-primary text-primary-foreground shadow-sm hover:shadow-glow"
            }`}
          >
            {status === "on" ? (
              <BellOff className="h-3.5 w-3.5" strokeWidth={2.5} />
            ) : (
              <Bell className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            {status === "on" ? "Turn off" : "Turn on"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
