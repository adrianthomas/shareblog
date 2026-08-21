import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import compress from "@fastify/compress";
import etag from "@fastify/etag";
import rateLimit from "@fastify/rate-limit";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, resolve, normalize, extname } from "node:path";
import { authRoutes } from "./routes/auth.js";
import { siteRoutes } from "./routes/sites.js";
import { objectRoutes } from "./routes/objects.js";
import { assetRoutes } from "./routes/assets.js";
import { resolveRoutes } from "./routes/resolve.js";
import { sitePageRoutes } from "./routes/site-pages.js";

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
  const app = Fastify({ logger: true });

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
      if (!filePath.startsWith(baseDir)) {
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
    if (!filePath.startsWith(publicDir)) {
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

  // Public site pages are registered last and are the fallback for any host
  // that resolves to a tenant subdomain; unmatched hosts (including the API
  // host, since "api" is a reserved subdomain) 404 via resolveTenant.
  app.register(sitePageRoutes);

  return app;
}
