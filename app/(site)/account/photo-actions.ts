"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { put, del } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { PhotoActionState } from "@/lib/action-types";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB -- plenty for a profile photo
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function updatePhotoAction(
  _prevState: PhotoActionState,
  formData: FormData
): Promise<PhotoActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You need to be signed in." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Please upload a JPEG, PNG, WebP, or GIF image." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image is too large -- please keep it under 4MB." };
  }

  const previousImage = session.user.image;

  const blob = await put(`avatars/${session.user.id}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  await db.update(users).set({ image: blob.url }).where(eq(users.id, session.user.id));

  // Best-effort cleanup of whatever picture they had before -- never blocks
  // the save, and there's simply nothing to delete for a first-time upload.
  if (previousImage) {
    await del(previousImage).catch((err) => console.error("Failed to delete old avatar blob:", err));
  }

  revalidatePath("/account");
  return { success: true };
}
