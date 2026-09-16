# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A free, open-source ride-coordination board for the Youngstown, Ohio area — post a ride request
(now or scheduled ahead), and another user proposes to fill it. No payments are handled anywhere.
See README.md for the full stack rationale and setup steps (Next.js/App Router, Neon Postgres via
Drizzle, Auth.js v5 passwordless email, Resend, Web Push, Tailwind).

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # ESLint (eslint-config-next core-web-vitals + typescript)
npm run db:generate   # generate a new SQL migration from lib/db/schema.ts
npm run db:migrate    # apply pending migrations to DATABASE_URL
npm run db:studio     # Drizzle Studio (visual DB browser)
npm run db:seed       # insert sample users/posts for local testing
```

There is no automated test suite. Verify changes manually per the "Verifying changes locally"
section of README.md: `npm run dev` + `db:seed`, walk through the affected page, use `db:studio`
to confirm post/claim status transitions, and sign in as two different users (two email
addresses, or two incognito windows) to exercise the claim → confirm/decline flow.

## Architecture

**Route structure**: `/` is a standalone splash screen (`components/splash.tsx`) rendered directly
off the root layout (`app/layout.tsx`) with no nav/footer. Every other route lives under the
`app/(site)/` route group, whose layout (`app/(site)/layout.tsx`) adds `<Nav>`, `<Footer>`, and
`<MobileTabBar>`. When adding a new top-level page, put it under `app/(site)/` unless it's
deliberately chrome-less like the splash.

**Data model** (`lib/db/schema.ts`): `post` (free-text origin/destination, a
`departAt` that can be in the future, `status`: `OPEN → PENDING → FILLED`/`CANCELLED`) → `claim`
(a user volunteering to fill a post; multiple claimants can be `PROPOSED` at once; the author
`CONFIRMED`s one, which auto-declines the rest, or `DECLINED`s/the claimant `WITHDRAWN`s) →
`message` (one thread per claim, author + that one claimant only — not a per-post group chat, so
competing claimants can't see each other's coordination). Also `notification` (persistent,
listed by the bell) and `push_subscription` (one row per browser/device, deleted automatically
when the push service reports it gone). `user`/`account`/`session`/`verificationToken` are the
Auth.js adapter's required shape.

**Contact info is gated through one function**: `lib/contacts.ts`'s
`revealContactIfAuthorized` is the *only* place allowed to select `users.phone` — it runs an
authorization check as a separate query first (viewer is the post's author with an active
claimant, or the claimant on an active claim) and only selects the phone column if that passes.
Never add `phone` to any other query; route any new contact-reveal need through this function.

**Notification fan-out**: every claim-lifecycle event and chat message goes through
`lib/notify.ts`'s `notifyUser`, which writes a persistent `notification` row and sends a browser
push in parallel — both best-effort (never throw). Each event's transactional email (React Email
templates in `emails/`) is sent separately alongside this, not through `notifyUser`.

**Auth**: Auth.js v5 (`auth.ts`) with the Drizzle adapter and **database sessions** (not JWT), since
magic-link tokens are already persisted via the adapter and this makes `signOut()` an immediate
server-side revocation. Sign-in is a 6-digit code emailed via Resend (`generateVerificationToken`
overrides the adapter default), with the underlying magic-link URL kept as a same-device
shortcut. `trustHost: true` is intentional (see the comment in `auth.ts`) — Vercel terminates TLS
and sets `Host` itself. A brand-new account is routed to `/account` (`pages.newUser`) to collect
name/phone before anything else; `requests/new` and the claim action independently re-check
profile completeness in case that step is abandoned.

**No maps or geocoding**: `origin`/`destination` on a post are plain free text, typed by the
poster with no autocomplete, no coordinates, and no map display anywhere. This app used to
geocode them (Photon by default, an optional Google comparison) to show an interactive map and
suggest a distance-based price — removed because the free geocoder's address-level accuracy was
poor enough to cause real confusion (a pin landing near, not on, the actual address), and taking
on a billed Google API key wasn't worth it for a non-revenue app. See git history if reviving
this. The post detail page's "Get directions" link (`lib/maps-url.ts`) still works without any of
this — it just hands the two free-text addresses to a `google.com/maps/dir/` URL and lets Google
Maps geocode them itself when the link opens.

**Server actions**: mutations live in colocated `actions.ts` files next to the page that uses
them (e.g. `app/(site)/requests/new/actions.ts`, `app/(site)/posts/[id]/actions.ts`), returning
the shared state shapes from `lib/action-types.ts`. Form validation schemas are centralized in
`lib/validation.ts` and shared between client-side inline errors and the server actions that
parse submitted `FormData`.
