import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, claims, users } from "@/lib/db/schema";

// Data Access Layer for reads. Every function here uses explicit column
// selection. Only two of them ever list `users.phone`: getUserProfile below
// (a user reading their own row -- no leak risk) and
// lib/contacts.ts::revealContactIfAuthorized (revealing *another* user's
// phone, gated on active-claim authorization). Every other query here must
// keep leaving `phone` out. See CLAUDE.md / the project plan for the full
// rationale.

const AUTHOR_COLUMNS = { id: true, name: true } as const;
const CLAIM_COLUMNS = {
  id: true,
  status: true,
  message: true,
  claimantId: true,
  createdAt: true,
  respondedAt: true,
} as const;
const CLAIMANT_COLUMNS = { id: true, name: true } as const;

/** Feed: open/pending posts, soonest departure first. Public -- no auth. */
export async function getOpenPosts() {
  return db.query.posts.findMany({
    where: inArray(posts.status, ["OPEN", "PENDING"]),
    orderBy: (p, { asc }) => [asc(p.departAt)],
    with: {
      author: { columns: AUTHOR_COLUMNS },
      claims: { columns: CLAIM_COLUMNS },
    },
  });
}

export type OpenPost = Awaited<ReturnType<typeof getOpenPosts>>[number];
export type PostDetail = NonNullable<Awaited<ReturnType<typeof getPostById>>>;

/** Single post with its author and full claim list. Public -- no auth. */
export async function getPostById(id: string) {
  return db.query.posts.findFirst({
    where: eq(posts.id, id),
    with: {
      author: { columns: AUTHOR_COLUMNS },
      claims: {
        columns: CLAIM_COLUMNS,
        orderBy: (c, { asc }) => [asc(c.createdAt)],
        with: { claimant: { columns: CLAIMANT_COLUMNS } },
      },
    },
  });
}

/** Posts authored by a given user, newest first. */
export async function getUserPosts(userId: string) {
  return db.query.posts.findMany({
    where: eq(posts.authorId, userId),
    orderBy: desc(posts.createdAt),
    with: {
      claims: {
        columns: CLAIM_COLUMNS,
        with: { claimant: { columns: CLAIMANT_COLUMNS } },
      },
    },
  });
}

/** Claims a given user has made on other people's posts, newest first. */
export async function getUserClaims(userId: string) {
  return db.query.claims.findMany({
    where: eq(claims.claimantId, userId),
    orderBy: desc(claims.createdAt),
    columns: CLAIM_COLUMNS,
    with: {
      post: { with: { author: { columns: AUTHOR_COLUMNS } } },
    },
  });
}

/**
 * A user reading their OWN name/phone (for the account page, and to gate
 * onboarding) -- distinct from lib/contacts.ts's revealContactIfAuthorized,
 * which is about showing one user's contact info to a *different*,
 * specifically-authorized viewer. Self-reads carry none of that risk.
 */
export async function getUserProfile(userId: string) {
  const [row] = await db
    .select({ name: users.name, phone: users.phone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

export function isProfileComplete(profile: { name: string | null; phone: string | null } | null) {
  return !!profile?.name?.trim() && !!profile?.phone?.trim();
}

export async function getActiveClaimForUser(postId: string, userId: string) {
  return db.query.claims.findFirst({
    where: and(
      eq(claims.postId, postId),
      eq(claims.claimantId, userId),
      inArray(claims.status, ["PROPOSED", "CONFIRMED"])
    ),
  });
}
