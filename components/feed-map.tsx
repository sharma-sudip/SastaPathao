"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import Link from "next/link";
import { ensureDefaultMarkerIcon } from "@/lib/leaflet-icon-fix";
import type { OpenPost } from "@/lib/db/queries";

// Youngstown, OH -- default map center when no posts have coordinates yet.
const YOUNGSTOWN: [number, number] = [41.0998, -80.6495];

export default function FeedMap({ posts }: { posts: OpenPost[] }) {
  useEffect(() => {
    ensureDefaultMarkerIcon();
  }, []);

  const pinned = posts.filter(
    (p): p is OpenPost & { originLat: number; originLng: number } =>
      p.originLat != null && p.originLng != null
  );

  const center: [number, number] = pinned.length
    ? [pinned[0].originLat, pinned[0].originLng]
    : YOUNGSTOWN;

  return (
    <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: "500px", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pinned.map((post) => (
        <Marker key={post.id} position={[post.originLat, post.originLng]}>
          <Popup>
            <p className="font-medium">
              {post.origin} → {post.destination}
            </p>
            <Link href={`/posts/${post.id}`} className="text-primary underline">
              View details
            </Link>
          </Popup>
        </Marker>
      ))}
      {pinned.length === 0 && (
        <Marker position={YOUNGSTOWN}>
          <Popup>No pinned rides yet.</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
