import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authGuard } from "../middleware/auth-guard.js";
import { resolveBook } from "../resolvers/book.js";
import { resolveMusic } from "../resolvers/music.js";
import { resolveArticle } from "../resolvers/article.js";

export async function resolveRoutes(app: FastifyInstance) {
  app.post("/resolve/book", { preHandler: authGuard }, async (request, reply) => {
    const { query } = z.object({ query: z.string().min(1) }).parse(request.body);
    try {
      const candidates = await resolveBook(query);
      return reply.send({ candidates });
    } catch (err) {
      request.log.error(err, "book resolver failed");
      return reply.code(502).send({ error: { code: "resolver_failed", message: "Could not look up that book." } });
    }
  });

  app.post("/resolve/music", { preHandler: authGuard }, async (request, reply) => {
    const { url } = z.object({ url: z.string().url() }).parse(request.body);
    try {
      const result = await resolveMusic(url);
      return reply.send(result);
    } catch (err) {
      request.log.error(err, "music resolver failed");
      return reply.code(502).send({ error: { code: "resolver_failed", message: "Could not resolve that music link." } });
    }
  });

  app.post("/resolve/article", { preHandler: authGuard }, async (request, reply) => {
    const { url } = z.object({ url: z.string().url() }).parse(request.body);
    try {
      const result = await resolveArticle(url);
      return reply.send(result);
    } catch (err) {
      request.log.error(err, "article resolver failed");
      return reply.code(502).send({ error: { code: "resolver_failed", message: "Could not read that page." } });
    }
  });
}
