"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Map, Marker, Polyline, useMap } from "@vis.gl/react-google-maps";

type LatLng = { lat: number; lng: number };

// Youngstown, OH -- default center/zoom before either point is set, same
// bias point lib/geocode.ts uses for search.
const DEFAULT_CENTER: LatLng = { lat: 41.0998, lng: -80.648 };
const DEFAULT_ZOOM = 11;

// The post form's shared map: tapping it drops a pin for whichever of the
// two fields (pickup/destination) the poster last focused -- see
// post-form.tsx's `activeField` state, which owns which one `onPick`
// actually updates. Default export for next/dynamic's `ssr: false` import
// there (the Maps JavaScript API needs `window`).
export default function DualLocationMap({
  origin,
  destination,
  onPick,
  onRouteChange,
}: {
  origin: LatLng | null;
  destination: LatLng | null;
  onPick: (lat: number, lng: number) => void;
  /** Fires whenever the fetched route changes (including to null) -- lets
   *  post-form.tsx upgrade its instant straight-line price suggestion to
   *  one based on real driving distance once this resolves. */
  onRouteChange?: (route: { distanceMeters: number; durationSeconds: number } | null) => void;
}) {
  const map = useMap("dual-location-map");
  // Google's own dark map style, no CSS filter trick needed (that was a
  // Leaflet-tiles-are-raster-images workaround -- see git history).
  // resolvedTheme is undefined until next-themes mounts client-side, which
  // this component already only ever does (next/dynamic ssr:false above),
  // so there's no hydration-mismatch risk to guard against here.
  const { resolvedTheme } = useTheme();
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const originLat = origin?.lat;
  const originLng = origin?.lng;
  const destLat = destination?.lat;
  const destLng = destination?.lng;

  // Live route preview while picking, same Directions call the post detail
  // page makes for an already-saved post (post-map-section.tsx) -- fetched
  // here instead since this shared map is what's visible during creation.
  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      if (originLat == null || originLng == null || destLat == null || destLng == null) {
        if (!cancelled) {
          setRoutePolyline(null);
          onRouteChange?.(null);
        }
        return;
      }
      try {
        const params = new URLSearchParams({
          originLat: String(originLat),
          originLng: String(originLng),
          destLat: String(destLat),
          destLng: String(destLng),
        });
        const res = await fetch(`/api/geocode/directions?${params}`);
        const data = await res.json();
        if (!cancelled) {
          setRoutePolyline(data.route?.polyline ?? null);
          onRouteChange?.(
            data.route ? { distanceMeters: data.route.distanceMeters, durationSeconds: data.route.durationSeconds } : null
          );
        }
      } catch {
        if (!cancelled) {
          setRoutePolyline(null);
          onRouteChange?.(null);
        }
      }
    }

    loadRoute();
    return () => {
      cancelled = true;
    };
    // onRouteChange intentionally excluded -- this should only re-fetch when
    // the coordinates themselves change, not when the parent re-renders
    // with a new (but equivalent) callback reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originLat, originLng, destLat, destLng]);

  // Keep both pins in view once both are set; otherwise just pan to
  // whichever one exists yet. Runs whenever a coordinate actually changes,
  // not on every render.
  useEffect(() => {
    if (!map) return;
    if (origin && destination) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(origin);
      bounds.extend(destination);
      map.fitBounds(bounds, 48);
    } else if (origin) {
      map.panTo(origin);
    } else if (destination) {
      map.panTo(destination);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  return (
    <Map
      id="dual-location-map"
      style={{ width: "100%", height: "280px" }}
      defaultCenter={origin ?? destination ?? DEFAULT_CENTER}
      defaultZoom={DEFAULT_ZOOM}
      colorScheme={resolvedTheme === "dark" ? "DARK" : "LIGHT"}
      gestureHandling="greedy"
      disableDefaultUI={false}
      onClick={(e) => {
        if (e.detail.latLng) onPick(e.detail.latLng.lat, e.detail.latLng.lng);
      }}
    >
      {origin && <Marker position={origin} label="A" title="Pickup" />}
      {destination && <Marker position={destination} label="B" title="Destination" />}
      {routePolyline && <Polyline encodedPath={routePolyline} strokeColor="#276ef1" strokeOpacity={0.8} strokeWeight={4} />}
    </Map>
  );
}
