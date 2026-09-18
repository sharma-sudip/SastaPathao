import "server-only";

// Server-side only, same GOOGLE_MAPS_API_KEY as lib/geocode.ts -- this is
// what draws the route line on the post detail page's map
// (components/post-map-section.tsx). Deliberately not used for the post
// form's price suggestion (lib/pricing.ts), which needs an instant,
// no-network straight-line estimate while someone's still typing, before a
// post (and any reason to call Directions) exists.
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export type RouteResult = {
  /** Google's encoded polyline format -- decoded client-side with
   *  `google.maps.geometry.encoding.decodePath` (the `geometry` library). */
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
};

export async function getDrivingRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteResult | null> {
  if (!GOOGLE_API_KEY) return null;

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    key: GOOGLE_API_KEY,
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    routes?: Array<{
      overview_polyline?: { points: string };
      legs?: Array<{ distance?: { value: number }; duration?: { value: number } }>;
    }>;
  };
  const route = data.routes?.[0];
  const leg = route?.legs?.[0];
  if (!route?.overview_polyline?.points || !leg?.distance || !leg?.duration) return null;

  return {
    polyline: route.overview_polyline.points,
    distanceMeters: leg.distance.value,
    durationSeconds: leg.duration.value,
  };
}
