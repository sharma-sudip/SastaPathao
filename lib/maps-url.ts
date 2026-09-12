type MapPoint = { label: string; lat?: number | null; lng?: number | null };

/**
 * A Google Maps "get directions" URL between two points. Uses coordinates
 * when available (precise, no geocoding ambiguity) and falls back to the
 * free-text label otherwise -- Google Maps geocodes that itself. Plain
 * https://www.google.com/maps/... links like this are what opens the native
 * Google Maps app on iOS/Android (via universal/app links) when it's
 * installed, falling back to the browser/web version otherwise -- no
 * user-agent sniffing or app-specific URL scheme needed.
 */
export function directionsUrl(origin: MapPoint, destination: MapPoint): string {
  const point = (p: MapPoint) => (p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : p.label);
  const params = new URLSearchParams({
    api: "1",
    origin: point(origin),
    destination: point(destination),
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
