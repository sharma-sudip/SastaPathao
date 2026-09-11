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

/** Offset (in minutes, e.g. -240 for EDT) of `timeZone` at the instant `date` falls on. */
function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});

  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUTC - date.getTime()) / 60_000;
}

/**
 * A `<input type="datetime-local">` value (e.g. "2026-09-10T15:00") carries
 * no timezone -- `new Date(naive)` would interpret it using whichever
 * timezone the *parsing* environment happens to be in (Vercel: UTC), not
 * the Eastern time its poster meant, silently storing a timestamp hours off
 * from what they typed. This instead explicitly treats the naive string as
 * America/New_York wall-clock time (correctly handling the EST/EDT DST
 * boundary) and returns the real UTC instant.
 */
export function parseEasternDatetimeLocal(naive: string): Date {
  const utcGuess = new Date(`${naive}Z`); // parse the same digits, forced to UTC
  const offsetMinutes = timeZoneOffsetMinutes(utcGuess, TIME_ZONE);
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

const RELATIVE_DIVISIONS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** "5 minutes ago", "3 hours ago", etc. -- used by the notification bell. */
export function formatRelativeTime(date: Date | string): string {
  const diffSec = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  for (const [unit, secondsInUnit] of RELATIVE_DIVISIONS) {
    if (Math.abs(diffSec) >= secondsInUnit) {
      return rtf.format(Math.round(diffSec / secondsInUnit), unit);
    }
  }
  return rtf.format(diffSec, "second");
}
