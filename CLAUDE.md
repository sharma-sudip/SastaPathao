# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A free, open-source ride-coordination board for the Youngstown, Ohio area — post a ride request
(now or scheduled ahead), and another user proposes to fill it. No payments are handled anywhere.
See README.md for the full stack rationale and setup steps (Next.js/App Router, Neon Postgres via
Drizzle, Auth.js v5 passwordless email, Resend, Web Push, Google Maps, Tailwind).

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

**Data model** (`lib/db/schema.ts`): `post` (origin/destination with optional lat/lng, a
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

**Daily cron** (`app/api/cron/purge-old-data`, scheduled in `vercel.json`, gated on `CRON_SECRET`):
a post that's still `OPEN`/`PENDING` a day past its `departAt` auto-cancels (`lib/posts.ts`'s
`autoCancelStalePosts` — nobody ever got confirmed to drive it, so no coupon); a post that's
`FILLED` a day past `departAt` but never marked done auto-completes instead (`lib/coupons.ts`'s
`autoCompleteStaleFilledPosts` — a driver *was* confirmed, so this mints the rider's coupon same
as the manual "mark completed" button would). Both notify/email everyone affected, mirroring
`cancelPostAction`/`completeRideAction`'s own fan-out. Separately, `lib/retention.ts`'s
`purgeOldPosts` hard-deletes any post 30+ days past `departAt` regardless of status, cascading to
its claims/messages.

**Auth**: Auth.js v5 (`auth.ts`) with the Drizzle adapter and **database sessions** (not JWT), since
magic-link tokens are already persisted via the adapter and this makes `signOut()` an immediate
server-side revocation. Sign-in is a 6-digit code emailed via Resend (`generateVerificationToken`
overrides the adapter default), with the underlying magic-link URL kept as a same-device
shortcut. `trustHost: true` is intentional (see the comment in `auth.ts`) — Vercel terminates TLS
and sets `Host` itself. A brand-new account is routed to `/account` (`pages.newUser`) to collect
name/phone before anything else; `requests/new` and the claim action independently re-check
profile completeness in case that step is abandoned.

**Maps/geocoding (`google-maps` branch only — `main` has none of this, see its CLAUDE.md)**:
this branch reintroduces coordinates, an interactive map, and a drawn route, all Google-only —
there's no free-tier fallback here, it needs a real, billing-enabled key. Two *separate* API
keys, restricted differently on purpose:
- `GOOGLE_MAPS_API_KEY` (server-only, never sent to the browser): Places API (New) + Geocoding
  API + Directions API, called only from our own `app/api/geocode/*` routes
  (`lib/geocode.ts`'s `searchAddress`/`reverseGeocode`, `lib/directions.ts`'s `getDrivingRoute`).
  Restrict it to just those 3 APIs; no HTTP referrer restriction (server-to-server calls have no
  browser referrer to check).
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (public, loads via a `<script>` tag — visible in the page
  source, same as any client-side Google Maps key): Maps JavaScript API only, for map
  tiles/pins/route-line rendering (`components/google-maps-provider.tsx`, wrapping
  `app/(site)/layout.tsx`). Restrict it to just that one API and lock it down with an HTTP
  referrer restriction instead of relying on secrecy.

`components/dual-location-map.tsx` (post form's shared click-to-place map), `post-map.tsx` +
`post-map-section.tsx` (post detail's map, which also fetches and draws the driving route), and
`feed-map.tsx` (board's map view) all use `@vis.gl/react-google-maps`'s `<Map>`/legacy
`<Marker>`/`<Polyline>` — deliberately legacy `Marker`, not `AdvancedMarker`, so this doesn't also
need a Map ID configured in Google Cloud Console. `GoogleMapsProvider` always renders
`<APIProvider>`, even with an empty key — `<Map>` throws if it ever renders with no provider
ancestor at all, regardless of whether the script load itself succeeds, so this is what keeps a
missing/invalid key a graceful "map won't load" (visibly, via Google's own error dialog) rather
than a crashed page.

`lib/pricing.ts`'s distance-based price suggestion is deliberately still the straight-line
(haversine) estimate, not real driving distance from the Directions call above — it needs to
update instantly as someone types/picks an address on the post form, before a post (and any
reason to call Directions, which only happens for an existing post) exists at all.

The post detail page's "Get directions" link (`lib/maps-url.ts`) is unrelated to all of this and
unchanged from `main` — it just hands the two addresses to a `google.com/maps/dir/` URL and lets
Google Maps geocode them itself when the link opens, no API key needed. That's "take me there";
the drawn route on the map is "show me the route".

**Server actions**: mutations live in colocated `actions.ts` files next to the page that uses
them (e.g. `app/(site)/requests/new/actions.ts`, `app/(site)/posts/[id]/actions.ts`), returning
the shared state shapes from `lib/action-types.ts`. Form validation schemas are centralized in
`lib/validation.ts` and shared between client-side inline errors and the server actions that
parse submitted `FormData`.
