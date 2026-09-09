import { getOpenPosts } from "@/lib/db/queries";
import { FeedView } from "@/components/feed-view";

export default async function BoardPage() {
  const posts = await getOpenPosts();

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-foreground">Ride board</h1>
        <p className="text-sm text-muted-foreground">
          {posts.length} open ride{posts.length === 1 ? "" : "s"}
        </p>
      </div>
      <FeedView posts={posts} />
    </div>
  );
}
