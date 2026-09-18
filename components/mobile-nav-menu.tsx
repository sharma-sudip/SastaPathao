"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Menu, X, Sun, Moon } from "lucide-react";

const LINK_CLASS = "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-card-foreground transition hover:bg-muted";

// The desktop nav shows "My rides" / "Need a ride" / "Offer a ride" /
// "Profile" / "Admin" / "Redeem" inline (they're just hidden below `sm`
// there via `hidden sm:inline-block`) -- "Need a ride"/"Offer a ride" are
// also reachable via <MobileTabBar>, but My rides/Profile/Admin/Redeem
// aren't reachable at all below `sm` without this. The theme toggle and
// full-text sign-out also collapse into here on mobile -- <Nav> keeps only
// the hamburger, notification bell, and an icon-only sign-out visible in
// the bar itself below `sm`. Kept as its own client component since <Nav>
// itself is an async server component and this needs local open/close
// state.
export function MobileNavMenu({
  isSignedIn,
  isAdmin = false,
  isPartner = false,
}: {
  isSignedIn: boolean;
  isAdmin?: boolean;
  isPartner?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition hover:bg-muted hover:text-foreground"
      >
        {open ? <X className="h-5 w-5" strokeWidth={2.5} /> : <Menu className="h-5 w-5" strokeWidth={2.5} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[1100] mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
          <Link href="/requests/new" onClick={() => setOpen(false)} className={LINK_CLASS}>
            Need a ride
          </Link>
          <Link href="/board" onClick={() => setOpen(false)} className={LINK_CLASS}>
            Offer a ride
          </Link>
          {isSignedIn && (
            <Link href="/dashboard" onClick={() => setOpen(false)} className={LINK_CLASS}>
              My rides
            </Link>
          )}
          {isSignedIn && (
            <Link href="/account" onClick={() => setOpen(false)} className={LINK_CLASS}>
              Profile
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} className={LINK_CLASS}>
              Admin
            </Link>
          )}
          {isPartner && (
            <Link href="/redeem" onClick={() => setOpen(false)} className={LINK_CLASS}>
              Redeem
            </Link>
          )}
          <button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className={LINK_CLASS}>
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" strokeWidth={2.25} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={2.25} />
            )}
            {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      )}
    </div>
  );
}
