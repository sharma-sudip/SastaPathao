"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createPost } from "@/lib/posts";
import { postFormSchema } from "@/lib/validation";
import type { PostActionState } from "@/lib/action-types";

export async function createRequestAction(
  _prevState: PostActionState,
  formData: FormData
): Promise<PostActionState> {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/requests/new");

  const parsed = postFormSchema.safeParse({
    origin: formData.get("origin"),
    originLat: formData.get("originLat") || undefined,
    originLng: formData.get("originLng") || undefined,
    destination: formData.get("destination"),
    destLat: formData.get("destinationLat") || undefined,
    destLng: formData.get("destinationLng") || undefined,
    departAt: formData.get("departAt"),
    notes: formData.get("notes") ?? "",
    askingPrice: formData.get("askingPrice") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      error: "Please fix the errors below.",
      fieldErrors: {
        origin: fieldErrors.origin?.[0],
        destination: fieldErrors.destination?.[0],
        departAt: fieldErrors.departAt?.[0],
        askingPrice: fieldErrors.askingPrice?.[0],
      },
    };
  }

  const post = await createPost(session.user.id, parsed.data);
  revalidatePath("/");
  redirect(`/posts/${post.id}`);
}
