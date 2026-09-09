import { randomInt } from "node:crypto";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { MagicLinkEmail } from "@/emails/magic-link-email";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Auth.js's own "known-safe platform" auto-detection for this doesn't
  // reliably kick in on Vercel (https://errors.authjs.dev/#untrustedhost --
  // some visitors got UntrustedHost even from the deployed URL). Vercel
  // terminates TLS and sets the Host header itself, so trusting it here is
  // safe -- this isn't a self-hosted box behind an arbitrary reverse proxy.
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // Magic-link tokens are persisted via the adapter, so a database session
  // (not JWT) is the natural fit here -- also makes signOut() an immediate,
  // server-side revocation rather than just deleting a client cookie.
  session: { strategy: "database" },
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY ?? process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
      // A 6-digit code the user reads on their phone (where the email
      // landed) and types into the browser they started the sign-in from --
      // the magic-link click otherwise finishes the sign-in on whichever
      // device opens the link, not the one that requested it. `token` here
      // becomes the `?token=` the link still carries too, so clicking it on
      // the same device still works as a shortcut.
      generateVerificationToken: async () => String(randomInt(0, 1_000_000)).padStart(6, "0"),
      // Short-lived, since it's now something a person retypes rather than
      // an unguessable link -- default was 24h, that's too long for a
      // 6-digit code to stay valid.
      maxAge: 60 * 15,
      async sendVerificationRequest({ identifier: email, url, token }) {
        if (!process.env.RESEND_API_KEY) {
          console.warn(`RESEND_API_KEY not set -- sign-in code for ${email}: ${token} (link: ${url})`);
          return;
        }
        await resend.emails.send({
          from: EMAIL_FROM,
          to: email,
          subject: `${token} is your Sasta Pathao sign-in code`,
          react: MagicLinkEmail({ code: token, url }),
        });
        if (process.env.NODE_ENV !== "production") {
          // Resend (via AWS SES) rewrites links for click tracking, and that
          // tracking redirect can't resolve a `localhost` destination -- it
          // 400s with an awstrack.me error instead of redirecting. The code
          // isn't affected by this, only the fallback link.
          console.log(`[dev] sign-in code for ${email}: ${token} (link: ${url})`);
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify-request",
    // Verification (bad/expired/already-used code) doesn't have its own
    // `kind`, so it falls back to Auth.js's generic /api/auth/error page
    // unless we route it back to our own sign-in page instead.
    error: "/login",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
