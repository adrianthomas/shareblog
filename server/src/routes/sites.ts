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
  tagline: z.string().max(300).optional(),
  locale: z
    .string()
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Locale must be a BCP 47 language tag, e.g. \"en\" or \"pt-BR\".")
    .default("en"),
});

const RESERVED_SUBDOMAINS = new Set(["api", "www", "app", "admin", "mail", "ftp"]);

const profileLinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  url: z.string().url().max(2_000),
  relMe: z.boolean().optional(),
});

function normalizedDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const customDomainSchema = z
  .string()
  .max(253)
  .transform(normalizedDomain)
  .refine(
    (value) => value === "" || (!value.includes("/") && !value.includes("@") && /^[a-z0-9.-]+(?::\d+)?$/.test(value)),
    "Enter a hostname without a path, such as example.com.",
  );

// Both fields are optional so the iOS app can PATCH just the one it's
// changing (the theme picker and the About editor are separate screens);
// `about` accepts "" to clear an existing About page rather than requiring
// an explicit null, since the client can't distinguish "omit" from "set to
// null" once encodeIfPresent drops nil fields from the request body.
const updateSiteSchema = z
  .object({
    theme: z.enum(themeValues).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    tagline: z.string().max(300).optional(),
    profileName: z.string().max(200).optional(),
    introduction: z.string().max(1_000).optional(),
    location: z.string().max(120).optional(),
    profileImageUrl: z.union([z.string().url().max(2_000), z.literal("")]).optional(),
    profileLinks: z.array(profileLinkSchema).max(20).optional(),
    contactLabel: z.string().max(80).optional(),
    contactUrl: z.union([z.string().url().max(2_000), z.literal("")]).optional(),
    contactLinks: z.array(profileLinkSchema.omit({ relMe: true })).max(20).optional(),
    customDomain: customDomainSchema.optional(),
    about: z.string().max(20_000).optional(),
    federationEnabled: z.boolean().optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "Provide at least one field to update.",
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
      .values({
        ownerUserId: request.authUser!.id,
        subdomain,
        title: body.title,
        tagline: body.tagline || null,
        profileName: body.title,
        locale: body.locale,
      })
      .returning();

    return reply.code(201).send({ site });
  });

  // These settings are edited by the iOS app's theme, About, site, and
  // footer screens. All additions remain optional for older clients.
  app.patch("/sites", { preHandler: authGuard }, async (request, reply) => {
    const site = request.authSite;
    if (!site) {
      return reply.code(400).send({ error: { code: "no_site", message: "Create a site first." } });
    }

    const body = updateSiteSchema.parse(request.body);

    if (body.customDomain) {
      const [existingDomain] = await db.select({ id: sites.id }).from(sites).where(eq(sites.customDomain, body.customDomain)).limit(1);
      if (existingDomain && existingDomain.id !== site.id) {
        return reply.code(409).send({ error: { code: "custom_domain_taken", message: "That custom domain is already in use." } });
      }
    }

    const [updated] = await db
      .update(sites)
      .set({
        ...(body.theme !== undefined ? { theme: body.theme } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.profileName === undefined && body.title !== undefined && site.profileName === site.title
          ? { profileName: body.title }
          : {}),
        ...(body.tagline !== undefined ? { tagline: body.tagline || null } : {}),
        ...(body.profileName !== undefined ? { profileName: body.profileName || null } : {}),
        ...(body.introduction !== undefined ? { introduction: body.introduction || null } : {}),
        ...(body.location !== undefined ? { location: body.location || null } : {}),
        ...(body.profileImageUrl !== undefined ? { profileImageUrl: body.profileImageUrl || null } : {}),
        ...(body.profileLinks !== undefined ? { profileLinks: body.profileLinks } : {}),
        ...(body.contactLabel !== undefined ? { contactLabel: body.contactLabel || null } : {}),
        ...(body.contactUrl !== undefined ? { contactUrl: body.contactUrl || null } : {}),
        ...(body.contactLinks === undefined && (body.contactLabel !== undefined || body.contactUrl !== undefined)
          ? (() => {
              const legacyUrl = body.contactUrl !== undefined ? body.contactUrl : site.contactUrl;
              const legacyLabel = body.contactLabel !== undefined ? body.contactLabel : site.contactLabel;
              return {
                contactLinks: legacyUrl ? [{ label: legacyLabel || "Contact", url: legacyUrl }] : [],
              };
            })()
          : {}),
        ...(body.contactLinks !== undefined ? {
          contactLinks: body.contactLinks,
          // Keep the first contact mirrored for older installed clients.
          contactLabel: body.contactLinks[0]?.label ?? null,
          contactUrl: body.contactLinks[0]?.url ?? null,
        } : {}),
        ...(body.customDomain !== undefined ? { customDomain: body.customDomain || null } : {}),
        ...(body.about !== undefined ? { about: body.about || null } : {}),
        ...(body.federationEnabled !== undefined ? { federationEnabled: body.federationEnabled } : {}),
        updatedAt: new Date(),
      })
      .where(eq(sites.id, site.id))
      .returning();

    invalidateSitePages(site.id);
    invalidateTenantCache();

    return reply.send({ site: updated });
  });
}
