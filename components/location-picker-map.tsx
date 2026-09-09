"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { ensureDefaultMarkerIcon } from "@/lib/leaflet-icon-fix";

const YOUNGSTOWN: [number, number] = [41.0998, -80.6495];

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// react-leaflet's <MapContainer center/zoom> props only apply on the very
// first render -- they don't pan the already-mounted map when `value`
// changes later (e.g. picking a search result). Without this, the marker
// moves in the data but the visible map never follows it, which is what
// made location picking look broken. This imperatively re-centers the real
// Leaflet map instance whenever the picked point changes.
function RecenterOnChange({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function LocationPickerMap({
  value,
  onPick,
}: {
  value: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
}) {
  useEffect(() => {
    ensureDefaultMarkerIcon();
  }, []);

  return (
    <MapContainer center={YOUNGSTOWN} zoom={11} style={{ height: "240px", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      {value && (
        <>
          <RecenterOnChange lat={value.lat} lng={value.lng} />
          <Marker position={[value.lat, value.lng]} />
        </>
      )}
    </MapContainer>
  );
}
