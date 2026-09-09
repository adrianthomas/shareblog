import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { contentObjects } from "./schema.js";
import { materializeAppleMusicMetadata } from "../lib/apple-music.js";

const commit = process.argv.includes("--commit");
const music = await db.select().from(contentObjects).where(eq(contentObjects.type, "music"));

if (!commit) {
  console.log(`Would migrate ${music.length} music post(s). Re-run with --commit to store Apple artwork locally and remove other destinations.`);
  process.exit(0);
}

let migrated = 0;
for (const object of music) {
  const normalized = await materializeAppleMusicMetadata(
    object.siteId,
    object.metadata,
    object.sourceUrl ?? undefined,
    console,
  );
  await db
    .update(contentObjects)
    .set({ metadata: normalized.metadata, sourceUrl: normalized.sourceUrl ?? null })
    .where(eq(contentObjects.id, object.id));
  migrated += 1;
}

console.log(`Migrated ${migrated} music post(s) to local Apple artwork and Apple-only destinations.`);
