import {
  pgTable,
  text,
  timestamp,
  integer,
  doublePrecision,
  boolean,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ---------------------------------------------------------------------------
// Auth.js standard tables (shape required by @auth/drizzle-adapter)
// ---------------------------------------------------------------------------

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // App-specific column. NEVER select this from general-purpose queries —
  // see lib/contacts.ts for the one place it's allowed to be read.
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Set by lib/db/ban-user.ts. Non-null blocks all future sign-in (see the
  // `signIn` callback in auth.ts) — banning also revokes any session the
  // user currently holds, so this alone is enough to cut off access; no
  // other query needs to check it.
  bannedAt: timestamp("banned_at"),
  banReason: text("ban_reason"),
  // Opted in via /account (components/driver-opt-in-toggle.tsx) to be
  // emailed + in-app notified about every new ride request, not just ones
  // they've already claimed. Off by default -- this is unrelated to actually
  // claiming a ride.
  driverOptIn: boolean("driver_opt_in").notNull().default(false),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ---------------------------------------------------------------------------
// App tables
// ---------------------------------------------------------------------------

export const postStatusEnum = pgEnum("post_status", [
  "OPEN",
  "PENDING",
  "FILLED",
  // Distinct from FILLED: FILLED just means matched, not that the ride
  // actually happened yet. The driver (confirmed claimant) marks a FILLED
  // post COMPLETED once it has -- that's what triggers the rider's coupon.
  "COMPLETED",
  "CANCELLED",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "PROPOSED",
  "CONFIRMED",
  "DECLINED",
  "WITHDRAWN",
]);

// Whose number is currently on the table for a claim's offerAmountCents --
// the OTHER party is the one who can accept/decline/counter it. See
// lib/claims.ts.
export const offerByEnum = pgEnum("offer_by", ["claimant", "author"]);

export const posts = pgTable("post", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // google-maps branch: coordinates are geocoded via Google (lib/geocode.ts)
  // once the poster picks/confirms an address, not typed directly -- origin
  // (destination) text is still the free-text label shown everywhere; the
  // *Lat/*Lng columns exist for the map, the drawn route, and the
  // distance-based price suggestion (lib/pricing.ts). Nullable: a post
  // typed without ever touching the map still just has null coordinates,
  // same as main.
  origin: text("origin").notNull(),
  originLat: doublePrecision("origin_lat"),
  originLng: doublePrecision("origin_lng"),
  destination: text("destination").notNull(),
  destLat: doublePrecision("dest_lat"),
  destLng: doublePrecision("dest_lng"),
  // Can be in the future -- this is the "schedule a pickup" field.
  departAt: timestamp("depart_at").notNull(),
  notes: text("notes"),
  // Optional -- freely editable, and can be left blank entirely (some posts
  // just aren't priced). Purely a suggested/agreed number for coordination
  // -- never processes payment, see the footer disclaimer.
  askingPriceCents: integer("asking_price_cents"),
  status: postStatusEnum("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const claims = pgTable("claim", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  claimantId: text("claimant_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: claimStatusEnum("status").notNull().default("PROPOSED"),
  message: text("message"),
  // Optional -- the offer currently on the table (starts at whatever the
  // claimant proposed, defaulting to the post's askingPriceCents but
  // editable). `offerBy` says who put that number there; the other party is
  // the one who can accept (-> CONFIRMED), decline/withdraw, or counter
  // (updates offerAmountCents, flips offerBy, stays PROPOSED). See
  // lib/claims.ts's confirmClaim/counterOffer.
  offerAmountCents: integer("offer_amount_cents"),
  offerBy: offerByEnum("offer_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
});

// One thread per claim, between that post's author and that one claimant --
// not a per-post group chat, so competing claimants on the same post can't
// see each other's coordination with the rider. Same authorization boundary
// as contact reveal (lib/contacts.ts): author + that specific claimant only.
export const messages = pgTable("message", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  claimId: text("claim_id")
    .notNull()
    .references(() => claims.id, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One row per browser/device a user has enabled push notifications on
// (someone using this on their phone and laptop both gets one each). Kept
// separate from `users` rather than a single column since there's no cap
// on how many endpoints one person can have.
export const pushSubscriptions = pgTable("push_subscription", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A persistent, in-app record of the same events that trigger an email/push
// (lib/notify.ts writes one alongside those) -- so the notification bell has
// something to list even for someone who never opted into push and isn't
// checking email right now.
export const notifications = pgTable("notification", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One per completed ride, issued to the post's author (the rider) --
// redeemable once, in person, at our partner, Guins Barber Shop (a haircut, or a
// facial with the customer's own kit -- the shop doesn't cut women's hair).
// `code` is what the QR code (emailed + shown in-app) encodes; the
// redemption page looks the coupon up by it. See lib/coupons.ts.
export const coupons = pgTable("coupon", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  redeemed: boolean("redeemed").notNull().default(false),
  redeemedAt: timestamp("redeemed_at"),
  redeemedBy: text("redeemed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Relations (used for query-builder joins in lib/db/queries.ts)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  claims: many(claims),
  messages: many(messages),
  pushSubscriptions: many(pushSubscriptions),
  notifications: many(notifications),
  coupons: many(coupons),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  claims: many(claims),
  coupons: many(coupons),
}));

export const claimsRelations = relations(claims, ({ one, many }) => ({
  post: one(posts, { fields: [claims.postId], references: [posts.id] }),
  claimant: one(users, {
    fields: [claims.claimantId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  claim: one(claims, { fields: [messages.claimId], references: [claims.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const couponsRelations = relations(coupons, ({ one }) => ({
  post: one(posts, { fields: [coupons.postId], references: [posts.id] }),
  user: one(users, { fields: [coupons.userId], references: [users.id] }),
  redeemedByUser: one(users, { fields: [coupons.redeemedBy], references: [users.id] }),
}));
