"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { Map, Marker, Polyline, useMap } from "@vis.gl/react-google-maps";

type Point = { lat: number; lng: number; label: string };

// Read-only map for a single post (post-map-section.tsx) -- origin/
// destination pins, plus the driving route between them if one was fetched
// (lib/directions.ts, via /api/geocode/directions). Default export for
// next/dynamic's `ssr: false` import there.
export default function PostMap({
  origin,
  destination,
  routePolyline,
}: {
  origin: Point;
  destination: Point | null;
  /** Google's encoded polyline format, straight from the Directions API --
   *  <Polyline> decodes it itself, no client-side geometry library needed. */
  routePolyline?: string | null;
}) {
  const map = useMap("post-map");
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!map) return;
    if (destination) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(origin);
      bounds.extend(destination);
      map.fitBounds(bounds, 48);
    } else {
      map.setCenter(origin);
      map.setZoom(13);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, origin.lat, origin.lng, destination?.lat, destination?.lng]);

  return (
    <Map
      id="post-map"
      style={{ width: "100%", height: "280px" }}
      defaultCenter={origin}
      defaultZoom={13}
      colorScheme={resolvedTheme === "dark" ? "DARK" : "LIGHT"}
      gestureHandling="greedy"
    >
      <Marker position={origin} title={origin.label} label="A" />
      {destination && <Marker position={destination} title={destination.label} label="B" />}
      {routePolyline && <Polyline encodedPath={routePolyline} strokeColor="#276ef1" strokeOpacity={0.8} strokeWeight={4} />}
    </Map>
  );
}
