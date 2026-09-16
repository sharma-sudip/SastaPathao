import { Compass } from "lucide-react";
import type { OpenPost } from "@/lib/db/queries";
import { PostCard } from "@/components/post-card";

export function FeedView({ posts }: { posts: OpenPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <Compass className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.75} />
        <p className="mt-3 text-muted-foreground">
          No open ride requests right now.{" "}
          <a href="/requests/new" className="font-bold text-primary underline underline-offset-2">
            Post one
          </a>{" "}
          if you need a lift.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post, i) => (
        <div key={post.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
          <PostCard post={post} />
        </div>
      ))}
    </div>
  );
}
