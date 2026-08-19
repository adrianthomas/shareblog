import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { sites } from "../db/schema.js";
import { authGuard } from "../middleware/auth-guard.js";
import { slugify } from "../lib/slugify.js";

const createSiteSchema = z.object({
  subdomain: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "Subdomain may only contain lowercase letters, numbers, and hyphens."),
  title: z.string().min(1).max(200),
});

const RESERVED_SUBDOMAINS = new Set(["api", "www", "app", "admin", "mail", "ftp"]);

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
      .values({ ownerUserId: request.authUser!.id, subdomain, title: body.title })
      .returning();

    return reply.code(201).send({ site });
  });
}
