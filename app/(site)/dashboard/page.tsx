import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserPosts, getUserClaims } from "@/lib/db/queries";

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-accent/15 text-accent",
  PENDING: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  FILLED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "bg-muted text-muted-foreground",
  PROPOSED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  CONFIRMED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  DECLINED: "bg-muted text-muted-foreground",
  WITHDRAWN: "bg-muted text-muted-foreground",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  const [myPosts, myClaims] = await Promise.all([
    getUserPosts(session.user.id),
    getUserClaims(session.user.id),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My rides</h1>
        <p className="text-muted-foreground">Posts you&apos;ve made and rides you&apos;ve claimed.</p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          My posts
        </h2>
        {myPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven&apos;t posted a request or offer yet.</p>
        ) : (
          <div className="space-y-2">
            {myPosts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-primary"
              >
                <span className="text-sm text-card-foreground">
                  {post.origin} → {post.destination}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[post.status]}`}>
                  {post.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          My claims
        </h2>
        {myClaims.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven&apos;t claimed a ride yet.</p>
        ) : (
          <div className="space-y-2">
            {myClaims.map((claim) => (
              <Link
                key={claim.id}
                href={`/posts/${claim.post.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-primary"
              >
                <span className="text-sm text-card-foreground">
                  {claim.post.origin} → {claim.post.destination}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[claim.status]}`}>
                  {claim.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
