"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { banUser, unbanUser } from "@/lib/moderation";
import { deletePost } from "@/lib/posts";

// Re-checked here, not just at the page level -- a form's `action` is a
// real server endpoint of its own, callable directly regardless of what the
// page that renders the button chooses to show.
async function requireAdmin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) throw new Error("Forbidden.");
}

export async function banAction(userId: string, formData: FormData) {
  await requireAdmin();
  const reason = String(formData.get("reason") ?? "").trim() || null;
  await banUser(userId, reason);
  revalidatePath("/admin");
}

export async function unbanAction(userId: string) {
  await requireAdmin();
  await unbanUser(userId);
  revalidatePath("/admin");
}

// Hard delete -- unlike a rider cancelling their own post (which just flips
// status to CANCELLED), this removes the row entirely, taking its claims and
// messages with it (cascade -- see lib/posts.ts's deletePost).
export async function deletePostAction(postId: string) {
  await requireAdmin();
  await deletePost(postId);
  revalidatePath("/admin");
  revalidatePath("/");
}
