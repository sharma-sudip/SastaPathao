"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { phoneSchema } from "@/lib/validation";
import type { PostActionState } from "@/lib/action-types";

export async function updateProfileAction(
  _prevState: PostActionState,
  formData: FormData
): Promise<PostActionState> {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();

  if (name.length < 1 || name.length > 100) {
    return { error: "Enter a name between 1 and 100 characters." };
  }

  let phone: string | null = null;
  if (phoneRaw) {
    const parsed = phoneSchema.safeParse(phoneRaw);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid phone number." };
    phone = parsed.data;
  }

  await db.update(users).set({ name, phone }).where(eq(users.id, session.user.id));

  revalidatePath("/account");
}
