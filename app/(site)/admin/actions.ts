"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { banUser, unbanUser } from "@/lib/moderation";

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
