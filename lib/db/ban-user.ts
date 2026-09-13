import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

// Node has no built-in WebSocket client -- see the same line in
// lib/db/index.ts for why this is needed to connect at all.
neonConfig.webSocketConstructor = ws;

// Standalone script (run via `npm run db:ban -- <email> [reason]` or
// `npm run db:unban -- <email>`), so it builds its own connection rather
// than importing lib/db/index.ts (server-only, assumes a running Next.js
// server process) -- same reasoning as lib/db/seed.ts.
//
// There's no admin UI in this app, so this script *is* the ban feature:
// - Marks the account banned, which blocks all future sign-in (see the
//   `signIn` callback in auth.ts).
// - Deletes any session row they currently hold, so if they're already
//   signed in somewhere it's cut off on their very next request -- the
//   same mechanism signOut() itself uses (database sessions).
// - Cancels their still-open posts and declines their still-pending claims,
//   so spam/fake posts come off the board immediately rather than lingering
//   until they'd naturally expire.
async function main() {
  const unban = process.argv.includes("--unban");
  const [email, ...reasonParts] = process.argv.slice(2).filter((a) => a !== "--unban");

  if (!email) {
    console.error("Usage: npm run db:ban -- <email> [reason]");
    console.error("       npm run db:unban -- <email>");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user) {
    console.error(`No user found with email ${email}`);
    await pool.end();
    process.exit(1);
  }

  if (unban) {
    await db.update(schema.users).set({ bannedAt: null, banReason: null }).where(eq(schema.users.id, user.id));
    console.log(`Unbanned ${email}.`);
  } else {
    const reason = reasonParts.join(" ") || null;

    await db.transaction(async (tx) => {
      await tx.update(schema.users).set({ bannedAt: new Date(), banReason: reason }).where(eq(schema.users.id, user.id));

      await tx
        .update(schema.posts)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(and(eq(schema.posts.authorId, user.id), inArray(schema.posts.status, ["OPEN", "PENDING"])));

      await tx
        .update(schema.claims)
        .set({ status: "DECLINED", respondedAt: new Date() })
        .where(and(eq(schema.claims.claimantId, user.id), eq(schema.claims.status, "PROPOSED")));

      await tx.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));
    });

    console.log(
      `Banned ${email}${reason ? ` (${reason})` : ""}. Their open posts were cancelled, pending claims declined, and any active session revoked.`
    );
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
