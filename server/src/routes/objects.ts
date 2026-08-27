import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, inArray, lt, desc, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { assets, contentObjects, contentTypeValues } from "../db/schema.js";
import { authGuard } from "../middleware/auth-guard.js";
import { createObjectSchema, updateObjectSchema } from "../lib/schemas.js";
import { slugify, slugFromBody } from "../lib/slugify.js";
import { invalidateSitePages } from "../render/page-cache.js";
import { storage } from "../storage/index.js";
import { deliverCreateActivity } from "../activitypub/federation.js";

// Structured image references live in metadata, while inline Article and
// Thought images are stored only as rendered /files/... URLs in the body.
// assets.contentObjectId is never set on upload, so deletion has to resolve
// both representations by hand.
function metadataAssetIds(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const record = metadata as Record<string, unknown>;
  return [record.assetId, record.coverAssetId].filter((value): value is string => typeof value === "string");
}

type Asset = typeof assets.$inferSelect;

function assetStorageKeys(asset: Asset): string[] {
  const variants = asset.variants as Record<string, string>;
  return [...new Set([asset.storageKey, ...Object.values(variants)].filter(Boolean))];
}

function bodyReferencesAsset(body: string | null, asset: Asset): boolean {
  if (!body) return false;
  return assetStorageKeys(asset).some((key) => {
    // The first check follows the configured storage adapter. The /files/
    // fallback also recognizes posts written before API_BASE_URL changed.
    return body.includes(storage.getUrl(key)) || body.includes(`/files/${key}`);
  });
}

function objectReferencesAsset(
  object: Pick<typeof contentObjects.$inferSelect, "metadata" | "body">,
  asset: Asset,
): boolean {
  return metadataAssetIds(object.metadata).includes(asset.id) || bodyReferencesAsset(object.body, asset);
}

async function deleteAsset(asset: Asset): Promise<void> {
  await Promise.all(assetStorageKeys(asset).map((key) => storage.delete(key)));
  await db.delete(assets).where(eq(assets.id, asset.id));
}

// createObjectSchema/updateObjectSchema only check that assetId/coverAssetId
// are UUID-shaped, not that they belong to the caller's own site — without
// this, an object could be created (or edited) referencing another site's
// asset, which combined with the delete above would let one site trigger
// deletion of another site's files the moment multi-tenancy opens up (only
// one account can exist today, so this is unreachable in practice — but
// cheap to close now while it's still just a code review finding).
async function assertOwnedAssets(siteId: string, metadata: unknown): Promise<void> {
  const ids = [...new Set(metadataAssetIds(metadata))];
  if (ids.length === 0) return;
  const owned = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(inArray(assets.id, ids), eq(assets.siteId, siteId)));
  if (owned.length !== ids.length) {
    throw Object.assign(new Error("Referenced asset does not belong to this site."), { statusCode: 400 });
  }
}

type CreateObjectBody = z.infer<typeof createObjectSchema>;

