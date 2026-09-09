"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { loginFormSchema } from "@/lib/validation";

export type LoginState = { error?: string } | undefined;

export async function requestMagicLink(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginFormSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  try {
    await signIn("resend", { email: parsed.data.email, redirectTo: callbackUrl });
  } catch (error) {
    // signIn() throws Next.js's internal redirect signal on success -- let it
    // propagate so the router actually navigates to /login/verify-request.
    if (error instanceof AuthError) {
      return { error: "Could not send the sign-in email. Please try again." };
    }
    throw error;
  }
}
