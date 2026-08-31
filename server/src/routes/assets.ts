import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { assets } from "../db/schema.js";
import { authGuard } from "../middleware/auth-guard.js";
import { createImageAsset, imageAssetResponse } from "../lib/image-assets.js";

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
    const asset = await createImageAsset(site.id, buffer, file.filename);
    return reply.code(201).send({ asset: imageAssetResponse(asset) });
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
    return reply.send({ asset: imageAssetResponse(asset) });
  });
}
