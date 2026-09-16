"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createPost } from "@/lib/posts";
import { getOptedInDrivers } from "@/lib/db/queries";
import { postFormSchema } from "@/lib/validation";
import { sendEmailSafely, EMAIL_FROM } from "@/lib/resend";
import { notifyUser } from "@/lib/notify";
import { NewRequestEmail } from "@/emails/new-request-email";
import type { PostActionState } from "@/lib/action-types";

export async function createRequestAction(
  _prevState: PostActionState,
  formData: FormData
): Promise<PostActionState> {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/requests/new");

  const parsed = postFormSchema.safeParse({
    origin: formData.get("origin"),
    destination: formData.get("destination"),
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

  // Best-effort -- never blocks the redirect below.
  try {
    const drivers = await getOptedInDrivers(session.user.id);
    if (drivers.length > 0) {
      const base = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
      const url = `${base}/posts/${post.id}`;

      for (const driver of drivers) {
        if (driver.email) {
          await sendEmailSafely({
            from: EMAIL_FROM,
            to: driver.email,
            subject: "New ride request posted",
            react: NewRequestEmail({
              postUrl: url,
              origin: parsed.data.origin,
              destination: parsed.data.destination,
              authorName: session.user.name ?? null,
            }),
          });
        }
        await notifyUser(driver.id, {
          title: "New ride request posted",
          body: `${parsed.data.origin} → ${parsed.data.destination}`,
          url,
        });
      }
    }
  } catch (err) {
    console.error("Failed to notify opted-in drivers:", err);
  }

  revalidatePath("/");
  redirect(`/posts/${post.id}`);
}
