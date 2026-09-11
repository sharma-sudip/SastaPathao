"use client";

import { useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

const YOUNGSTOWN = { lat: 41.0998, lng: -80.6495 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// <Map defaultCenter/defaultZoom> only applies on first mount -- it doesn't
// pan the already-mounted map when `value` changes later (e.g. picking a
// search result). Without this, the marker moves in the data but the
// visible map never follows it, which is what made location picking look
// broken. This imperatively re-centers the real Google Map instance
// whenever the picked point changes.
function RecenterOnChange({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo({ lat, lng });
    if ((map.getZoom() ?? 0) < 14) map.setZoom(14);
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
  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        style={{ height: "240px", width: "100%" }}
        defaultCenter={YOUNGSTOWN}
        defaultZoom={11}
        mapId="DEMO_MAP_ID"
        gestureHandling="greedy"
        onClick={(e) => {
          if (e.detail.latLng) onPick(e.detail.latLng.lat, e.detail.latLng.lng);
        }}
      >
        {value && (
          <>
            <RecenterOnChange lat={value.lat} lng={value.lng} />
            <AdvancedMarker position={value} />
          </>
        )}
      </Map>
    </APIProvider>
  );
}
