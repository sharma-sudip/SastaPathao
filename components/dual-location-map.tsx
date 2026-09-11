"use client";

import { useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";

const YOUNGSTOWN = { lat: 41.0998, lng: -80.6495 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

type LatLng = { lat: number; lng: number };

// One shared map for both pickup and destination while creating a post
// (post-form.tsx), instead of each field rendering its own separate map.
// Fits both pins in view once both are set; otherwise centers/follows
// whichever one is.
function FitToPoints({ origin, destination }: { origin: LatLng | null; destination: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (origin && destination) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(origin);
      bounds.extend(destination);
      map.fitBounds(bounds, 56);
    } else if (origin || destination) {
      const point = (origin ?? destination)!;
      map.panTo(point);
      if ((map.getZoom() ?? 0) < 14) map.setZoom(14);
    }
    // Deliberately keyed on the coordinates, not the object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, map]);
  return null;
}

export default function DualLocationMap({
  origin,
  destination,
  onPick,
}: {
  origin: LatLng | null;
  destination: LatLng | null;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        style={{ height: "280px", width: "100%" }}
        defaultCenter={origin ?? destination ?? YOUNGSTOWN}
        defaultZoom={11}
        mapId="DEMO_MAP_ID"
        gestureHandling="greedy"
        onClick={(e) => {
          if (e.detail.latLng) onPick(e.detail.latLng.lat, e.detail.latLng.lng);
        }}
      >
        <FitToPoints origin={origin} destination={destination} />
        {origin && (
          <AdvancedMarker position={origin} title="Pickup">
            <Pin background="#000000" borderColor="#000000" glyphColor="#ffffff" />
          </AdvancedMarker>
        )}
        {destination && (
          <AdvancedMarker position={destination} title="Destination">
            <Pin background="#276ef1" borderColor="#1f58c4" glyphColor="#ffffff" />
          </AdvancedMarker>
        )}
      </Map>
    </APIProvider>
  );
}
