"use client";

import { useState } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default function PostMap({
  origin,
  destination,
}: {
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string } | null;
}) {
  const [open, setOpen] = useState<"origin" | "destination" | null>(null);

  const center = destination
    ? { lat: (origin.lat + destination.lat) / 2, lng: (origin.lng + destination.lng) / 2 }
    : { lat: origin.lat, lng: origin.lng };

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        style={{ height: "260px", width: "100%" }}
        defaultCenter={center}
        defaultZoom={destination ? 11 : 13}
        mapId="DEMO_MAP_ID"
        gestureHandling="greedy"
      >
        <AdvancedMarker position={origin} onClick={() => setOpen("origin")} />
        {open === "origin" && (
          <InfoWindow position={origin} onCloseClick={() => setOpen(null)}>
            Pickup: {origin.label}
          </InfoWindow>
        )}
        {destination && (
          <>
            <AdvancedMarker position={destination} onClick={() => setOpen("destination")} />
            {open === "destination" && (
              <InfoWindow position={destination} onCloseClick={() => setOpen(null)}>
                Destination: {destination.label}
              </InfoWindow>
            )}
          </>
        )}
      </Map>
    </APIProvider>
  );
}
