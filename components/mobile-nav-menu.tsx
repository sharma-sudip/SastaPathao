"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINK_CLASS = "block px-4 py-2.5 text-sm font-semibold text-card-foreground transition hover:bg-muted";

// The desktop nav shows "Need a ride" / "Offer a ride" / "Profile" inline
// (they're just hidden below `sm` there via `hidden sm:inline-block`) --
// "Need a ride"/"Offer a ride" are also reachable via <MobileTabBar>, but
// Profile isn't reachable at all below `sm` without this. Kept as its own
// client component since <Nav> itself is an async server component and this
// needs local open/close state.
export function MobileNavMenu({ isSignedIn }: { isSignedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
            <Link href="/account" onClick={() => setOpen(false)} className={LINK_CLASS}>
              Profile
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
