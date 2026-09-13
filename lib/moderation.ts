import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, posts, claims, sessions } from "@/lib/db/schema";

/**
 * Bans a user: marks the account, cancels their still-open posts, declines
 * their still-pending claims, and revokes any session they currently hold --
 * since sessions are database-backed (see auth.ts), that signs them out on
 * their very next request, the same mechanism signOut() itself uses. Future
 * sign-in is blocked separately, by the `signIn` callback in auth.ts checking
 * `bannedAt`.
 *
 * Used by the /admin page's ban action. lib/db/ban-user.ts is the CLI
 * equivalent for the same thing -- it can't import this, since it's a
 * standalone script and this pulls in lib/db (`server-only`, assumes a
 * running Next.js server).
 */
export async function banUser(userId: string, reason?: string | null) {
  await db.transaction(async (tx) => {
    await tx.update(users).set({ bannedAt: new Date(), banReason: reason ?? null }).where(eq(users.id, userId));

    await tx
      .update(posts)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(and(eq(posts.authorId, userId), inArray(posts.status, ["OPEN", "PENDING"])));

    await tx
      .update(claims)
      .set({ status: "DECLINED", respondedAt: new Date() })
      .where(and(eq(claims.claimantId, userId), eq(claims.status, "PROPOSED")));

    await tx.delete(sessions).where(eq(sessions.userId, userId));
  });
}

export async function unbanUser(userId: string) {
  await db.update(users).set({ bannedAt: null, banReason: null }).where(eq(users.id, userId));
}
