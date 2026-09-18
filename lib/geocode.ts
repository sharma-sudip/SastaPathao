import "server-only";

// Server-side geocoding, Google-only on this branch (see CLAUDE.md) --
// unlike main, which defaults to the free Photon geocoder, this branch is
// specifically about running on a real, billing-enabled Google key for
// better address-level accuracy. GOOGLE_MAPS_API_KEY is server-only
// (never exposed to the browser); NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is a
// separate key used only to load the Maps JavaScript API's tiles
// client-side (components/google-maps-provider.tsx) -- keeping the two
// apart means the client-visible key never needs Places/Geocoding/
// Directions access at all, so a leaked page source can't run up billed
// API calls beyond map-tile loads.
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Youngstown, OH -- biases (doesn't restrict) results toward the Mahoning
// Valley.
const BIAS_LAT = 41.0998;
const BIAS_LON = -80.648;

export type GeocodeResult = {
  displayName: string;
  lat: number;
  lon: number;
};

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  if (!query.trim() || !GOOGLE_API_KEY) return [];

  const suggestRes = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_API_KEY },
    body: JSON.stringify({
      input: query,
      locationBias: { circle: { center: { latitude: BIAS_LAT, longitude: BIAS_LON }, radius: 30_000 } },
    }),
  });
  if (!suggestRes.ok) {
    console.error(`Places Autocomplete request failed: HTTP ${suggestRes.status}`, await suggestRes.text());
    return [];
  }

  const suggestData = (await suggestRes.json()) as {
    suggestions?: Array<{ placePrediction?: { placeId: string; text?: { text: string } } }>;
  };
  const predictions = (suggestData.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is { placeId: string; text?: { text: string } } => !!p)
    .slice(0, 5);

  // Autocomplete predictions don't carry coordinates -- Places (New) splits
  // that into a separate Place Details call per result. Fetched eagerly
  // here (rather than only for whichever one gets picked) so the picked
  // suggestion already has lat/lng with no second round trip -- this is
  // the main cost lever if usage ever gets high enough to matter, see
  // CLAUDE.md.
  const results = await Promise.all(
    predictions.map(async (p): Promise<GeocodeResult | null> => {
      const detailRes = await fetch(
        `https://places.googleapis.com/v1/places/${p.placeId}?fields=location,formattedAddress&key=${GOOGLE_API_KEY}`
      );
      if (!detailRes.ok) {
        console.error(`Place Details request failed: HTTP ${detailRes.status}`, await detailRes.text());
        return null;
      }
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

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  if (!GOOGLE_API_KEY) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Geocoding API request failed: HTTP ${res.status}`);
    return null;
  }

  // Same as lib/directions.ts's Directions API call -- this legacy JSON API
  // answers HTTP 200 even on failure, with the real result in `status`.
  const data = (await res.json()) as {
    status?: string;
    error_message?: string;
    results?: Array<{ formatted_address: string }>;
  };
  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(`Geocoding API returned ${data.status}${data.error_message ? `: ${data.error_message}` : ""}`);
    return null;
  }
  return data.results?.[0]?.formatted_address ?? null;
}
