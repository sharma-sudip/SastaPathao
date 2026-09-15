"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createClaim, withdrawClaim, confirmClaim, declineClaim, counterOffer } from "@/lib/claims";
import { cancelPost } from "@/lib/posts";
import { getPostById, getUserProfile, isProfileComplete } from "@/lib/db/queries";
import { revealContactIfAuthorized } from "@/lib/contacts";
import { getMessagesForClaim, sendMessage } from "@/lib/messages";
import { claimFormSchema, messageFormSchema, counterOfferFormSchema } from "@/lib/validation";
import { formatCents, dollarsToCents } from "@/lib/pricing";
import { sendEmailSafely, EMAIL_FROM } from "@/lib/resend";
import { notifyUser } from "@/lib/notify";
import { NewClaimEmail } from "@/emails/new-claim-email";
import { ClaimConfirmedEmail } from "@/emails/claim-confirmed-email";
import { ClaimDeclinedEmail } from "@/emails/claim-declined-email";
import { ClaimWithdrawnEmail } from "@/emails/claim-withdrawn-email";
import { ClaimCounteredEmail } from "@/emails/claim-countered-email";
import { NewMessageEmail } from "@/emails/new-message-email";
import { CouponEarnedEmail } from "@/emails/coupon-earned-email";
import { completeRide } from "@/lib/coupons";
import { generateQrDataUrl } from "@/lib/qr";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function siteUrl(postId: string) {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/posts/${postId}`;
}

async function couponUrl(code: string) {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/coupons/${code}`;
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

  const parsed = claimFormSchema.safeParse({
    postId,
    message: formData.get("message") ?? "",
    offerAmount: formData.get("offerAmount") ?? "",
  });
  if (!parsed.success) return;

  const offerAmountCents = parsed.data.offerAmount != null ? dollarsToCents(parsed.data.offerAmount) : null;

  try {
    const { authorId } = await createClaim(session.user.id, postId, parsed.data.message || null, offerAmountCents);

    const post = await getPostById(postId);
    const author = await emailFor(authorId);
    if (post) {
      const url = await siteUrl(postId);
      const offerFormatted = offerAmountCents != null ? formatCents(offerAmountCents) : null;
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
            offerFormatted,
          }),
        });
      }
      await notifyUser(authorId, {
        title: "Someone wants to fill your ride",
        body: `${session.user.name ?? "A neighbor"} offered for ${post.origin} → ${post.destination}${
          offerFormatted ? ` — ${offerFormatted}` : ""
        }`,
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
      await notifyUser(result.authorId, {
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
      const authorContact = await emailFor(result.authorId);
      const priceLine = result.agreedPriceCents != null ? ` for ${formatCents(result.agreedPriceCents)}` : "";

      // Either party can be the one accepting now (the author confirming
      // the claimant's offer, or the claimant accepting the author's
      // counter) -- notify whichever one *didn't* just act, same as the
      // acting party already seeing their own success state in the UI.
      const claimantIsActing = session.user.id === result.claimantId;
      const recipientId = claimantIsActing ? result.authorId : result.claimantId;
      const recipientContact = claimantIsActing ? authorContact : claimantContact;
      const revealedForRecipient = await revealContactIfAuthorized(postId, recipientId);

      if (recipientContact?.email) {
        await sendEmailSafely({
          from: EMAIL_FROM,
          to: recipientContact.email,
          subject: "Your ride is confirmed",
          react: ClaimConfirmedEmail({
            postUrl: url,
            origin: post.origin,
            destination: post.destination,
            counterpartName: (claimantIsActing ? claimantContact : authorContact)?.name ?? null,
            counterpartPhone: revealedForRecipient?.phone ?? null,
            agreedPriceFormatted: result.agreedPriceCents != null ? formatCents(result.agreedPriceCents) : null,
          }),
        });
      }
      await notifyUser(recipientId, {
        title: "Your ride is confirmed 🎉",
        body: `${post.origin} → ${post.destination}${priceLine}`,
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
        await notifyUser(declinedId, {
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
      await notifyUser(result.claimantId, {
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

export async function counterAction(claimId: string, postId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/posts/${postId}`);

  const parsed = counterOfferFormSchema.safeParse({ claimId, amount: formData.get("amount") });
  if (!parsed.success) return;

  try {
    const result = await counterOffer(session.user.id, claimId, dollarsToCents(parsed.data.amount));
    const post = await getPostById(postId);
    if (post) {
      const url = await siteUrl(postId);
      const amountFormatted = formatCents(result.amountCents);
      // Notify whichever party didn't just counter -- it's now their turn.
      const recipientId = result.counteredByAuthor ? result.claimantId : result.authorId;
      const counterpartContact = await emailFor(result.counteredByAuthor ? result.authorId : result.claimantId);
      const recipientContact = await emailFor(recipientId);

      if (recipientContact?.email) {
        await sendEmailSafely({
          from: EMAIL_FROM,
          to: recipientContact.email,
          subject: "You've got a counter-offer",
          react: ClaimCounteredEmail({
            postUrl: url,
            origin: post.origin,
            destination: post.destination,
            counterpartName: counterpartContact?.name ?? null,
            amountFormatted,
          }),
        });
      }
      await notifyUser(recipientId, {
        title: "You've got a counter-offer",
        body: `${counterpartContact?.name ?? "The other person"} proposed ${amountFormatted} for ${post.origin} → ${post.destination}`,
        url,
      });
    }
  } catch (err) {
    console.error("counterAction failed:", err);
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
      await notifyUser(message.recipientId, {
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

export async function completeRideAction(postId: string) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/posts/${postId}`);

  try {
    const { riderId, couponCode } = await completeRide(session.user.id, postId);
    const post = await getPostById(postId);
    const rider = await emailFor(riderId);

    if (post) {
      const redeemUrl = await couponUrl(couponCode);
      if (rider?.email) {
        const qrDataUrl = await generateQrDataUrl(redeemUrl);
        await sendEmailSafely({
          from: EMAIL_FROM,
          to: rider.email,
          subject: "You earned a $5 coupon",
          react: CouponEarnedEmail({
            origin: post.origin,
            destination: post.destination,
            redeemUrl,
            qrDataUrl,
            couponCode,
          }),
        });
      }
      await notifyUser(riderId, {
        title: "You earned $5 off 💈",
        body: `Completed: ${post.origin} → ${post.destination}`,
        url: redeemUrl,
      });
    }
  } catch (err) {
    console.error("completeRideAction failed:", err);
  }

  revalidatePath(`/posts/${postId}`);
  revalidatePath("/dashboard");
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
        await notifyUser(claimantId, {
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
