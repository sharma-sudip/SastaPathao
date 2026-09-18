"use client";

import dynamic from "next/dynamic";
import { Navigation } from "lucide-react";

const PostMap = dynamic(() => import("@/components/post-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-lg border border-border bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

type Point = { lat: number; lng: number; label: string };
type Route = { polyline: string; distanceMeters: number; durationSeconds: number };

function formatMiles(meters: number) {
  const miles = meters / 1609.34;
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

// Post detail page's map -- origin/destination pins plus the actual driving
// route between them. `route` is fetched server-side by the page itself
// (lib/directions.ts's getDrivingRoute, via app/(site)/posts/[id]/page.tsx)
// rather than by this component -- the page also needs that same distance
// for its driver-offer price suggestion (lib/pricing.ts's
// suggestedPriceCentsForMeters), so fetching it once there and passing it
// down avoids two separate Directions API calls for the same page load.
// null just means no route (missing coordinates, or the Directions call
// failed/found nothing) -- shows the pins with no line/caption either way,
// never blocks the rest of the page.
export function PostMapSection({
  origin,
  destination,
  route,
}: {
  origin: Point;
  destination: Point | null;
  route: Route | null;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-border">
        <PostMap origin={origin} destination={destination} routePolyline={route?.polyline} />
      </div>
      {route && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Navigation className="h-3.5 w-3.5" strokeWidth={2.5} />
          {formatMiles(route.distanceMeters)} · {formatDuration(route.durationSeconds)} drive
        </p>
      )}
    </div>
  );
}
