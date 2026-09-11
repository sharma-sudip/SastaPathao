"use client";

import { useState } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import Link from "next/link";
import type { OpenPost } from "@/lib/db/queries";

// Youngstown, OH -- default map center when no posts have coordinates yet.
const YOUNGSTOWN = { lat: 41.0998, lng: -80.6495 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default function FeedMap({ posts }: { posts: OpenPost[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const pinned = posts.filter(
    (p): p is OpenPost & { originLat: number; originLng: number } =>
      p.originLat != null && p.originLng != null
  );

  const center = pinned.length ? { lat: pinned[0].originLat, lng: pinned[0].originLng } : YOUNGSTOWN;
  const openPost = pinned.find((p) => p.id === openId);

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        style={{ height: "500px", width: "100%" }}
        defaultCenter={center}
        defaultZoom={11}
        mapId="DEMO_MAP_ID"
        gestureHandling="greedy"
      >
        {pinned.map((post) => (
          <AdvancedMarker
            key={post.id}
            position={{ lat: post.originLat, lng: post.originLng }}
            onClick={() => setOpenId(post.id)}
          />
        ))}
        {openPost && (
          <InfoWindow
            position={{ lat: openPost.originLat, lng: openPost.originLng }}
            onCloseClick={() => setOpenId(null)}
          >
            <p className="font-medium">
              {openPost.origin} → {openPost.destination}
            </p>
            <Link href={`/posts/${openPost.id}`} className="text-primary underline">
              View details
            </Link>
          </InfoWindow>
        )}
        {pinned.length === 0 && (
          <AdvancedMarker position={YOUNGSTOWN} onClick={() => setOpenId("none")} />
        )}
        {pinned.length === 0 && openId === "none" && (
          <InfoWindow position={YOUNGSTOWN} onCloseClick={() => setOpenId(null)}>
            No pinned rides yet.
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
