"use client";

import { useState, useTransition } from "react";
import { Car, CarFront } from "lucide-react";
import { updateDriverOptInAction } from "@/app/(site)/account/driver-actions";

// Lives on the account page, next to <PushToggle>. Unlike push (which needs
// a browser permission grant + service worker), this is just a DB flag --
// no browser API involved, so no "unsupported"/"denied" states to handle.
export function DriverOptInToggle({ initialOptedIn }: { initialOptedIn: boolean }) {
  const [optedIn, setOptedIn] = useState(initialOptedIn);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !optedIn;
    setOptedIn(next); // optimistic -- reverted below if the save fails
    startTransition(async () => {
      try {
        await updateDriverOptInAction(next);
      } catch (err) {
        console.error("Failed to update driver opt-in:", err);
        setOptedIn(!next);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-card-foreground">Driver notifications</p>
          <p className="text-xs text-muted-foreground">
            Get emailed (and notified here) whenever anyone posts a new ride request — not just
            ones you&apos;ve claimed.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
            optedIn
              ? "border border-border text-foreground hover:bg-muted"
              : "bg-gradient-primary text-primary-foreground shadow-sm hover:shadow-glow"
          }`}
        >
          {optedIn ? <Car className="h-3.5 w-3.5" strokeWidth={2.5} /> : <CarFront className="h-3.5 w-3.5" strokeWidth={2.5} />}
          {optedIn ? "Turn off" : "Turn on"}
        </button>
      </div>
    </div>
  );
}
