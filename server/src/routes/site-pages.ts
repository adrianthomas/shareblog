import type { FastifyInstance } from "fastify";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { contentObjects } from "../db/schema.js";
import type { ContentType } from "../db/schema.js";
import { resolveTenant } from "../middleware/tenant.js";
import {
  renderList,
  renderObjectPage,
  renderFeed,
  renderLandingPage,
  renderAboutPage,
  PATH_PREFIX,
} from "../render/render.js";
import { getCachedPage, setCachedPage, PAGE_CACHE_TTL_MS } from "../render/page-cache.js";
import { t, type MessageKey } from "../render/i18n.js";

async function publishedObjects(siteId: string, type?: ContentType) {
  const conditions = [eq(contentObjects.siteId, siteId), eq(contentObjects.status, "published")];
  if (type) conditions.push(eq(contentObjects.type, type));
  return db
    .select()
    .from(contentObjects)
    .where(and(...conditions))
    .orderBy(desc(contentObjects.publishedAt));
}

// Nav paths (e.g. "/posts") for categories that have at least one published
// post, so the site nav can hide empty categories instead of linking to a
// "nothing here yet" page.
async function publishedNavPaths(siteId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ type: contentObjects.type })
    .from(contentObjects)
    .where(and(eq(contentObjects.siteId, siteId), eq(contentObjects.status, "published")));
  return rows.map((row) => `/${PATH_PREFIX[row.type]}`);
}

function sendHtml(reply: import("fastify").FastifyReply, html: string) {
  return reply
    .header("content-type", "text/html; charset=utf-8")
    .header("cache-control", `public, max-age=${PAGE_CACHE_TTL_MS / 1000}`)
    .send(html);
}

// Serves a cached render if one exists, otherwise renders, caches, and
// serves. Keyed by site + full request URL so listing pages, detail pages,
// and pagination/query variants all get distinct entries.
async function sendCachedHtml(
  request: import("fastify").FastifyRequest,
  reply: import("fastify").FastifyReply,
  siteId: string,
  render: () => Promise<string>,
) {
  const cached = getCachedPage(siteId, request.raw.url ?? request.url);
  if (cached) return sendHtml(reply, cached.body);

  const html = await render();
  setCachedPage(siteId, request.raw.url ?? request.url, html, "text/html; charset=utf-8");
  return sendHtml(reply, html);
}

function sendXml(reply: import("fastify").FastifyReply, xml: string) {
  return reply
    .header("content-type", "application/rss+xml; charset=utf-8")
    .header("cache-control", `public, max-age=${PAGE_CACHE_TTL_MS / 1000}`)
    .send(xml);
}

async function sendCachedFeed(
  request: import("fastify").FastifyRequest,
  reply: import("fastify").FastifyReply,
  siteId: string,
  render: () => Promise<string>,
) {
  const cached = getCachedPage(siteId, request.raw.url ?? request.url);
  if (cached) return sendXml(reply, cached.body);

  const xml = await render();
  setCachedPage(siteId, request.raw.url ?? request.url, xml, "application/rss+xml; charset=utf-8");
  return sendXml(reply, xml);
}

const LISTING_TYPES: Array<{ path: string; type?: ContentType; titleKey: MessageKey }> = [
  { path: "/posts", type: "thought", titleKey: "posts" },
  { path: "/articles", type: "article", titleKey: "articles" },
  { path: "/books", type: "book", titleKey: "books" },
  { path: "/music", type: "music", titleKey: "music" },
  { path: "/photos", type: "photo", titleKey: "photos" },
  { path: "/quotes", type: "quote", titleKey: "quotes" },
];

const DETAIL_TYPES: Array<{ prefix: string; type: ContentType }> = [
  { prefix: "/posts", type: "thought" },
  { prefix: "/articles", type: "article" },
  { prefix: "/books", type: "book" },
  { prefix: "/music", type: "music" },
  { prefix: "/photos", type: "photo" },
  { prefix: "/quotes", type: "quote" },
];

export async function sitePageRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    if (request.headers.host === process.env.BASE_DOMAIN) {
      return sendHtml(reply, renderLandingPage());
    }
    await resolveTenant(request, reply);
    if (reply.sent) return;
    const site = request.site!;
    return sendCachedHtml(request, reply, site.id, async () => {
      const [objects, availablePaths] = await Promise.all([publishedObjects(site.id), publishedNavPaths(site.id)]);
      return renderList(site, site.title, objects.slice(0, 20), "/", availablePaths);
    });
  });

  // Linked from the site footer (see Layout.tsx) only when about is set;
  // still guard the route itself in case a link to it is shared directly
  // after the owner clears the text back out.
  app.get("/about", { preHandler: resolveTenant }, async (request, reply) => {
    const site = request.site!;
    if (!site.about || !site.about.trim()) {
      return reply.code(404).send("Not found");
    }
    return sendCachedHtml(request, reply, site.id, async () => renderAboutPage(site));
  });

  app.get("/feed.xml", { preHandler: resolveTenant }, async (request, reply) => {
    const site = request.site!;
    return sendCachedFeed(request, reply, site.id, async () => {
      const objects = await publishedObjects(site.id);
      return renderFeed(site, objects.slice(0, 50));
    });
  });

  for (const listing of LISTING_TYPES) {
    app.get(listing.path, { preHandler: resolveTenant }, async (request, reply) => {
      const site = request.site!;
      return sendCachedHtml(request, reply, site.id, async () => {
        const [objects, availablePaths] = await Promise.all([
          publishedObjects(site.id, listing.type),
          publishedNavPaths(site.id),
        ]);
        return renderList(site, t(site.locale, listing.titleKey), objects, listing.path, availablePaths);
      });
    });

    app.get(`${listing.path}/feed.xml`, { preHandler: resolveTenant }, async (request, reply) => {
      const site = request.site!;
      return sendCachedFeed(request, reply, site.id, async () => {
        const objects = await publishedObjects(site.id, listing.type);
        const path = `${listing.path}/feed.xml`;
        return renderFeed(site, objects.slice(0, 50), { title: t(site.locale, listing.titleKey), path });
      });
    });
  }

  for (const detail of DETAIL_TYPES) {
    app.get(`${detail.prefix}/:slug`, { preHandler: resolveTenant }, async (request, reply) => {
      const site = request.site!;
      const { slug } = request.params as { slug: string };

      const cached = getCachedPage(site.id, request.raw.url ?? request.url);
      if (cached) return sendHtml(reply, cached.body);

      const [object] = await db
        .select()
        .from(contentObjects)
        .where(
          and(
            eq(contentObjects.siteId, site.id),
            eq(contentObjects.type, detail.type),
            eq(contentObjects.slug, slug),
            eq(contentObjects.status, "published"),
          ),
        )
        .limit(1);

      if (!object) {
        return reply.code(404).send("Not found");
      }
      const availablePaths = await publishedNavPaths(site.id);
      const html = await renderObjectPage(site, object, `${detail.prefix}/${slug}`, availablePaths);
      setCachedPage(site.id, request.raw.url ?? request.url, html, "text/html; charset=utf-8");
      return sendHtml(reply, html);
    });
  }
}
