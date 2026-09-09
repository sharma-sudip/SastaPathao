import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, claims } from "@/lib/db/schema";

// Data Access Layer for reads. Every function here uses explicit column
// selection and never lists `users.phone` -- there is no default-select path
// that could leak it. The one place phone numbers are readable is
// lib/contacts.ts::revealContactIfAuthorized. See CLAUDE.md / the project
// plan for the full rationale.

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

export async function getActiveClaimForUser(postId: string, userId: string) {
  return db.query.claims.findFirst({
    where: and(
      eq(claims.postId, postId),
      eq(claims.claimantId, userId),
      inArray(claims.status, ["PROPOSED", "CONFIRMED"])
    ),
  });
}
