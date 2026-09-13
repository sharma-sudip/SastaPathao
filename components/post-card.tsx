import Link from "next/link";
import { Hand } from "lucide-react";
import type { OpenPost } from "@/lib/db/queries";
import { formatDepartAt } from "@/lib/format-date";
import { formatCents } from "@/lib/pricing";
import { Avatar } from "@/components/avatar";

export function PostCard({ post }: { post: OpenPost }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-glow"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent">
          <Hand className="h-3.5 w-3.5" strokeWidth={2.5} />
          Needs a ride
        </span>
        <span className="text-xs font-medium text-muted-foreground">{formatDepartAt(post.departAt)}</span>
      </div>

      <div className="mt-2 flex items-start justify-between gap-2">
        <p className="text-base font-bold text-card-foreground">
          {post.origin} <span className="text-muted-foreground">→</span> {post.destination}
        </p>
        {post.askingPriceCents != null && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
            {formatCents(post.askingPriceCents)}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Avatar src={post.author?.image} name={post.author?.name} />
          {post.author?.name ?? "A neighbor"}
        </span>
        {post.status === "PENDING" && (
          <span className="font-bold text-amber-600 dark:text-amber-400">Pending match</span>
        )}
      </div>
    </Link>
  );
}
