import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOpenPosts } from "@/lib/db/queries";
import { FeedView } from "@/components/feed-view";

export default async function BoardPage() {
  // Ride requests include origin/destination and departure time, so the
  // board is only visible signed in -- same gate as /requests/new and
  // /dashboard, not left open to anonymous browsing/crawling.
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/board");

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
