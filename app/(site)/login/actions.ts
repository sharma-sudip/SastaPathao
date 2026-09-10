"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { loginFormSchema } from "@/lib/validation";

export type LoginState = { error?: string } | undefined;

// Survives a failed code: Auth.js's own redirect on a bad/expired code goes
// to `${pages.error}?error=Verification` -- it doesn't carry callbackUrl
// along, so a retry would otherwise silently fall back to "/". This cookie
// lets /login recover the original destination even after that redirect
// drops it from the URL.
// "use server" files may only export async functions, so this can't be
// exported for page.tsx to import -- kept in sync manually, must match the
// same literal read in page.tsx.
const CALLBACK_COOKIE = "login_callback_url";

export async function requestMagicLink(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginFormSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  (await cookies()).set(CALLBACK_COOKIE, callbackUrl, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 15, // matches the code's own expiry (auth.ts maxAge)
    path: "/login",
  });

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
