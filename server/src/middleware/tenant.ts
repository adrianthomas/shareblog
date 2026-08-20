import type { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { sites } from "../db/schema.js";

declare module "fastify" {
  interface FastifyRequest {
    site?: typeof sites.$inferSelect;
  }
}

// Small in-memory cache in front of the subdomain -> site lookup; sites
// change rarely relative to request volume, and there's no multi-process
// deployment yet to worry about cache coherence across.
const cache = new Map<string, { site: typeof sites.$inferSelect | null; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

// Called whenever a site row changes (e.g. theme update) so the next
// request re-reads it instead of serving a stale cached row for up to
// CACHE_TTL_MS.
export function invalidateTenantCache(subdomain: string): void {
  cache.delete(subdomain);
}

function extractSubdomain(host: string, baseDomain: string): string | null {
  if (!host.endsWith(`.${baseDomain}`)) return null;
  const subdomain = host.slice(0, -(baseDomain.length + 1));
  if (!subdomain || subdomain.includes(".")) return null; // reject nested subdomains for MVP
  return subdomain;
}

export async function resolveTenant(request: FastifyRequest, reply: FastifyReply) {
  const host = request.headers.host;
  const baseDomain = process.env.BASE_DOMAIN;
  if (!host || !baseDomain) {
    return reply.code(404).send({ error: { code: "not_found", message: "Unknown host." } });
  }

  const subdomain = extractSubdomain(host, baseDomain);
  if (!subdomain) {
    return reply.code(404).send({ error: { code: "not_found", message: "Unknown site." } });
  }

  const cached = cache.get(subdomain);
  if (cached && cached.expiresAt > Date.now()) {
    if (!cached.site) {
      return reply.code(404).send({ error: { code: "not_found", message: "No site at this subdomain." } });
    }
    request.site = cached.site;
    return;
  }

  const [site] = await db.select().from(sites).where(eq(sites.subdomain, subdomain)).limit(1);
  cache.set(subdomain, { site: site ?? null, expiresAt: Date.now() + CACHE_TTL_MS });

  if (!site) {
    return reply.code(404).send({ error: { code: "not_found", message: "No site at this subdomain." } });
  }
  request.site = site;
}
