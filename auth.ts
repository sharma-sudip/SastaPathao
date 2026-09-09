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
      async sendVerificationRequest({ identifier: email, url }) {
        if (!process.env.RESEND_API_KEY) {
          console.warn(`RESEND_API_KEY not set -- sign-in link for ${email}: ${url}`);
          return;
        }
        await resend.emails.send({
          from: EMAIL_FROM,
          to: email,
          subject: "Sign in to Sasta Pathao",
          react: MagicLinkEmail({ url }),
        });
        if (process.env.NODE_ENV !== "production") {
          // Resend (via AWS SES) rewrites links for click tracking, and that
          // tracking redirect can't resolve a `localhost` destination -- it
          // 400s with an awstrack.me error instead of redirecting. Clicking
          // the emailed link won't work in local dev regardless of the
          // account; copy this raw URL instead. Tracking only rewrites to a
          // *real* public host, so this isn't an issue once deployed.
          console.log(`[dev] sign-in link for ${email}: ${url}`);
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify-request",
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
