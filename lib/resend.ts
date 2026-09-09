import "server-only";

import { Resend } from "resend";

const globalForResend = globalThis as unknown as { resend?: Resend };

// Resend's constructor throws if handed `undefined`, which would otherwise
// crash module evaluation (and the build) whenever RESEND_API_KEY isn't set
// yet. Fall back to a placeholder; sendEmailSafely() below checks the real
// env var before ever calling .send() with it.
export const resend =
  globalForResend.resend ?? new Resend(process.env.RESEND_API_KEY || "re_not_configured");

if (process.env.NODE_ENV !== "production") {
  globalForResend.resend = resend;
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "Sasta Pathao <onboarding@resend.dev>";

/**
 * Send helper that never throws -- notification emails are best-effort and
 * must not block or roll back the mutation that triggered them. Callers
 * (Server Actions) fire-and-forget this after their DB write commits.
 */
export async function sendEmailSafely(args: Parameters<typeof resend.emails.send>[0]) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set -- skipping email:", args.subject);
    return;
  }
  try {
    await resend.emails.send(args);
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}
