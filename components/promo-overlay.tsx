"use client";

import { useEffect, useState } from "react";
import { Crown, Fuel, Scissors, Smile, X } from "lucide-react";
import { Logo } from "@/components/logo";

// Bumping this key (rather than reusing one forever) is how to make the
// overlay reappear for everyone after a future promo change -- localStorage
// only remembers "seen" per browser, so this is a per-viewer convenience,
// not a record of anything that needs to persist reliably or be shared.
const SEEN_KEY = "promo_barber_v1_dismissed";

const FEATURES = [
  { icon: Fuel, label: "Save on gas" },
  { icon: Scissors, label: "Get a fresh look" },
  { icon: Smile, label: "Ride smarter" },
] as const;

// Full-page promo for the Guins Barber Shop partnership, shown once per
// browser on the home page -- dismissed with the X (no backdrop-click
// dismiss, so it can't be closed by accident) and then remembered via
// localStorage so returning visitors aren't shown it again. See
// lib/coupons.ts for how the $5 coupon this advertises actually gets
// earned.
export function PromoOverlay() {
  const [open, setOpen] = useState(false);

  // localStorage is only known client-side -- this mirrors theme-toggle.tsx's
  // hydration-guard pattern (default to closed for a matching server/client
  // first paint, then flip once mounted) rather than an external-system
  // subscription, hence the lint escape hatch.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      // Storage blocked (private browsing, locked-down browser, etc.) --
      // just don't show the promo rather than risk it reappearing on every
      // load with no way to remember it was dismissed.
    }
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Best-effort; worst case it shows again next visit.
    }
  }

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Guins Barber Shop partnership offer"
      className="animate-fade-in fixed inset-0 z-[2000] overflow-y-auto bg-black text-white"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close"
        className="fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
      >
        <X className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <div className="mx-auto flex min-h-full max-w-lg flex-col items-center px-6 py-16 text-center sm:py-20">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Logo size="lg" />
          <span className="h-8 w-px bg-white/25" aria-hidden />
          <span className="flex flex-col items-start">
            <span className="flex items-center gap-1.5 text-lg font-bold uppercase tracking-wide sm:text-xl">
              <Crown className="h-4 w-4 text-[#e8b84b]" strokeWidth={2.25} />
              Guins Barber Shop
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Partnership</span>
          </span>
        </div>

        <h2 className="mt-10 text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
          Ride.
          <br />
          Save.
          <br />
          <span className="text-danger">Look good.</span>
        </h2>

        <p className="mt-5 max-w-sm text-sm text-white/70 sm:text-base">
          Get a ride with Sasta Pathao and earn a <strong className="text-white">$5 coupon</strong> for a haircut —
          or a facial (bring your own kit).
        </p>

        <div className="mt-8 rounded-2xl bg-danger px-8 py-4 text-center shadow-lg">
          <span className="block text-3xl font-black leading-none sm:text-4xl">$5</span>
          <span className="block text-xs font-bold uppercase tracking-wide">Coupon</span>
        </div>

        <div className="mt-10 flex w-full max-w-xs flex-col gap-3 text-left">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10">
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <span className="text-sm font-semibold uppercase tracking-wide">{label}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="mt-12 rounded-full bg-white px-8 py-3 text-sm font-black uppercase tracking-wide text-black shadow-sm transition hover:opacity-90"
        >
          Let&apos;s ride
        </button>

        <p className="mt-6 text-xs italic text-white/40">Same rides. A better you.</p>
      </div>
    </div>
  );
}
