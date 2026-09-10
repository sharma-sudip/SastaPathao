"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { phoneSchema } from "@/lib/validation";
import type { ProfileActionState } from "@/lib/action-types";

export async function updateProfileAction(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const callbackUrl = String(formData.get("callbackUrl") ?? "");

  if (name.length < 1 || name.length > 100) {
    return { error: "Enter a name between 1 and 100 characters." };
  }

  let phone: string | null = null;
  if (phoneRaw) {
    const parsed = phoneSchema.safeParse(phoneRaw);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid phone number." };
    phone = parsed.data;
  } else if (callbackUrl) {
    // Onboarding (callbackUrl present) requires both -- a matched
    // rider/driver needs a way to actually reach the other person. A
    // regular profile edit can still leave phone blank if someone wants to.
    return { error: "Add a phone number so a matched rider/driver can reach you." };
  }

  await db.update(users).set({ name, phone }).where(eq(users.id, session.user.id));

  // Onboarding flow (arrived here via pages.newUser or a point-of-need
  // redirect, both of which attach callbackUrl) -- send them on to wherever
  // they were actually headed instead of leaving them looking at their own
  // profile page.
  if (callbackUrl) redirect(callbackUrl);

  revalidatePath("/account");
  return { success: true };
}
