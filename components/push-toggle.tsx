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

type Status = "unsupported" | "loading" | "off" | "on" | "denied";

// Lives on the account page. Web Push needs a registered service worker
// (public/sw.js) plus an explicit browser permission grant -- this handles
// both, and syncs the subscription to the server via push-actions.ts.
export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");

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
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;

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
  }

  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await unsubscribeFromPushAction(sub.endpoint);
      await sub.unsubscribe();
    }
    setStatus("off");
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
    </div>
  );
}
