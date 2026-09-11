"use client";

import dynamic from "next/dynamic";

const PostMap = dynamic(() => import("@/components/post-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[260px] items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function PostMapSection(props: React.ComponentProps<typeof PostMap>) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <PostMap {...props} />
    </div>
  );
}
