// Shared so post-card.tsx and posts/[id]/page.tsx don't drift -- both
// render on the server, where `.toLocaleString()` without an explicit
// `timeZone` uses the *server's* zone (Vercel runs in UTC), not the
// visitor's, silently showing every ride time hours off from what its
// poster meant. Hardcoded to Eastern rather than each viewer's own zone
// since this app is scoped to one region (Youngstown, OH) -- a poster
// typing "3pm" means Eastern regardless of who's looking at it.
const TIME_ZONE = "America/New_York";

export function formatDepartAt(date: Date | string, style: "short" | "long" = "short") {
  return new Date(date).toLocaleString(undefined, {
    timeZone: TIME_ZONE,
    weekday: style,
    month: style,
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
