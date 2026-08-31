import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { assets } from "../db/schema.js";
import { processImage } from "../image/process-image.js";
import { storage } from "../storage/index.js";

const IMAGE_VARIANTS = [
  { name: "thumb", width: 400 },
  { name: "medium", width: 1200 },
  { name: "original", width: 2400 },
] as const;

export type ImageAsset = typeof assets.$inferSelect;

export function imageAssetResponse(asset: ImageAsset) {
  const variants = asset.variants as Record<string, string>;
  return {
    id: asset.id,
    url: storage.getUrl(variants.original ?? variants.medium ?? asset.storageKey),
    thumbUrl: storage.getUrl(variants.thumb ?? variants.original ?? asset.storageKey),
    width: asset.width,
    height: asset.height,
  };
}

// The API upload route and the offline Markdown importer must create exactly
// the same asset rows and image variants. Keeping that work here prevents an
// imported image from becoming a second-class asset that the app cannot later
// resolve, replace, or clean up.
export async function createImageAsset(siteId: string, buffer: Buffer, filename: string): Promise<ImageAsset> {
  const processed = await processImage(
    buffer,
    IMAGE_VARIANTS.map(({ name, width }) => ({ name, width })),
  );

  const [asset] = await db
    .insert(assets)
    .values({
      siteId,
      storageKey: "",
      originalFilename: filename,
      mimeType: "image/jpeg",
      width: processed.width,
      height: processed.height,
      variants: {},
      exif: processed.exif ?? null,
    })
    .returning();

  const variants: Record<string, string> = {};
  try {
    for (const variant of IMAGE_VARIANTS) {
      const key = `${siteId}/${asset.id}/${variant.name}.jpg`;
      await storage.put(key, processed.variants[variant.name], "image/jpeg");
      variants[variant.name] = key;
    }

    const [updated] = await db
      .update(assets)
      .set({ storageKey: variants.original, variants })
      .where(eq(assets.id, asset.id))
      .returning();
    return updated;
  } catch (error) {
    await Promise.all(Object.values(variants).map((key) => storage.delete(key)));
    await db.delete(assets).where(eq(assets.id, asset.id));
    throw error;
  }
}
