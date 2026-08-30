import type { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { sites } from "../db/schema.js";

declare module "fastify" {
  interface FastifyRequest {
    site?: typeof sites.$inferSelect;
  }
}

// Small in-memory cache in front of the hostname -> site lookup; sites
// change rarely relative to request volume, and there's no multi-process
// deployment yet to worry about cache coherence across.
const cache = new Map<string, { site: typeof sites.$inferSelect | null; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

// Called whenever a site row changes (e.g. theme update) so the next
// request re-reads it instead of serving a stale cached row for up to
// CACHE_TTL_MS.
export function invalidateTenantCache(): void {
  cache.clear();
}

function extractSubdomain(host: string, baseDomain: string): string | null {
  if (!host.endsWith(`.${baseDomain}`)) return null;
  const subdomain = host.slice(0, -(baseDomain.length + 1));
  if (!subdomain || subdomain.includes(".")) return null; // reject nested subdomains for MVP
  return subdomain;
}

// Shared by resolveTenant (page/API requests) and the ActivityPub module
// (federation.ts), which needs the same Host-header -> site lookup for
// virtual-hosted actor/inbox/outbox requests.
export async function siteForHost(host: string | undefined): Promise<typeof sites.$inferSelect | null> {
  const baseDomain = process.env.BASE_DOMAIN;
  if (!host || !baseDomain) return null;

  const normalizedHost = host.toLowerCase().replace(/\.$/, "");
  const normalizedBaseDomain = baseDomain.toLowerCase().replace(/\.$/, "");

  const cached = cache.get(normalizedHost);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.site;
  }

  const [customDomainSite] = await db
    .select()
    .from(sites)
    .where(eq(sites.customDomain, normalizedHost))
    .limit(1);
  if (customDomainSite) {
    cache.set(normalizedHost, { site: customDomainSite, expiresAt: Date.now() + CACHE_TTL_MS });
    return customDomainSite;
  }

  const subdomain = extractSubdomain(normalizedHost, normalizedBaseDomain);
  if (!subdomain) {
    cache.set(normalizedHost, { site: null, expiresAt: Date.now() + CACHE_TTL_MS });
    return null;
  }

  const [site] = await db.select().from(sites).where(eq(sites.subdomain, subdomain)).limit(1);
  cache.set(normalizedHost, { site: site ?? null, expiresAt: Date.now() + CACHE_TTL_MS });
  return site ?? null;
}

export async function resolveTenant(request: FastifyRequest, reply: FastifyReply) {
  const site = await siteForHost(request.headers.host);
  if (!site) {
    return reply.code(404).send({ error: { code: "not_found", message: "Unknown site." } });
  }
  request.site = site;
}
