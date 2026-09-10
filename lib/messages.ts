import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { claims, messages } from "@/lib/db/schema";

const ACTIVE = ["PROPOSED", "CONFIRMED"] as const;

/**
 * Same authorization boundary as contact reveal (lib/contacts.ts): only the
 * post's author or that specific claimant can see/send in a claim's thread --
 * never other claimants competing on the same post.
 */
async function authorizeThread(claimId: string, viewerId: string) {
  const claim = await db.query.claims.findFirst({
    where: eq(claims.id, claimId),
    columns: { id: true, postId: true, claimantId: true, status: true },
    with: { post: { columns: { authorId: true } } },
  });
  if (!claim) return null;
  const isParty = claim.claimantId === viewerId || claim.post.authorId === viewerId;
  return isParty ? claim : null;
}

export async function getMessagesForClaim(claimId: string, viewerId: string) {
  const claim = await authorizeThread(claimId, viewerId);
  if (!claim) return null;

  return db.query.messages.findMany({
    where: eq(messages.claimId, claimId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
    columns: { id: true, senderId: true, body: true, createdAt: true },
  });
}

export async function sendMessage(claimId: string, senderId: string, body: string) {
  const claim = await authorizeThread(claimId, senderId);
  if (!claim) throw new Error("Forbidden.");
  if (!ACTIVE.includes(claim.status as (typeof ACTIVE)[number])) {
    throw new Error("This claim is no longer active.");
  }

  const [message] = await db
    .insert(messages)
    .values({ claimId, senderId, body })
    .returning({ id: messages.id, senderId: messages.senderId, body: messages.body, createdAt: messages.createdAt });

  const recipientId = senderId === claim.claimantId ? claim.post.authorId : claim.claimantId;
  return { ...message, recipientId, postId: claim.postId };
}
