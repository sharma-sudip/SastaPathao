import "server-only";

// A comma-separated allowlist rather than a `users.isAdmin` column -- there's
// exactly one admin (the site owner) for now, and this needs no migration
// and is easy to change straight from Vercel's env var settings. Revisit as
// a real DB-backed role if this ever needs more than a couple of people.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

/** Whether this email is allowed onto /admin (user list, ban/unban). */
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.has(email.toLowerCase());
}
