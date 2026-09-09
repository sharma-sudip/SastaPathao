"use server";

import { redirect } from "next/navigation";
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
    // redirect: false -- the email/code still gets sent either way, this
    // just stops Auth.js from redirecting to /login/verify-request itself,
    // since its version of that redirect doesn't carry the email along and
    // the verify-request page needs it to build the code-verification form.
    await signIn("resend", { email: parsed.data.email, redirectTo: callbackUrl, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Could not send the sign-in code. Please try again." };
    }
    throw error;
  }

  redirect(`/login/verify-request?${new URLSearchParams({ email: parsed.data.email, callbackUrl })}`);
}
