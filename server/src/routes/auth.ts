import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { apiTokens, sites } from "../db/schema.js";
import { requestAuthCode, verifyMobileCode, verifyWebMagicLink } from "../auth/magic-code.js";
import { claimOwner } from "../auth/owner-claim.js";
import { generateApiToken, hashToken } from "../auth/tokens.js";
import { authGuard } from "../middleware/auth-guard.js";

const requestCodeSchema = z.object({
  email: z.string().email().toLowerCase(),
  context: z.enum(["web", "mobile"]),
});

const verifyCodeSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().length(6),
  deviceName: z.string().max(120).optional(),
});

const claimOwnerSchema = z.object({
  code: z.string().min(4).max(32),
  deviceName: z.string().max(120).optional(),
});

// Keyed by IP + email so one abusive client can't email-bomb a single
// address forever, and so it can't burn through many addresses from a
// single IP without being throttled per-address either. Uberspace's SMTP
// has its own sending limits — this is what keeps an open self-hosted
// instance from tripping them.
function emailRateLimitKey(request: FastifyRequest): string {
  const body = request.body as { email?: unknown } | undefined;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  return `${request.ip}:${email}`;
}

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/auth/request-code",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "15 minutes", hook: "preHandler", keyGenerator: emailRateLimitKey },
      },
    },
    async (request, reply) => {
      const body = requestCodeSchema.parse(request.body);
      await requestAuthCode(body.email, body.context);
      return reply.code(202).send();
    },
  );

  app.post(
    "/auth/verify-code",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "15 minutes", hook: "preHandler", keyGenerator: emailRateLimitKey },
      },
    },
    async (request, reply) => {
      const body = verifyCodeSchema.parse(request.body);
      const user = await verifyMobileCode(body.email, body.code);
      if (!user) {
        return reply.code(401).send({ error: { code: "invalid_code", message: "Invalid or expired code." } });
      }

      const token = generateApiToken();
      await db.insert(apiTokens).values({
        userId: user.id,
        tokenHash: hashToken(token),
        deviceName: body.deviceName,
      });

      const [site] = await db.select().from(sites).where(eq(sites.ownerUserId, user.id)).limit(1);

      return reply.send({
        token,
        user: { id: user.id, email: user.email },
        site: site ?? null,
      });
    },
  );

  // The QR/manual-entry alternative to the two routes above — redeems a
  // pairing code an interactive `npm run bootstrap-owner` run printed (see
  // db/bootstrap-owner.ts), for first sign-in (or pairing a later device)
  // without an email round-trip. Rate-limited like verify-code above,
  // keyed by IP only since there's no email dimension to this one.
  app.post(
    "/auth/claim-owner",
    { config: { rateLimit: { max: 10, timeWindow: "15 minutes", hook: "preHandler" } } },
    async (request, reply) => {
      const body = claimOwnerSchema.parse(request.body);
      const user = await claimOwner(body.code);
      if (!user) {
        return reply.code(401).send({ error: { code: "invalid_code", message: "Invalid or expired code." } });
      }

      const token = generateApiToken();
      await db.insert(apiTokens).values({
        userId: user.id,
        tokenHash: hashToken(token),
        deviceName: body.deviceName,
      });

      const [site] = await db.select().from(sites).where(eq(sites.ownerUserId, user.id)).limit(1);

      return reply.send({
        token,
        user: { id: user.id, email: user.email },
        site: site ?? null,
      });
    },
  );

  // Web magic-link click-through: verifies and redirects with a session cookie.
  app.get("/auth/magic/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const user = await verifyWebMagicLink(token);
    if (!user) {
      return reply.code(401).send({ error: { code: "invalid_link", message: "Invalid or expired link." } });
    }

    const apiToken = generateApiToken();
    await db.insert(apiTokens).values({
      userId: user.id,
      tokenHash: hashToken(apiToken),
      deviceName: "web",
    });

    reply.setCookie("shareblog_session", apiToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return reply.send({ user: { id: user.id, email: user.email } });
  });

  // Revokes every active token for the account, not just the one used to
  // call this — signing out is meant to end the session everywhere (the
  // token is iCloud-Keychain-synced across the user's own devices, and this
  // is also the only way to kill access from a lost/stolen device).
  app.post("/auth/logout", { preHandler: authGuard }, async (request, reply) => {
    await db
      .update(apiTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiTokens.userId, request.authUser!.id), isNull(apiTokens.revokedAt)));
    return reply.code(204).send();
  });

  app.get("/me", { preHandler: authGuard }, async (request, reply) => {
    return reply.send({ user: request.authUser, site: request.authSite ?? null });
  });
}
