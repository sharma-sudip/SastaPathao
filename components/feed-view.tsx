"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { List, MapIcon, Compass } from "lucide-react";
import type { OpenPost } from "@/lib/db/queries";
import { PostCard } from "@/components/post-card";

const FeedMap = dynamic(() => import("@/components/feed-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center rounded-xl border-2 border-border bg-card text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function FeedView({ posts }: { posts: OpenPost[] }) {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div>
      <div className="mb-4 inline-flex rounded-full border-2 border-border bg-card p-1">
        {(
          [
            { key: "list", label: "List", icon: List },
            { key: "map", label: "Map", icon: MapIcon },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition ${
              view === key
                ? "bg-gradient-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
            {label}
          </button>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-10 text-center">
          <Compass className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.75} />
          <p className="mt-3 text-muted-foreground">
            No open ride requests right now.{" "}
            <a href="/requests/new" className="font-bold text-primary underline underline-offset-2">
              Post one
            </a>{" "}
            if you need a lift.
          </p>
        </div>
      ) : view === "list" ? (
        <div className="space-y-3">
          {posts.map((post, i) => (
            <div key={post.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
              <PostCard post={post} />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border-2 border-border">
          <FeedMap posts={posts} />
        </div>
      )}
    </div>
  );
}
