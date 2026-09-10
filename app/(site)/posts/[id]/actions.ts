"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createClaim, withdrawClaim, confirmClaim, declineClaim } from "@/lib/claims";
import { cancelPost } from "@/lib/posts";
import { getPostById, getUserProfile, isProfileComplete } from "@/lib/db/queries";
import { revealContactIfAuthorized } from "@/lib/contacts";
import { getMessagesForClaim, sendMessage } from "@/lib/messages";
import { claimFormSchema, messageFormSchema } from "@/lib/validation";
import { sendEmailSafely, EMAIL_FROM } from "@/lib/resend";
import { sendPushSafely } from "@/lib/push";
import { NewClaimEmail } from "@/emails/new-claim-email";
import { ClaimConfirmedEmail } from "@/emails/claim-confirmed-email";
import { ClaimDeclinedEmail } from "@/emails/claim-declined-email";
import { ClaimWithdrawnEmail } from "@/emails/claim-withdrawn-email";
import { NewMessageEmail } from "@/emails/new-message-email";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function siteUrl(postId: string) {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/posts/${postId}`;
}

async function emailFor(userId: string) {
  const [row] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

export async function claimAction(postId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/posts/${postId}`);

  const profile = await getUserProfile(session.user.id);
  if (!isProfileComplete(profile)) redirect(`/account?callbackUrl=/posts/${postId}`);

  const parsed = claimFormSchema.safeParse({ postId, message: formData.get("message") ?? "" });
  if (!parsed.success) return;

  try {
    const { authorId } = await createClaim(session.user.id, postId, parsed.data.message || null);

    const post = await getPostById(postId);
    const author = await emailFor(authorId);
    if (post) {
      const url = await siteUrl(postId);
      if (author?.email) {
        await sendEmailSafely({
          from: EMAIL_FROM,
          to: author.email,
          subject: "Someone wants to fill your ride",
          react: NewClaimEmail({
            postUrl: url,
            origin: post.origin,
            destination: post.destination,
            claimantName: session.user.name ?? null,
          }),
        });
      }
      await sendPushSafely(authorId, {
        title: "Someone wants to fill your ride",
        body: `${session.user.name ?? "A neighbor"} offered for ${post.origin} → ${post.destination}`,
        url,
      });
    }
  } catch (err) {
    console.error("claimAction failed:", err);
  }

  revalidatePath(`/posts/${postId}`);
  revalidatePath("/");
}

export async function withdrawAction(claimId: string, postId: string) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/posts/${postId}`);

  try {
    const result = await withdrawClaim(session.user.id, claimId);
    const post = await getPostById(postId);
    if (post && result.authorId) {
      const url = await siteUrl(postId);
      const authorContact = await emailFor(result.authorId);
      if (authorContact?.email) {
        await sendEmailSafely({
          from: EMAIL_FROM,
          to: authorContact.email,
          subject: "A volunteer backed out",
          react: ClaimWithdrawnEmail({ postUrl: url, origin: post.origin, destination: post.destination }),
        });
      }
      await sendPushSafely(result.authorId, {
        title: "A volunteer backed out",
        body: `${post.origin} → ${post.destination} is back open`,
        url,
      });
    }
  } catch (err) {
    console.error("withdrawAction failed:", err);
  }

  revalidatePath(`/posts/${postId}`);
  revalidatePath("/");
}

export async function confirmAction(claimId: string, postId: string) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/posts/${postId}`);

  try {
    const result = await confirmClaim(session.user.id, claimId);
    const post = await getPostById(postId);
    const url = await siteUrl(postId);

    if (post) {
      const claimantContact = await emailFor(result.claimantId);
      const authorContact = await emailFor(session.user.id);
      const revealedForClaimant = await revealContactIfAuthorized(postId, result.claimantId);

      if (claimantContact?.email) {
        await sendEmailSafely({
          from: EMAIL_FROM,
          to: claimantContact.email,
          subject: "Your ride is confirmed",
          react: ClaimConfirmedEmail({
            postUrl: url,
            origin: post.origin,
            destination: post.destination,
            counterpartName: authorContact?.name ?? null,
            counterpartPhone: revealedForClaimant?.phone ?? null,
          }),
        });
      }
      await sendPushSafely(result.claimantId, {
        title: "Your ride is confirmed 🎉",
        body: `${post.origin} → ${post.destination}`,
        url,
      });

      for (const declinedId of result.autoDeclinedClaimantIds) {
        const declinedContact = await emailFor(declinedId);
        if (declinedContact?.email) {
          await sendEmailSafely({
            from: EMAIL_FROM,
            to: declinedContact.email,
            subject: "Your claim wasn't accepted this time",
            react: ClaimDeclinedEmail({ postUrl: url, origin: post.origin, destination: post.destination }),
          });
        }
        await sendPushSafely(declinedId, {
          title: "Your claim wasn't accepted this time",
          body: `${post.origin} → ${post.destination} went to someone else`,
          url,
        });
      }
    }
  } catch (err) {
    console.error("confirmAction failed:", err);
  }

  revalidatePath(`/posts/${postId}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function declineAction(claimId: string, postId: string) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/posts/${postId}`);

  try {
    const result = await declineClaim(session.user.id, claimId);
    const post = await getPostById(postId);
    if (post) {
      const url = await siteUrl(postId);
      const declinedContact = await emailFor(result.claimantId);
      if (declinedContact?.email) {
        await sendEmailSafely({
          from: EMAIL_FROM,
          to: declinedContact.email,
          subject: "Your claim wasn't accepted this time",
          react: ClaimDeclinedEmail({ postUrl: url, origin: post.origin, destination: post.destination }),
        });
      }
      await sendPushSafely(result.claimantId, {
        title: "Your claim wasn't accepted this time",
        body: `${post.origin} → ${post.destination}`,
        url,
      });
    }
  } catch (err) {
    console.error("declineAction failed:", err);
  }

  revalidatePath(`/posts/${postId}`);
  revalidatePath("/");
}

