import type { FastifyRequest, FastifyReply } from "fastify";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { apiTokens, users, sites } from "../db/schema.js";
import { hashToken } from "../auth/tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: typeof users.$inferSelect;
    authSite?: typeof sites.$inferSelect | null;
  }
}

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    return reply.code(401).send({ error: { code: "unauthorized", message: "Missing bearer token." } });
  }

  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.tokenHash, tokenHash), isNull(apiTokens.revokedAt)))
    .limit(1);

  if (!row) {
    return reply.code(401).send({ error: { code: "unauthorized", message: "Invalid or revoked token." } });
  }

  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user) {
    return reply.code(401).send({ error: { code: "unauthorized", message: "User not found." } });
  }

  const [site] = await db.select().from(sites).where(eq(sites.ownerUserId, user.id)).limit(1);

  request.authUser = user;
  request.authSite = site ?? null;

  db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, row.id)).catch(() => {});
}
