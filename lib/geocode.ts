import "server-only";

// Thin server-side Nominatim (OpenStreetMap) client. Kept server-only because
// Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/)
// requires a descriptive User-Agent identifying the application -- something a
// browser fetch() cannot set (it's a forbidden header client-side). The two
// route handlers under app/api/geocode/ proxy through this so the
// <LocationPicker> client component never talks to Nominatim directly.
//
// Rate limit: Nominatim asks for max ~1 request/second from an application.
// The client debounces search-as-you-type input; at this app's expected
// traffic (a small regional community board) that's sufficient. If usage
// grows, revisit self-hosting Nominatim or a paid geocoder.

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "SastaPathao/1.0 (open-source carpool coordination tool)";

export type GeocodeResult = {
  displayName: string;
  lat: number;
  lon: number;
};

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  // Bias results toward the Mahoning Valley / Youngstown, OH area.
  url.searchParams.set("viewbox", "-80.85,41.20,-80.45,40.90");
  url.searchParams.set("bounded", "0");

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  return data.map((r) => ({
    displayName: r.display_name,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  }));
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "jsonv2");

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;

  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? null;
}
