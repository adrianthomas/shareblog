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

// iOS TestFlight builds briefly presented the long-form Article editor while
// still publishing the legacy "thought" wire type, with the article title as
// the first Markdown H1. Move only that narrow shape into the real Article
// type so public rendering, feeds, and future iOS builds all agree.
const legacyArticleRows = sqlite
  .prepare("select id, body from content_objects where type = 'thought' and title is null and body like '# %'")
  .all() as Array<{ id: string; body: string | null }>;
const updateLegacyArticle = sqlite.prepare(
  "update content_objects set type = 'article', title = ?, body = ?, updated_at = ? where id = ?",
);
const migrateLegacyArticles = sqlite.transaction((rows: Array<{ id: string; body: string | null }>) => {
  for (const row of rows) {
    const body = row.body?.replace(/\r\n/g, "\n");
    const match = body?.match(/^#\s+([^\n]+)(?:\n+([\s\S]*))?$/);
    if (!match) continue;
    updateLegacyArticle.run(match[1].trim().slice(0, 300), match[2]?.trim() || null, Date.now(), row.id);
  }
});
migrateLegacyArticles(legacyArticleRows);

export const db = drizzle(sqlite, { schema });
