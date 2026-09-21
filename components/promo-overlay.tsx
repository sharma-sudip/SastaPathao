"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

// Bumping this key (rather than reusing one forever) is how to make the
// overlay reappear for everyone after a future promo change -- localStorage
// only remembers "seen" per browser, so this is a per-viewer convenience,
// not a record of anything that needs to persist reliably or be shared.
//
// Currently showing the exam-week "3 rides = a free ride" poster
// (public/promo-exam-week.png) in place of the Guins Barber Shop promo --
// swap the <Image> below and bump this key again when that changes.
const SEEN_KEY = "promo_examweek_v1_dismissed";

// Full-page promo, shown once per browser on the home page -- dismissed
// with the X (no backdrop-click dismiss, so it can't be closed by
// accident) and then remembered via localStorage so returning visitors
// aren't shown it again.
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
      aria-label="Exam week promo"
      className="animate-fade-in fixed inset-0 z-[2000] flex flex-col items-center overflow-y-auto bg-black py-8"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close"
        className="fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
      >
        <X className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl">
        <Image
          src="/promo-exam-week.png"
          alt="Exams stressing you up? 3 rides gets you a free ride to exams or Mill Creek."
          width={1024}
          height={1536}
          priority
          className="h-auto w-full"
        />
      </div>

      <button
        type="button"
        onClick={dismiss}
        className="mt-6 rounded-full bg-white px-8 py-3 text-sm font-black uppercase tracking-wide text-black shadow-sm transition hover:opacity-90"
      >
        Let&apos;s ride
      </button>
    </div>
  );
}
