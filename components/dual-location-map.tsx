"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { ensureDefaultMarkerIcon } from "@/lib/leaflet-icon-fix";

const YOUNGSTOWN: LatLng = { lat: 41.0998, lng: -80.6495 };

type LatLng = { lat: number; lng: number };

// Colored teardrop pins (black = pickup, blue = destination, matching this
// app's accent) via an inline SVG divIcon -- Leaflet's own default marker
// (lib/leaflet-icon-fix.ts) is a single fixed image, no built-in way to
// recolor it, and this avoids pulling in another icon asset pack for what's
// just two flat colors.
function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<svg width="25" height="34" viewBox="0 0 25 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 21.5 12.5 21.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}"/>
      <circle cx="12.5" cy="12.5" r="5" fill="#fff"/>
    </svg>`,
    iconSize: [25, 34],
    iconAnchor: [12.5, 34],
  });
}

const ORIGIN_ICON = pinIcon("#000000");
const DESTINATION_ICON = pinIcon("#276ef1");

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// One shared map for both pickup and destination while creating a post
// (post-form.tsx), instead of each field rendering its own separate map.
// Fits both pins in view once both are set; otherwise centers/follows
// whichever one is. react-leaflet's <MapContainer center/zoom> props only
// apply on first render -- this imperatively re-centers the real Leaflet map
// instance whenever the picked coordinates change.
function FitToPoints({ origin, destination }: { origin: LatLng | null; destination: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (origin && destination) {
      const bounds = L.latLngBounds([origin.lat, origin.lng], [destination.lat, destination.lng]);
      map.fitBounds(bounds, { padding: [56, 56] });
    } else if (origin || destination) {
      const point = (origin ?? destination)!;
      map.setView([point.lat, point.lng], Math.max(map.getZoom(), 14), { animate: true });
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
  useEffect(() => {
    ensureDefaultMarkerIcon();
  }, []);

  return (
    <MapContainer center={origin ?? destination ?? YOUNGSTOWN} zoom={11} style={{ height: "280px", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      <FitToPoints origin={origin} destination={destination} />
      {origin && <Marker position={origin} icon={ORIGIN_ICON} title="Pickup" />}
      {destination && <Marker position={destination} icon={DESTINATION_ICON} title="Destination" />}
    </MapContainer>
  );
}
