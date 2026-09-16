import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

// Standalone script (run via `npm run db:seed`), so it builds its own
// connection rather than importing lib/db/index.ts (which is `server-only`
// and assumes a running Next.js server process).

// Node has no built-in WebSocket client -- see the same line in
// lib/db/index.ts for why this is needed to connect at all.
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  console.log("Seeding sample users and posts...");

  const [alice] = await db
    .insert(schema.users)
    .values({ name: "Alice (sample)", email: "alice@example.com", phone: "(330) 555-0101" })
    .onConflictDoNothing({ target: schema.users.email })
    .returning({ id: schema.users.id });

  const [bob] = await db
    .insert(schema.users)
    .values({ name: "Bob (sample)", email: "bob@example.com", phone: "(330) 555-0102" })
    .onConflictDoNothing({ target: schema.users.email })
    .returning({ id: schema.users.id });

  const aliceId = alice?.id ?? (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, "alice@example.com") }))?.id;
  const bobId = bob?.id ?? (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, "bob@example.com") }))?.id;

  if (!aliceId || !bobId) throw new Error("Failed to seed sample users.");

  const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  await db.insert(schema.posts).values([
    {
      authorId: aliceId,
      origin: "Boardman Plaza, Youngstown, OH",
      destination: "Youngstown State University",
      departAt: inTwoDays,
      notes: "Need to be there by 9am for class.",
    },
    {
      authorId: bobId,
      origin: "Austintown, OH",
      destination: "Pittsburgh International Airport",
      departAt: inFiveDays,
      notes: "Need a lift to catch an early flight.",
    },
  ]);

  console.log("Done.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
