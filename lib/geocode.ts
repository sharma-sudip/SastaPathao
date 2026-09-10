import "server-only";

// Server-side Photon (komoot's free, OSM-based geocoder) client. No API key
// or account needed -- this is Photon's public instance, so treat it the
// same as the Nominatim setup this replaced: no guaranteed uptime/SLA, but
// fine for this app's traffic, and the client already debounces input.
//
// Swapped from Nominatim because its autocomplete-as-you-type quality was
// noticeably worse; Photon (also OSM-derived) is purpose-built for
// search-as-you-type with typo tolerance. Mapbox's Search Box API and
// Google's Geocoding API are both better still, but both now require a
// billing-enabled account with a card on file even to use their free
// tiers -- this app's whole design principle is no payment dependency
// anywhere, so Photon (genuinely free, no signup) is the fit.

const PHOTON_BASE = "https://photon.komoot.io";

export type GeocodeResult = {
  displayName: string;
  lat: number;
  lon: number;
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

function formatFeature(f: PhotonFeature): string {
  const p = f.properties;
  const line1 = [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || "";
  const line2 = [p.city, p.state].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(", ") || p.name || "Unknown location";
}

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];

  const url = new URL(`${PHOTON_BASE}/api/`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  // Bias (doesn't restrict) results toward the Mahoning Valley / Youngstown,
  // OH area -- matches the old Nominatim viewbox's intent.
  url.searchParams.set("lat", "41.0998");
  url.searchParams.set("lon", "-80.6480");
  url.searchParams.set("zoom", "10");

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? []).map((f) => ({
    displayName: formatFeature(f),
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
  }));
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const url = new URL(`${PHOTON_BASE}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as { features?: PhotonFeature[] };
  const feature = data.features?.[0];
  return feature ? formatFeature(feature) : null;
}