/** Polled by <ClaimChat> -- returns null (rather than throwing) if the
 *  viewer isn't a party to this claim's thread, so the client can just
 *  stop polling rather than treat it as a transient error. */
export async function fetchMessagesAction(claimId: string) {
  const session = await auth();
  if (!session?.user) return null;
  return getMessagesForClaim(claimId, session.user.id);
}

export async function sendMessageAction(claimId: string, body: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in.");

  const parsed = messageFormSchema.safeParse({ claimId, body });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid message.");

  const message = await sendMessage(parsed.data.claimId, session.user.id, parsed.data.body);

  // Notifications -- best-effort, must not fail the actual send (the
  // message is already saved and showing in the sender's own chat by now).
  try {
    const [post, recipient] = await Promise.all([getPostById(message.postId), emailFor(message.recipientId)]);
    if (post) {
      const url = await siteUrl(message.postId);
      if (recipient?.email) {
        await sendEmailSafely({
          from: EMAIL_FROM,
          to: recipient.email,
          subject: "You have a new message",
          react: NewMessageEmail({
            postUrl: url,
            origin: post.origin,
            destination: post.destination,
            senderName: session.user.name ?? null,
            body: parsed.data.body,
          }),
        });
      }
      await sendPushSafely(message.recipientId, {
        title: `${session.user.name ?? "Someone"} sent you a message`,
        body: parsed.data.body,
        url,
      });
    }
  } catch (err) {
    console.error("sendMessageAction notification failed:", err);
  }

  return message;
}

export async function cancelPostAction(postId: string) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/posts/${postId}`);

  try {
    const result = await cancelPost(session.user.id, postId);
    const post = await getPostById(postId);
    if (post) {
      const url = await siteUrl(postId);
      for (const claimantId of result.autoDeclinedClaimantIds) {
        const contact = await emailFor(claimantId);
        if (contact?.email) {
          await sendEmailSafely({
            from: EMAIL_FROM,
            to: contact.email,
            subject: "A ride you claimed was cancelled",
            react: ClaimDeclinedEmail({ postUrl: url, origin: post.origin, destination: post.destination }),
          });
        }
        await sendPushSafely(claimantId, {
          title: "A ride you claimed was cancelled",
          body: `${post.origin} → ${post.destination}`,
          url,
        });
      }
    }
  } catch (err) {
    console.error("cancelPostAction failed:", err);
  }

  revalidatePath(`/posts/${postId}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
}