function normalizeLegacyArticle(body: CreateObjectBody): CreateObjectBody {
  if (body.type !== "thought" || body.title || !body.body) return body;
  const normalizedBody = body.body.replace(/\r\n/g, "\n");
  const match = normalizedBody.match(/^#\s+([^\n]+)(?:\n+([\s\S]*))?$/);
  if (!match) return body;
  return {
    ...body,
    type: "article",
    title: match[1].trim(),
    body: match[2]?.trim() || undefined,
  };
}

function clientSupportsLinkContentType(header: string | string[] | undefined): boolean {
  const value = Array.isArray(header) ? header.join(",") : header;
  return value?.split(",").map((feature) => feature.trim()).includes("link-content-type") ?? false;
}

async function uniqueSlug(siteId: string, base: string): Promise<string> {
  let slug = base;
  let suffix = 1;
  // Small table per site; a loop is simpler and plenty fast at MVP scale.
  while (true) {
    const [existing] = await db
      .select({ id: contentObjects.id })
      .from(contentObjects)
      .where(and(eq(contentObjects.siteId, siteId), eq(contentObjects.slug, slug)))
      .limit(1);
    if (!existing) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

// Picks the text a new object's slug is based on. Most types have a real
// title; a Thought or Quote falls back to its body. A Photo has neither —
// its only human-readable text is the caption tucked away in metadata — so
// without this special case every photo's slug fell back to the literal
// word "photo" (deduped only by uniqueSlug's auto-incrementing suffix),
// giving every photo post on a site the same meaningless "/photos/photo-7"
// permalink shape instead of one reflecting what the photo actually is.
function slugSourceText(body: z.infer<typeof createObjectSchema>): string {
  if (body.title) return body.title;
  if (body.type === "photo") {
    const caption = (body.metadata as Record<string, unknown>).caption;
    if (typeof caption === "string" && caption.trim()) return caption;
  }
  return body.body ?? body.type;
}

export async function objectRoutes(app: FastifyInstance) {
  app.post("/objects", { preHandler: authGuard }, async (request, reply) => {
    const site = request.authSite;
    if (!site) {
      return reply.code(400).send({ error: { code: "no_site", message: "Create a site before publishing." } });
    }

    const body = normalizeLegacyArticle(createObjectSchema.parse(request.body));
    await assertOwnedAssets(site.id, body.metadata);
    const slugSource = slugSourceText(body);
    const baseSlug = body.title ? slugify(slugSource) : slugFromBody(slugSource);
    const slug = await uniqueSlug(site.id, baseSlug || body.type);

    const [object] = await db
      .insert(contentObjects)
      .values({
        siteId: site.id,
        type: body.type,
        slug,
        title: body.title,
        body: body.body,
        status: body.status,
        sourceUrl: body.sourceUrl,
        metadata: body.metadata,
        publishedAt: body.status === "published" ? new Date() : null,
      })
      .returning();

    invalidateSitePages(site.id);
    if (object.status === "published") {
      await deliverCreateActivity(site, object);
    }
    return reply.code(201).send({ object });
  });

  app.get("/objects", { preHandler: authGuard }, async (request, reply) => {
    const site = request.authSite;
    if (!site) return reply.send({ objects: [], nextCursor: null });

    const query = z
      .object({
        type: z.enum(contentTypeValues).optional(),
        status: z.enum(["draft", "published"]).optional(),
        cursor: z.string().optional(),
        limit: z.coerce.number().min(1).max(100).default(20),
      })
      .parse(request.query);

    const conditions = [eq(contentObjects.siteId, site.id)];
    if (query.type) conditions.push(eq(contentObjects.type, query.type));
    if (query.status) conditions.push(eq(contentObjects.status, query.status));
    if (query.cursor) conditions.push(lt(contentObjects.createdAt, new Date(query.cursor)));
    if (!query.type && !clientSupportsLinkContentType(request.headers["x-shareblog-features"])) {
      conditions.push(ne(contentObjects.type, "link"));
    }

    const rows = await db
      .select()
      .from(contentObjects)
      .where(and(...conditions))
      .orderBy(desc(contentObjects.createdAt))
      .limit(query.limit);

    const nextCursor = rows.length === query.limit ? rows[rows.length - 1].createdAt.toISOString() : null;
    return reply.send({ objects: rows, nextCursor });
  });

  app.get("/objects/:id", { preHandler: authGuard }, async (request, reply) => {
    const site = request.authSite;
    const { id } = request.params as { id: string };
    if (!site) return reply.code(404).send({ error: { code: "not_found", message: "Object not found." } });

    const [object] = await db
      .select()
      .from(contentObjects)
      .where(and(eq(contentObjects.id, id), eq(contentObjects.siteId, site.id)))
      .limit(1);

    if (!object) return reply.code(404).send({ error: { code: "not_found", message: "Object not found." } });
    if (object.type === "link" && !clientSupportsLinkContentType(request.headers["x-shareblog-features"])) {
      return reply.code(404).send({ error: { code: "not_found", message: "Object not found." } });
    }
    return reply.send({ object });
  });

  app.patch("/objects/:id", { preHandler: authGuard }, async (request, reply) => {
    const site = request.authSite;
    const { id } = request.params as { id: string };
    if (!site) return reply.code(404).send({ error: { code: "not_found", message: "Object not found." } });

    const body = updateObjectSchema.parse(request.body);
    if (body.metadata !== undefined) {
      await assertOwnedAssets(site.id, body.metadata);
    }
    const [existing] = await db
      .select()
      .from(contentObjects)
      .where(and(eq(contentObjects.id, id), eq(contentObjects.siteId, site.id)))
      .limit(1);
    if (!existing) return reply.code(404).send({ error: { code: "not_found", message: "Object not found." } });

    const becomingPublished = body.status === "published" && existing.status !== "published";

    const [object] = await db
      .update(contentObjects)
      .set({
        ...body,
        metadata: body.metadata ?? undefined,
        publishedAt: becomingPublished ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(contentObjects.id, id))
      .returning();

    invalidateSitePages(site.id);
    if (becomingPublished) {
      await deliverCreateActivity(site, object);
    }
    return reply.send({ object });
  });

  app.delete("/objects/:id", { preHandler: authGuard }, async (request, reply) => {
    const site = request.authSite;
    const { id } = request.params as { id: string };
    if (!site) return reply.code(404).send();

    const [existing] = await db
      .select()
      .from(contentObjects)
      .where(and(eq(contentObjects.id, id), eq(contentObjects.siteId, site.id)))
      .limit(1);
    if (!existing) return reply.code(404).send();

    const siteAssets = await db.select().from(assets).where(eq(assets.siteId, site.id));
    const referencedAssets = siteAssets.filter((asset) => objectReferencesAsset(existing, asset));

    // Assets normally belong to one post, but the API permits the same
    // assetId/URL to be reused. Keep a shared asset until its final
    // referencing post is deleted rather than breaking the survivor.
    if (referencedAssets.length > 0) {
      const otherObjects = await db
        .select({ metadata: contentObjects.metadata, body: contentObjects.body })
        .from(contentObjects)
        .where(and(eq(contentObjects.siteId, site.id), ne(contentObjects.id, id)));
      const orphanedAssets = referencedAssets.filter(
        (asset) => !otherObjects.some((object) => objectReferencesAsset(object, asset)),
      );
      await Promise.all(orphanedAssets.map(deleteAsset));
    }
    await db.delete(contentObjects).where(eq(contentObjects.id, id));
    invalidateSitePages(site.id);
    return reply.code(204).send();
  });
}
