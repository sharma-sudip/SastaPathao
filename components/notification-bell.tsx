"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { fetchNotificationsAction, markNotificationsReadAction } from "@/app/(site)/notifications/actions";
import { formatRelativeTime } from "@/lib/format-date";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: Date;
};

const POLL_MS = 20_000;

// In-app counterpart to the email/push a user already gets for the same
// events (see lib/notify.ts) -- polling, same lightweight approach as
// <ClaimChat>, no websocket/realtime service.
export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const result = await fetchNotificationsAction();
      if (!cancelled && result) {
        setItems(result.items);
        setUnreadCount(result.unreadCount);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      // Optimistic -- mark read locally right away rather than waiting on
      // the round trip, same as the rest of this app's action patterns.
      setUnreadCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      await markNotificationsReadAction();
    }
  }

  return (
    // No `relative` here on purpose -- the dropdown below anchors to <nav>
    // in components/nav.tsx (which has it) instead of to this button alone,
    // so `right-0` means the actual right edge of the header. Anchoring to
    // just this small wrapper put the panel's right edge whereever the bell
    // happens to sit, which on mobile (My rides / sign out / theme toggle
    // all to its right) pushed the panel's left side off-screen.
    <div ref={ref}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-5 w-5" strokeWidth={2.25} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              items.map((n) => {
                const body = (
                  <>
                    <p className="text-sm font-bold text-card-foreground">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(n.createdAt)}</p>
                  </>
                );
                const rowClass = `block border-b border-border px-4 py-3 last:border-0 ${
                  n.read ? "" : "bg-primary/5"
                }`;
                return n.url ? (
                  <Link key={n.id} href={n.url} onClick={() => setOpen(false)} className={`${rowClass} hover:bg-muted`}>
                    {body}
                  </Link>
                ) : (
                  <div key={n.id} className={rowClass}>
                    {body}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
