"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Map, Marker, InfoWindow } from "@vis.gl/react-google-maps";
import type { OpenPost } from "@/lib/db/queries";
import { formatDepartAt } from "@/lib/format-date";

const DEFAULT_CENTER = { lat: 41.0998, lng: -80.648 };

// Board's map view (components/feed-view.tsx's List/Map toggle) -- one pin
// per open post that actually has coordinates (a post typed without ever
// touching the address picker just doesn't show up here; the List view
// still has it). Default export for next/dynamic's `ssr: false` import
// there.
export default function FeedMap({ posts }: { posts: OpenPost[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  const pinned = posts.filter(
    (p): p is OpenPost & { originLat: number; originLng: number } => p.originLat != null && p.originLng != null
  );

  return (
    <Map
      style={{ width: "100%", height: "500px" }}
      defaultCenter={DEFAULT_CENTER}
      defaultZoom={10}
      colorScheme={resolvedTheme === "dark" ? "DARK" : "LIGHT"}
      gestureHandling="greedy"
    >
      {pinned.map((post) => (
        <Marker
          key={post.id}
          position={{ lat: post.originLat, lng: post.originLng }}
          title={`${post.origin} → ${post.destination}`}
          onClick={() => setOpenId(post.id)}
        />
      ))}
      {openId &&
        (() => {
          const post = pinned.find((p) => p.id === openId);
          if (!post) return null;
          return (
            <InfoWindow position={{ lat: post.originLat, lng: post.originLng }} onClose={() => setOpenId(null)}>
              <div className="max-w-[220px] space-y-1 text-sm">
                <p className="font-semibold text-card-foreground">
                  {post.origin} → {post.destination}
                </p>
                <p className="text-muted-foreground">{formatDepartAt(post.departAt)}</p>
                <button
                  type="button"
                  onClick={() => router.push(`/posts/${post.id}`)}
                  className="font-bold text-primary underline underline-offset-2"
                >
                  View post
                </button>
              </div>
            </InfoWindow>
          );
        })()}
    </Map>
  );
}
