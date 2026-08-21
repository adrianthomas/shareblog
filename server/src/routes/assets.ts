import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { assets } from "../db/schema.js";
import { authGuard } from "../middleware/auth-guard.js";
import { storage } from "../storage/index.js";
import { processImage } from "../image/process-image.js";

const VARIANTS = [
  { name: "thumb", width: 400 },
  { name: "medium", width: 1200 },
  { name: "original", width: 2400 },
] as const;

function toAssetResponse(asset: typeof assets.$inferSelect) {
  const variants = asset.variants as Record<string, string>;
  return {
    id: asset.id,
    url: storage.getUrl(variants.original ?? variants.medium ?? asset.storageKey),
    thumbUrl: storage.getUrl(variants.thumb ?? variants.original ?? asset.storageKey),
    width: asset.width,
    height: asset.height,
  };
}

export async function assetRoutes(app: FastifyInstance) {
  app.post("/assets", { preHandler: authGuard }, async (request, reply) => {
    const site = request.authSite;
    if (!site) {
      return reply.code(400).send({ error: { code: "no_site", message: "Create a site before uploading." } });
    }

    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: { code: "no_file", message: "No file provided." } });
    }

    const buffer = await file.toBuffer();
    const processed = await processImage(buffer, VARIANTS.map(({ name, width }) => ({ name, width })));

    const [asset] = await db
      .insert(assets)
      .values({
        siteId: site.id,
        storageKey: "", // filled in below once we know the asset id
        originalFilename: file.filename,
        mimeType: "image/jpeg",
        width: processed.width,
        height: processed.height,
        variants: {},
        exif: processed.exif ?? null,
      })
      .returning();

    const variants: Record<string, string> = {};
    for (const variant of VARIANTS) {
      const key = `${site.id}/${asset.id}/${variant.name}.jpg`;
      await storage.put(key, processed.variants[variant.name], "image/jpeg");
      variants[variant.name] = key;
    }

    const [updated] = await db
      .update(assets)
      .set({ storageKey: variants.original, variants })
      .where(eq(assets.id, asset.id))
      .returning();

    return reply.code(201).send({ asset: toAssetResponse(updated) });
  });

  // Lets a client resolve an assetId (the only thing stored in a Photo
  // object's metadata) back into a usable URL after the fact — the upload
  // response above is otherwise the only place a client ever sees the URL.
  app.get("/assets/:id", { preHandler: authGuard }, async (request, reply) => {
    const site = request.authSite;
    const { id } = request.params as { id: string };
    if (!site) return reply.code(404).send({ error: { code: "not_found", message: "Asset not found." } });

    const [asset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.siteId, site.id)))
      .limit(1);

    if (!asset) return reply.code(404).send({ error: { code: "not_found", message: "Asset not found." } });
    return reply.send({ asset: toAssetResponse(asset) });
  });
}
