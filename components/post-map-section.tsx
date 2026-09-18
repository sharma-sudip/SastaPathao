"use client";

import { useEffect, useState } from "react";
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
// route between them, fetched from our own /api/geocode/directions (never
// calls Google directly from the browser -- see lib/directions.ts). Falls
// back to just the pins, no line/caption, if that fetch fails for any
// reason (key not set yet, no route found, network hiccup) -- never blocks
// the rest of the page.
export function PostMapSection({ origin, destination }: { origin: Point; destination: Point | null }) {
  const [route, setRoute] = useState<Route | null>(null);

  const destLat = destination?.lat;
  const destLng = destination?.lng;

  useEffect(() => {
    if (destLat == null || destLng == null) return;
    let cancelled = false;

    async function loadRoute() {
      try {
        const params = new URLSearchParams({
          originLat: String(origin.lat),
          originLng: String(origin.lng),
          destLat: String(destLat),
          destLng: String(destLng),
        });
        const res = await fetch(`/api/geocode/directions?${params}`);
        const data = await res.json();
        if (!cancelled) setRoute(data.route ?? null);
      } catch {
        if (!cancelled) setRoute(null);
      }
    }

    loadRoute();
    return () => {
      cancelled = true;
    };
  }, [origin.lat, origin.lng, destLat, destLng]);

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
