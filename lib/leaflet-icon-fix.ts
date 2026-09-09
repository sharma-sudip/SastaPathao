"use client";

import L from "leaflet";

// Leaflet's default marker icon references image paths that don't survive a
// bundler by default. Point at the CDN copies matching our pinned leaflet
// version instead of wrestling with asset imports.
const DEFAULT_ICON = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

let patched = false;

export function ensureDefaultMarkerIcon() {
  if (patched) return;
  L.Marker.prototype.options.icon = DEFAULT_ICON;
  patched = true;
}
