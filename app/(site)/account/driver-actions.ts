"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function updateDriverOptInAction(optedIn: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in.");

  await db.update(users).set({ driverOptIn: optedIn }).where(eq(users.id, session.user.id));
  revalidatePath("/account");
}
