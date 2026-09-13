import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { listUsersForAdmin, listPostsForAdmin } from "@/lib/db/queries";
import { formatRelativeTime } from "@/lib/format-date";
import { banAction, unbanAction } from "./actions";
import { DeletePostButton } from "./delete-post-button";

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

// Gated to ADMIN_EMAILS (lib/admin.ts) -- not found rather than a "you're
// not allowed" page, so this route doesn't advertise its own existence to
// anyone it isn't for.
export default async function AdminPage() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) notFound();

  const [allUsers, allPosts] = await Promise.all([listUsersForAdmin(), listPostsForAdmin()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Banning cancels that user&apos;s open posts, declines their pending claims, signs them out
          everywhere, and blocks them from signing back in.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Email</th>
              <th className="px-3 py-2 font-semibold">Joined</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-2 text-card-foreground">{u.name ?? "—"}</td>
                <td className="px-3 py-2 text-card-foreground">{u.email}</td>
                <td className="px-3 py-2 text-muted-foreground">{dateFormat.format(u.createdAt)}</td>
                <td className="px-3 py-2">
                  {u.bannedAt ? (
                    <span className="font-semibold text-danger">
                      Banned{u.banReason ? ` — ${u.banReason}` : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Active</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {u.bannedAt ? (
                    <form action={unbanAction.bind(null, u.id)}>
                      <button type="submit" className="font-semibold text-primary underline underline-offset-2">
                        Unban
                      </button>
                    </form>
                  ) : (
                    <form action={banAction.bind(null, u.id)} className="flex items-center gap-2">
                      <input
                        type="text"
                        name="reason"
                        placeholder="Reason (optional)"
                        className="w-36 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                      <button type="submit" className="font-semibold text-danger underline underline-offset-2">
                        Ban
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleting a post removes it and its claims/messages permanently -- posts also get purged
          automatically a month after their ride date (see lib/retention.ts).
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">Route</th>
              <th className="px-3 py-2 font-semibold">Requested by</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {allPosts.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-3 py-2 text-card-foreground">
                  {p.origin} → {p.destination}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  Requested by {p.author?.name ?? p.author?.email ?? "a neighbor"} ·{" "}
                  {formatRelativeTime(p.createdAt)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.status}</td>
                <td className="px-3 py-2">
                  <DeletePostButton postId={p.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
