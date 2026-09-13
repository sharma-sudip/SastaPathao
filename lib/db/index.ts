import "server-only";

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

// The Pool below talks to Neon over a real WebSocket (see the comment on
// `db` for why), but Node has no built-in WebSocket client (unlike browsers
// and edge runtimes) -- without this, connecting throws "All attempts to
// open a WebSocket ... failed". https://neon.tech/docs/serverless/serverless-driver#configuring-neonconfig
neonConfig.webSocketConstructor = ws;

const globalForDb = globalThis as unknown as { pool?: Pool };

// Reuse the pool across hot reloads / module reevaluations in dev, and across
// invocations on a warm serverless instance in production.
const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

// Pooled (WebSocket) connection -- required (not neon-http) so mutations
// that need db.transaction() (see lib/claims.ts) get real transaction
// semantics instead of single-shot batched statements.
export const db = drizzle(pool, { schema });
