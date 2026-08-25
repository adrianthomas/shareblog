import Fastify, { type FastifyError } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import compress from "@fastify/compress";
import etag from "@fastify/etag";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, resolve, normalize, extname, sep } from "node:path";
import { authRoutes } from "./routes/auth.js";
import { siteRoutes } from "./routes/sites.js";
import { themeRoutes } from "./routes/themes.js";
import { objectRoutes } from "./routes/objects.js";
import { assetRoutes } from "./routes/assets.js";
import { resolveRoutes } from "./routes/resolve.js";
import { sitePageRoutes } from "./routes/site-pages.js";
import { activityPubRoutes } from "./activitypub/adapter.js";

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const STATIC_EXTENSION_CONTENT_TYPES: Record<string, string> = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

export function buildApp() {
  // Uberspace terminates TLS and reverse-proxies to this app (see
  // UBERSPACE.md's "web backend" setup) — without trustProxy, request.ip
  // resolves to the proxy's own address for every request, which collapses
  // the per-IP rate limits below (and the auth email rate limit in
  // routes/auth.ts) into one shared bucket instead of one per real visitor.
  const app = Fastify({ logger: true, trustProxy: true });

  // Routes generally catch their own risky calls and reply with this
  // {error: {code, message}} envelope directly (see resolve.ts) — this is
  // the fallback for whatever slips through uncaught (a route's own
  // zod .parse(), a rejected promise in objects/assets), so a bug in one
  // handler can't fall through to Fastify's default {statusCode, error,
  // message} shape, which every client here fails to decode and reports
  // as an opaque generic failure instead of the real problem.
  app.setErrorHandler((error: FastifyError | ZodError, request, reply) => {
    if (error instanceof ZodError) {
      const message = error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ");
      return reply.code(400).send({ error: { code: "validation_error", message } });
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error(error, "unhandled error");
      return reply
        .code(statusCode)
        .send({ error: { code: "internal_error", message: "Something went wrong. Please try again." } });
    }

    request.log.warn(error, "request error");
    return reply.code(statusCode).send({ error: { code: error.code ?? "request_error", message: error.message } });
  });

  // No CDN or reverse proxy compressing/caching in front of this on
  // Uberspace — do it in-process. compress skips already-compressed
  // content types (images) automatically based on the response mime type.
  app.register(compress, { global: true });
  app.register(etag);

  app.register(cors, { origin: true });
  app.register(cookie);
  app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

  // Baseline DoS protection for every route; the auth routes set tighter,
  // more specific limits of their own (see routes/auth.ts).
  app.register(rateLimit, { global: true, max: 200, timeWindow: "1 minute" });

  app.register(
    async (api) => {
      api.register(authRoutes);
      api.register(siteRoutes);
      api.register(themeRoutes);
      api.register(objectRoutes);
      api.register(assetRoutes);
      api.register(resolveRoutes);
    },
    { prefix: "/api/v1" },
  );

  if ((process.env.STORAGE_DRIVER ?? "local") === "local") {
    const baseDir = resolve(process.env.LOCAL_STORAGE_DIR ?? "./data/uploads");
    app.get("/files/*", async (request, reply) => {
      const wildcard = (request.params as { "*": string })["*"];
      const filePath = normalize(join(baseDir, wildcard));
      // A bare startsWith(baseDir) would also match a sibling directory
      // that happens to share the prefix (e.g. "../uploads-evil/x" against
      // baseDir ".../data/uploads") — require the full separator so escapes
      // are actually caught.
      if (filePath !== baseDir && !filePath.startsWith(baseDir + sep)) {
        return reply.code(400).send();
      }
      try {
        await stat(filePath);
      } catch {
        return reply.code(404).send();
      }
      const contentType = EXTENSION_CONTENT_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";
      reply.header("cache-control", "public, max-age=31536000, immutable");
      return reply.type(contentType).send(createReadStream(filePath));
    });
  }

  // Bundled static assets (currently just the self-hosted webfont used by
  // the cards theme) — served straight from the repo rather than a CDN so
  // rendering a site never depends on a third-party request.
  const publicDir = resolve(import.meta.dirname, "../public");
  app.get("/static/*", async (request, reply) => {
    const wildcard = (request.params as { "*": string })["*"];
    const filePath = normalize(join(publicDir, wildcard));
    if (filePath !== publicDir && !filePath.startsWith(publicDir + sep)) {
      return reply.code(400).send();
    }
    try {
      await stat(filePath);
    } catch {
      return reply.code(404).send();
    }
    const contentType = STATIC_EXTENSION_CONTENT_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";
    reply.header("cache-control", "public, max-age=31536000, immutable");
    return reply.type(contentType).send(createReadStream(filePath));
  });

  // ActivityPub surface (WebFinger, actor, inbox) — registered on the
  // tenant-routed side like sitePageRoutes, not under /api/v1, since each
  // site's Fediverse identity lives on its own public host
  // (<subdomain>.<BASE_DOMAIN>), not the separate api.<domain> host.
  // Dispatchers in activitypub/federation.ts resolve the site straight
  // from the request's Host header (Fedify's virtual-hosting support),
  // the same lookup resolveTenant uses. See activitypub/adapter.ts for
  // why this is a hand-rolled bridge rather than the official
  // @fedify/fastify plugin.
  app.register(activityPubRoutes);

  // Public site pages are registered last and are the fallback for any host
  // that resolves to a tenant subdomain; unmatched hosts (including the API
  // host, since "api" is a reserved subdomain) 404 via resolveTenant.
  app.register(sitePageRoutes);

  return app;
}
