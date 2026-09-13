"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { ensureDefaultMarkerIcon } from "@/lib/leaflet-icon-fix";

export default function PostMap({
  origin,
  destination,
}: {
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string } | null;
}) {
  useEffect(() => {
    ensureDefaultMarkerIcon();
  }, []);

  const points: [number, number][] = destination
    ? [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ]
    : [[origin.lat, origin.lng]];

  const center = points[0];

  return (
    <MapContainer center={center} zoom={destination ? 11 : 13} style={{ height: "260px", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[origin.lat, origin.lng]}>
        <Popup>Pickup: {origin.label}</Popup>
      </Marker>
      {destination && (
        <Marker position={[destination.lat, destination.lng]}>
          <Popup>Destination: {destination.label}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
