import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, lt, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { contentObjects, contentTypeValues } from "../db/schema.js";
import { authGuard } from "../middleware/auth-guard.js";
import { createObjectSchema, updateObjectSchema } from "../lib/schemas.js";
import { slugify, slugFromBody } from "../lib/slugify.js";
import { invalidateSitePages } from "../render/page-cache.js";

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

export async function objectRoutes(app: FastifyInstance) {
  app.post("/objects", { preHandler: authGuard }, async (request, reply) => {
    const site = request.authSite;
    if (!site) {
      return reply.code(400).send({ error: { code: "no_site", message: "Create a site before publishing." } });
    }

    const body = createObjectSchema.parse(request.body);
    const baseSlug = body.title ? slugify(body.title) : slugFromBody(body.body ?? body.type);
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
    return reply.send({ object });
  });

  app.patch("/objects/:id", { preHandler: authGuard }, async (request, reply) => {
    const site = request.authSite;
    const { id } = request.params as { id: string };
    if (!site) return reply.code(404).send({ error: { code: "not_found", message: "Object not found." } });

    const body = updateObjectSchema.parse(request.body);
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
    return reply.send({ object });
  });

  app.delete("/objects/:id", { preHandler: authGuard }, async (request, reply) => {
    const site = request.authSite;
    const { id } = request.params as { id: string };
    if (!site) return reply.code(404).send();

    await db.delete(contentObjects).where(and(eq(contentObjects.id, id), eq(contentObjects.siteId, site.id)));
    invalidateSitePages(site.id);
    return reply.code(204).send();
  });
}
