import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

mkdirSync(dirname(process.env.DATABASE_URL), { recursive: true });

const sqlite = new Database(process.env.DATABASE_URL);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

// Introduced after URL-only posts had temporarily shared the "article"
// content type. Preserve real long-form/imported articles and move only
// link-shaped rows: they have a source URL and no substantial article body.
sqlite
  .prepare(
    "update content_objects set type = 'link' " +
      "where type = 'article' and source_url is not null and (body is null or length(body) < 1200)",
  )
  .run();

export const db = drizzle(sqlite, { schema });
