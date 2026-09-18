// A rough, non-authoritative suggested asking price -- $1.25/mile (informal
// gas-money rate, not a real fare calculation), preferably against the
// *real driving distance* from the Directions API (lib/directions.ts) once
// that's available, since straight-line distance under-quotes almost every
// real route (a river, a lake, one-way streets -- driving is basically
// always longer). straightLineMiles/suggestedPriceCents below are still
// used as an instant, no-network preview the moment both pins are set on
// the post form, then replaced in place by suggestedPriceCentsForMeters
// (real distance) once the same Directions call that draws the route line
// resolves a moment later -- see components/dual-location-map.tsx and
// post-form.tsx's `priceTouched` guard, which stops either from clobbering
// a price the user already typed themselves.
// Rounded to the nearest dollar. Purely a starting point for the
// asking-price field on the post form; always editable, and posting with
// no price at all is fine too.
const RATE_PER_MILE_CENTS = 125;

// $5 floor on any price in the app -- the suggested heuristic, a post's
// asking price, and a claim's offer/counter all share this (lib/validation.ts
// enforces it on the latter two).
export const MIN_PRICE_DOLLARS = 5;
const MIN_SUGGESTION_CENTS = MIN_PRICE_DOLLARS * 100;

const EARTH_RADIUS_MILES = 3958.8;
const METERS_PER_MILE = 1609.34;

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

/** Suggested asking price, in cents, for a trip of this many miles. */
export function suggestedPriceCentsForMiles(miles: number): number {
  const raw = Math.round(miles * RATE_PER_MILE_CENTS);
  // Round to the nearest whole dollar -- a suggestion like "$8" reads better
  // than "$7.63".
  const rounded = Math.round(raw / 100) * 100;
  return Math.max(MIN_SUGGESTION_CENTS, rounded);
}

/** Same, from a real driving distance in meters (Directions API's units). */
export function suggestedPriceCentsForMeters(meters: number): number {
  return suggestedPriceCentsForMiles(meters / METERS_PER_MILE);
}

/** Straight-line instant preview -- see the file-level comment above for why this exists alongside the meters-based version. */
export function suggestedPriceCents(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): number {
  return suggestedPriceCentsForMiles(straightLineMiles(origin, destination));
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
