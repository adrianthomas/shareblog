import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Uberspace's Postgres is a small shared instance, not a dedicated one —
// keep the pool modest so this app doesn't eat all its connection slots,
// and release idle connections quickly since traffic will be spiky.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX ?? 5),
  idleTimeoutMillis: 30_000,
});
export const db = drizzle(pool, { schema });
