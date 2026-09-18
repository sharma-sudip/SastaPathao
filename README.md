# Sasta Pathao

A free, open-source ride-coordination board for the Youngstown, Ohio area — post a ride
request or offer (now or scheduled ahead of time), and let another person propose to fill it.
No payments are handled anywhere in this app; it's purely a convenience tool.

The name is a tongue-in-cheek nod to [Pathao](https://pathao.com), the ride-sharing app in
Nepal — "sasta" means "cheap" in Nepali/Hindi. This is an unaffiliated, unofficial parody/hobby
project, not a Pathao product.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) on Vercel
- [Neon](https://neon.tech) Postgres via [Drizzle ORM](https://orm.drizzle.team)
- [Auth.js](https://authjs.dev) (NextAuth v5) — passwordless email sign-in: a 6-digit code (plus a
  click-through link as a shortcut when it's opened on the same device)
- [Resend](https://resend.com) + [React Email](https://react.email) for transactional email
- [Web Push](https://web.dev/push-notifications-overview/) (VAPID) for optional browser
  notifications — a self-generated keypair, not a third-party account/API key
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for profile picture uploads
- **`google-maps` branch only** (not on `main`): [Google Maps](https://developers.google.com/maps)
  for address search/autocomplete, reverse geocoding, an interactive map, and a drawn driving
  route — needs a real, billing-enabled API key, unlike everything else on this list. See
  CLAUDE.md for the two-separate-keys setup.
- Tailwind CSS

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Neon Postgres database** — sign up free at [neon.tech](https://neon.tech), create a
   project, and copy the pooled connection string.

3. **Create a Resend account** (for magic-link sign-in and match notification emails) — sign up
   free at [resend.com](https://resend.com) and grab an API key. Without this set, the app still
   runs: sign-in links and notifications are logged to the server console instead of emailed.

4. **(Optional) Create a Vercel Blob store** — for profile picture uploads. In your Vercel
   project's Storage tab, create a free Blob store; it injects `BLOB_READ_WRITE_TOKEN`
   automatically once deployed. For local dev, copy the token it shows you, or run
   `vercel env pull .env.local` once the project's linked. Without it, uploading a photo just
   errors — everything else in the app still works.

5. **`google-maps` branch only: set up Google Maps Platform** — needs a real, billing-enabled
   project (no free-tier fallback on this branch). In Google Cloud Console: enable **Places API
   (New)**, **Geocoding API**, **Directions API**, and **Maps JavaScript API**; enable billing;
   set a budget alert; then create **two separate API keys** (see CLAUDE.md for exactly how each
   should be restricted) for `GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` below.
   Without these, every map on the site shows Google's own "can't load Google Maps" placeholder
   instead of crashing — fine for working on anything else in the meantime.

6. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in `DATABASE_URL` (from Neon), `RESEND_API_KEY` and `EMAIL_FROM` (from Resend),
   `BLOB_READ_WRITE_TOKEN` (from the Blob store above), `GOOGLE_MAPS_API_KEY` and
   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (from step 5), and generate an `AUTH_SECRET`:

   ```bash
   npx auth secret
   ```

7. **Run the database migration**

   ```bash
   npm run db:migrate
   ```

8. **(Optional) Seed sample data** for local testing:

   ```bash
   npm run db:seed
   ```

9. **Start the dev server**

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000).

## Scripts

| Command             | What it does                                              |
| -------------------- | ---------------------------------------------------------- |
| `npm run dev`         | Start the dev server                                       |
| `npm run build`       | Production build                                            |
| `npm start`           | Run a production build                                     |
| `npm run lint`        | ESLint                                                      |
| `npm run db:generate` | Generate a new SQL migration from `lib/db/schema.ts`       |
| `npm run db:migrate`  | Apply pending migrations to `DATABASE_URL`                 |
| `npm run db:studio`   | Open Drizzle Studio (visual browser for the database)      |
| `npm run db:seed`     | Insert a couple of sample users/posts for local testing    |
| `npm run db:ban -- <email> [reason]` | Ban a user by email: blocks future sign-in, revokes any active session, cancels their open posts and declines their pending claims |
| `npm run db:unban -- <email>` | Lift a ban |

## How it works

- **Landing flow**: `/` is a standalone splash screen (`components/splash.tsx`) with just the two
  entry points — "Need a ride?" and "Offer a ride?" — and no nav/footer chrome. Everything else
  (the ride board at `/board`, sign-in, dashboard, etc.) lives under the `app/(site)/` route
  group, which is what adds the normal nav + footer layout; see `app/(site)/layout.tsx` vs the
  bare root `app/layout.tsx`.
- **Posts**: a ride request (someone needs a ride), each with an origin/destination (label +
  optional map coordinates), a `departAt` time that can be in the future, and a status
  (`OPEN` → `PENDING` → `FILLED`/`CANCELLED`). There's no separate "offer a ride" post type —
  drivers respond to open requests instead of posting their own routes ahead of time.
- **Claims**: another user volunteers to fill a request (`PROPOSED`) — multiple people can
  volunteer on the same post at once. The post's author confirms one (`CONFIRMED` — auto-declines
  every other pending volunteer) or declines (`DECLINED`). A claimant can withdraw a still-pending
  claim.
- **Pricing**: entirely optional, on both a post and a claim. A post's `askingPriceCents` is
  pre-filled on the form from a rough $1/mile heuristic against the straight-line origin/destination
  distance (`lib/pricing.ts` — no driving-directions API), but freely editable or removable. A
  claim's `offerAmountCents` starts there too, and `offerBy` tracks whose number is currently on
  the table: the *other* party can accept it (`confirmClaim` in `lib/claims.ts`, generalized so
  either the author or the claimant can be the one accepting, depending on whose turn it is),
  decline/withdraw regardless of turn, or counter with a different amount (`counterOffer`, which
  flips `offerBy` and keeps the claim `PROPOSED`). Still never processes any payment — just a
  number both sides can agree on.
- **Contact info**: a phone number is only ever readable through
  [`lib/contacts.ts`](lib/contacts.ts)'s `revealContactIfAuthorized`, which checks that the
  viewer is the post's author or has an active claim on it before the phone column is even
  selected from the database. See that file's comments for the full rationale — don't add
  `phone` to any other query.
- **Profile pictures**: uploaded on `/account` (`photo-upload-form.tsx` + `photo-actions.ts`),
  stored via Vercel Blob (`BLOB_READ_WRITE_TOKEN`), and written to the standard Auth.js `image`
  column — so no migration was needed to add this. `components/avatar.tsx` renders it wherever a
  name shows (board cards, post detail, claims, the revealed contact card), falling back to a
  first initial or a generic icon for anyone who hasn't uploaded one.
- **Notifications**: every claim-lifecycle event (new claim, confirmed, declined, withdrawn,
  post cancelled) and every chat message goes through `lib/notify.ts`'s `notifyUser` — which
  writes a persistent row (the `notification` table, listed by the bell in `Nav`,
  `components/notification-bell.tsx`, polling like `<ClaimChat>`) and fans out a browser push
  notification, in parallel with that event's own email. Push requires the viewer to have opted
  in via the toggle on `/account` (`components/push-toggle.tsx`), which registers `public/sw.js`
  and stores the subscription in the `push_subscription` table; a subscription the push service
  reports as gone (endpoint uninstalled, permission revoked, etc.) gets deleted automatically
  rather than retried forever. Both `notifyUser` and email are best-effort — never throw, never
  block the action that triggered them.
- **Maps/geocoding** (`google-maps` branch — see CLAUDE.md for the full breakdown): Google-only,
  no free-tier fallback, split across two API keys restricted differently — `GOOGLE_MAPS_API_KEY`
  (server-only: Places/Geocoding/Directions, called from `app/api/geocode/*`) and
  `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (public, HTTP-referrer-restricted: Maps JavaScript API tiles
  only, via `components/google-maps-provider.tsx`). The post form's shared click-to-place map
  (`dual-location-map.tsx`), the post detail page's map + drawn route
  (`post-map.tsx`/`post-map-section.tsx`), and the board's map view (`feed-map.tsx`) all use
  `@vis.gl/react-google-maps`. `lib/pricing.ts`'s price suggestion stays a straight-line
  (haversine) estimate rather than real driving distance, since it has to update instantly while
  someone's still typing an address, before a post (and any reason to call Directions) exists.
  The post detail page's "Get directions" link (`lib/maps-url.ts`) is unrelated and needs no API
  key at all — it hands the two addresses straight to a `google.com/maps/dir/` URL, which
  geocodes them itself when the link opens.

## Verifying changes locally

There's no automated test suite (consistent with the rest of this repo) — verify manually:

1. `npm run dev` and walk through the relevant page(s) by hand.
2. `npm run db:seed` to populate a few sample posts, so the feed (list and map view) isn't empty.
3. `npm run db:studio` to visually confirm post/claim status transitions after each UI action
   (e.g. confirming a claim should flip the post to `FILLED` and any sibling claims to
   `DECLINED`).
4. To test the claim → confirm/decline flow, sign in as two different users (two incognito
   windows, or two email addresses) — one posts, the other claims.
5. After deploying, hit `/api/health` as a quick smoke test.
