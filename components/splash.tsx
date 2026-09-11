import Link from "next/link";
import { Hand, Car, ArrowRight } from "lucide-react";

// Uber blue -- used as the one accent color on top of the black/white split,
// same hex regardless of site theme since this screen deliberately ignores
// the light/dark toggle (see comment below on the two panels).
const ACCENT = "#276ef1";

const CHOICES = [
  {
    href: "/requests/new",
    icon: Hand,
    title: "Need a ride?",
    body: "Post where you're headed",
    entrance: "animate-slide-in-left",
    panel: "bg-black text-white",
    iconBox: "border-white/20 bg-white/10",
    hoverGlow: "rgba(255,255,255,0.08)",
  },
  {
    href: "/board",
    icon: Car,
    title: "Offer a ride?",
    body: "Browse who's looking",
    entrance: "animate-slide-in-right",
    panel: "bg-white text-black",
    iconBox: "border-black/10 bg-black/5",
    hoverGlow: "rgba(0,0,0,0.05)",
  },
] as const;

// The entire first screen: no nav, no footer, no board -- just the two
// choices, full-bleed, slamming in from opposite edges. Everything else
// (browsing, signing in) is one tap away on the next screen; see
// app/page.tsx and app/(site)/layout.tsx for how this is kept isolated from
// the rest of the app's chrome.
//
// Panels are hardcoded black/white rather than theme tokens -- this is
// meant to read as a fixed brand statement (mirrors Uber's own
// black-and-white rider/driver duality) regardless of whether the visitor
// has light/dark mode on, same reasoning as the brand wordmark below using
// mix-blend-difference instead of a themed color.
export function Splash() {
  return (
    <section className="relative flex min-h-dvh w-full flex-col overflow-hidden sm:flex-row">
      <span
        className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 text-xs font-bold uppercase tracking-[0.3em] text-white sm:top-8 sm:text-sm"
        style={{ mixBlendMode: "difference" }}
      >
        Sasta Pathao
      </span>

      {CHOICES.map(({ href, icon: Icon, title, body, entrance, panel, iconBox, hoverGlow }) => (
        <Link
          key={href}
          href={href}
          className={`group relative flex flex-1 basis-1/2 items-center justify-center overflow-hidden px-8 py-20 ${entrance} ${panel}`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: `radial-gradient(circle at 50% 50%, ${hoverGlow}, transparent 60%)` }}
          />

          <div className="relative flex flex-col items-center text-center transition-transform duration-300 ease-out group-hover:scale-[1.03]">
            <span className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 ${iconBox}`}>
              <Icon className="h-8 w-8" strokeWidth={2.25} />
            </span>
            <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              {title}
            </h1>
            <p className="mt-3 text-sm font-semibold uppercase tracking-wide opacity-70 sm:text-base">{body}</p>
            <span
              style={{ color: ACCENT }}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-wide transition-transform duration-300 group-hover:translate-x-1"
            >
              Let&apos;s go
              <ArrowRight className="h-4 w-4" strokeWidth={3} />
            </span>
          </div>
        </Link>
      ))}

      <div
        aria-hidden
        className="animate-badge-pulse pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-black bg-white text-xs font-black uppercase tracking-wide text-black shadow-lg"
      >
        or
      </div>
    </section>
  );
}
