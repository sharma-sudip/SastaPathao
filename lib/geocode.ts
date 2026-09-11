import "server-only";

// Server-side geocoding. Defaults to Photon (komoot's free, OSM-based
// geocoder) -- no API key/account needed, this is Photon's public instance,
// so treat it like the Nominatim setup this replaced: no guaranteed
// uptime/SLA, but fine for this app's traffic, and the client debounces
// input.
//
// GOOGLE_MAPS_API_KEY (optional): a side-by-side comparison against
// Google's Places Autocomplete + Geocoding, since their quality is
// noticeably better than Photon's. This is meant to stay a *local-only*
// evaluation, never set on Vercel/production:
//   - It's a Google Maps "Demo Key" (mapsplatform.google.com/maps-demo-key)
//     -- free, no credit card, but Google's own docs say it's daily-capped
//     and "not suitable for production applications."
//   - A real (billing-enabled) key would work here too, but switching
//     production over is a deliberate decision to make separately, not
//     something that should happen just by an env var existing locally.
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const PHOTON_BASE = "https://photon.komoot.io";

// Youngstown, OH -- biases (doesn't restrict) results toward the Mahoning
// Valley, for both providers.
const BIAS_LAT = 41.0998;
const BIAS_LON = -80.648;

export type GeocodeResult = {
  displayName: string;
  lat: number;
  lon: number;
};

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];
  return GOOGLE_API_KEY ? searchAddressGoogle(query) : searchAddressPhoton(query);
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  return GOOGLE_API_KEY ? reverseGeocodeGoogle(lat, lon) : reverseGeocodePhoton(lat, lon);
}

// ---------------------------------------------------------------------------
// Photon
// ---------------------------------------------------------------------------

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

function formatPhotonFeature(f: PhotonFeature): string {
  const p = f.properties;
  const line1 = [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || "";
  const line2 = [p.city, p.state].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(", ") || p.name || "Unknown location";
}

async function searchAddressPhoton(query: string): Promise<GeocodeResult[]> {
  const url = new URL(`${PHOTON_BASE}/api/`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  url.searchParams.set("lat", String(BIAS_LAT));
  url.searchParams.set("lon", String(BIAS_LON));
  url.searchParams.set("zoom", "10");

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? []).map((f) => ({
    displayName: formatPhotonFeature(f),
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
  }));
}

async function reverseGeocodePhoton(lat: number, lon: number): Promise<string | null> {
  const url = new URL(`${PHOTON_BASE}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as { features?: PhotonFeature[] };
  const feature = data.features?.[0];
  return feature ? formatPhotonFeature(feature) : null;
}

// ---------------------------------------------------------------------------
// Google (evaluation only -- see GOOGLE_API_KEY comment above)
// ---------------------------------------------------------------------------

async function searchAddressGoogle(query: string): Promise<GeocodeResult[]> {
  const suggestRes = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_API_KEY! },
    body: JSON.stringify({
      input: query,
      locationBias: { circle: { center: { latitude: BIAS_LAT, longitude: BIAS_LON }, radius: 30_000 } },
    }),
  });
  if (!suggestRes.ok) return [];

  const suggestData = (await suggestRes.json()) as {
    suggestions?: Array<{ placePrediction?: { placeId: string; text?: { text: string } } }>;
  };
  const predictions = (suggestData.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is { placeId: string; text?: { text: string } } => !!p)
    .slice(0, 5);

  // Autocomplete predictions don't carry coordinates -- Places (New) splits
  // that into a separate Place Details call per result, same two-step shape
  // as most autocomplete APIs (incl. Google's own JS SDK). Fetched eagerly
  // here (rather than only for whichever one gets picked) to keep
  // <LocationPicker> provider-agnostic for this comparison; not how this
  // would be built if Google were the permanent choice.
  const results = await Promise.all(
    predictions.map(async (p): Promise<GeocodeResult | null> => {
      const detailRes = await fetch(
        `https://places.googleapis.com/v1/places/${p.placeId}?fields=location,formattedAddress&key=${GOOGLE_API_KEY}`
      );
      if (!detailRes.ok) return null;
      const detail = (await detailRes.json()) as {
        location?: { latitude: number; longitude: number };
        formattedAddress?: string;
      };
      if (!detail.location) return null;
      return {
        displayName: detail.formattedAddress ?? p.text?.text ?? "Unknown location",
        lat: detail.location.latitude,
        lon: detail.location.longitude,
      };
    })
  );
  return results.filter((r): r is GeocodeResult => r !== null);
}

async function reverseGeocodeGoogle(lat: number, lon: number): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as { results?: Array<{ formatted_address: string }> };
  return data.results?.[0]?.formatted_address ?? null;
}
