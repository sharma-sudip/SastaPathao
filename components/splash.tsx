import Link from "next/link";
import { Hand, Car, ArrowRight } from "lucide-react";

const CHOICES = [
  {
    href: "/requests/new",
    icon: Hand,
    title: "Need a ride?",
    body: "Post where you're headed",
    entrance: "animate-slide-in-left",
    panel: "bg-[#0b0c0a] text-white",
    cta: "text-[#8fd424]",
  },
  {
    href: "/board",
    icon: Car,
    title: "Offer a ride?",
    body: "Browse who's looking",
    entrance: "animate-slide-in-right",
    panel: "bg-gradient-primary text-primary-foreground",
    cta: "text-[#0b0c0a]",
  },
] as const;

// The entire first screen: no nav, no footer, no board -- just the two
// choices, full-bleed, slamming in from opposite edges. Everything else
// (browsing, signing in) is one tap away on the next screen; see
// app/page.tsx and app/(site)/layout.tsx for how this is kept isolated from
// the rest of the app's chrome.
export function Splash() {
  return (
    <section className="relative flex min-h-dvh w-full flex-col overflow-hidden sm:flex-row">
      <span
        className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 text-xs font-bold uppercase tracking-[0.3em] text-white sm:top-8 sm:text-sm"
        style={{ mixBlendMode: "difference" }}
      >
        Sasta Pathao
      </span>

      {CHOICES.map(({ href, icon: Icon, title, body, entrance, panel, cta }) => (
        <Link
          key={href}
          href={href}
          className={`group relative flex flex-1 basis-1/2 items-center justify-center overflow-hidden px-8 py-20 ${entrance} ${panel}`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08), transparent 60%)" }}
          />

          <div className="relative flex flex-col items-center text-center transition-transform duration-300 ease-out group-hover:scale-[1.03]">
            <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-current/20 bg-white/10 backdrop-blur-sm">
              <Icon className="h-8 w-8" strokeWidth={2.25} />
            </span>
            <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              {title}
            </h1>
            <p className="mt-3 text-sm font-semibold uppercase tracking-wide opacity-70 sm:text-base">{body}</p>
            <span
              className={`mt-6 inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-wide transition-transform duration-300 group-hover:translate-x-1 ${cta}`}
            >
              Let&apos;s go
              <ArrowRight className="h-4 w-4" strokeWidth={3} />
            </span>
          </div>
        </Link>
      ))}

      <div
        aria-hidden
        className="animate-badge-pulse pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-background bg-card text-xs font-black uppercase tracking-wide text-foreground shadow-glow-lg"
      >
        or
      </div>
    </section>
  );
}
