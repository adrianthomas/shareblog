import "dotenv/config";
import { eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { db } from "./client.js";
import { contentObjects } from "./schema.js";
import { materializeAppleMusicMetadata } from "../lib/apple-music.js";

const commit = process.argv.includes("--commit");
const music = await db.select().from(contentObjects).where(eq(contentObjects.type, "music"));

if (!commit) {
  console.log(`Would migrate ${music.length} music post(s). Re-run with --commit to store Apple artwork locally and remove other destinations.`);
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
const backup = new Database(databaseUrl, { readonly: true });
await backup.backup(`${databaseUrl}.before-apple-music-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`);
backup.close();
console.log("Created a database backup.");

let migrated = 0;
for (const object of music) {
  const normalized = await materializeAppleMusicMetadata(
    object.siteId,
    object.metadata,
    object.sourceUrl ?? undefined,
    console,
  );
  const previous = object.metadata as Record<string, unknown>;
  if (typeof previous.artworkUrl === "string" && typeof normalized.metadata.artworkAssetId !== "string") {
    throw new Error(`Could not preserve artwork while migrating music post ${object.id}; no database change was made for it.`);
  }
  await db
    .update(contentObjects)
    .set({ metadata: normalized.metadata, sourceUrl: normalized.sourceUrl ?? null })
    .where(eq(contentObjects.id, object.id));
  migrated += 1;
}

console.log(`Migrated ${migrated} music post(s) to local Apple artwork and Apple-only destinations.`);
