import { Scooter } from "lucide-react";

const SIZES = {
  sm: { text: "text-lg", icon: "h-5 w-5" },
  lg: { text: "text-4xl sm:text-5xl", icon: "h-10 w-10 sm:h-12 sm:w-12" },
} as const;

// The brand mark used in the nav and the barber-partnership promo overlay --
// "Sasta" in whatever text color surrounds it, "Pathao" plus a scooter
// glyph in the brand red (reusing --danger as the wordmark's accent rather
// than introducing a second red token; see app/globals.css).
export function Logo({ size = "sm", className = "" }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-black italic leading-none tracking-tight ${s.text} ${className}`}
    >
      Sasta<span className="text-danger">Pathao</span>
      <Scooter className={`${s.icon} shrink-0 text-danger`} strokeWidth={2.5} />
    </span>
  );
}
