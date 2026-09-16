// $5 floor on any price in the app -- a post's asking price and a claim's
// offer/counter all share this (lib/validation.ts enforces it on all of
// them). There used to also be a distance-based suggested-price heuristic
// here, computed from origin/destination coordinates -- removed along with
// the map/geocoding feature (see git history), since pricing is now purely
// a manual, optional entry.
export const MIN_PRICE_DOLLARS = 5;

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
