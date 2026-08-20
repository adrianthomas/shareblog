import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { sites, themeValues } from "../db/schema.js";
import { authGuard } from "../middleware/auth-guard.js";
import { slugify } from "../lib/slugify.js";
import { invalidateSitePages } from "../render/page-cache.js";
import { invalidateTenantCache } from "../middleware/tenant.js";

const createSiteSchema = z.object({
  subdomain: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "Subdomain may only contain lowercase letters, numbers, and hyphens."),
  title: z.string().min(1).max(200),
  locale: z
    .string()
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Locale must be a BCP 47 language tag, e.g. \"en\" or \"pt-BR\".")
    .default("en"),
});

const RESERVED_SUBDOMAINS = new Set(["api", "www", "app", "admin", "mail", "ftp"]);

const updateSiteSchema = z.object({
  theme: z.enum(themeValues),
});

export async function siteRoutes(app: FastifyInstance) {
  app.post("/sites", { preHandler: authGuard }, async (request, reply) => {
    const body = createSiteSchema.parse(request.body);
    const subdomain = slugify(body.subdomain);

    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      return reply.code(400).send({ error: { code: "reserved_subdomain", message: "That subdomain is reserved." } });
    }

    if (request.authSite) {
      return reply.code(409).send({ error: { code: "site_exists", message: "This account already has a site." } });
    }

    const [existing] = await db.select().from(sites).where(eq(sites.subdomain, subdomain)).limit(1);
    if (existing) {
      return reply.code(409).send({ error: { code: "subdomain_taken", message: "That subdomain is already taken." } });
    }

    const [site] = await db
      .insert(sites)
      .values({ ownerUserId: request.authUser!.id, subdomain, title: body.title, locale: body.locale })
      .returning();

    return reply.code(201).send({ site });
  });

  // Theme is the only thing settable here today — the iOS app's theme
  // picker is the only caller. Broaden the schema if site settings grow a
  // web dashboard later.
  app.patch("/sites", { preHandler: authGuard }, async (request, reply) => {
    const site = request.authSite;
    if (!site) {
      return reply.code(400).send({ error: { code: "no_site", message: "Create a site first." } });
    }

    const body = updateSiteSchema.parse(request.body);

    const [updated] = await db
      .update(sites)
      .set({ theme: body.theme, updatedAt: new Date() })
      .where(eq(sites.id, site.id))
      .returning();

    invalidateSitePages(site.id);
    invalidateTenantCache(site.subdomain);

    return reply.send({ site: updated });
  });
}
