// A rough, non-authoritative suggested asking price -- $1.50/mile (informal
// gas-money rate, not a real fare calculation) against the straight-line
// distance between two points, since this app has no driving-directions API
// (deliberately -- see git history on why Google's Maps JS SDK was dropped).
// A flat +$2 cushion above the bare $/mile number, rounded to the nearest
// dollar, keeps the suggestion from reading as a bare minimum. Purely a
// starting point for the asking-price field on the post form; always
// editable, and posting with no price at all is fine too.
const RATE_PER_MILE_CENTS = 150;
const CUSHION_CENTS = 200;

// $5 floor on any price in the app -- the suggested heuristic, a post's
// asking price, and a claim's offer/counter all share this (lib/validation.ts
// enforces it on the latter two).
export const MIN_PRICE_DOLLARS = 5;
const MIN_SUGGESTION_CENTS = MIN_PRICE_DOLLARS * 100;

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Great-circle (haversine) distance in miles -- as-the-crow-flies, not driving distance. */
export function straightLineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

/** Suggested asking price, in cents, for a trip between two points. */
export function suggestedPriceCents(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): number {
  const miles = straightLineMiles(origin, destination);
  const raw = Math.round(miles * RATE_PER_MILE_CENTS) + CUSHION_CENTS;
  // Round to the nearest whole dollar -- a suggestion like "$8" reads better
  // than "$7.63".
  const rounded = Math.round(raw / 100) * 100;
  return Math.max(MIN_SUGGESTION_CENTS, rounded);
}

// Whole dollars only, everywhere -- no need for cent-level precision on an
// informal, suggested/negotiated number.
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars) * 100;
}

export function formatCents(cents: number): string {
  return Math.round(cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
