import type { FastifyInstance } from "fastify";
import { and, eq, desc, count, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";
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
  renderWorkPage,
  renderContactPage,
  renderAboutProductPage,
  renderReleaseHistoryPage,
  renderArchivePage,
  searchForm,
  siteOrigin,
  objectPath,
  PATH_PREFIX,
} from "../render/render.js";
import { getCachedPage, setCachedPage, PAGE_CACHE_TTL_MS } from "../render/page-cache.js";
import { t, type MessageKey } from "../render/i18n.js";
import { siteForHost } from "../middleware/tenant.js";
import { workPageEnabled } from "../lib/work-page.js";

const PAGE_SIZE = 20;

const pageQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(10_000).default(1) });

async function publishedObjects(siteId: string, type?: ContentType, limit?: number, offset?: number) {
  const conditions = [eq(contentObjects.siteId, siteId), eq(contentObjects.status, "published")];
  if (type) conditions.push(eq(contentObjects.type, type));
  const query = db
    .select()
    .from(contentObjects)
    .where(and(...conditions))
    .orderBy(desc(contentObjects.publishedAt));
  return limit === undefined ? query : query.limit(limit).offset(offset ?? 0);
}

async function publishedCount(siteId: string, type?: ContentType): Promise<number> {
  const conditions = [eq(contentObjects.siteId, siteId), eq(contentObjects.status, "published")];
  if (type) conditions.push(eq(contentObjects.type, type));
  const [row] = await db.select({ value: count() }).from(contentObjects).where(and(...conditions));
  return row?.value ?? 0;
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
  { path: "/links", type: "link", titleKey: "links" },
  { path: "/books", type: "book", titleKey: "books" },
  { path: "/music", type: "music", titleKey: "music" },
  { path: "/photos", type: "photo", titleKey: "photos" },
  { path: "/quotes", type: "quote", titleKey: "quotes" },
];

const DETAIL_TYPES: Array<{ prefix: string; type: ContentType }> = [
  { prefix: "/posts", type: "thought" },
  { prefix: "/articles", type: "article" },
  { prefix: "/links", type: "link" },
  { prefix: "/books", type: "book" },
  { prefix: "/music", type: "music" },
  { prefix: "/photos", type: "photo" },
  { prefix: "/quotes", type: "quote" },
];

export async function sitePageRoutes(app: FastifyInstance) {
  // Once a site claims a canonical custom domain, keep the deployment
  // subdomain as a working alias but redirect ordinary public page requests
  // so readers, crawlers, and copied links converge on one origin. ActivityPub
  // routes are registered outside this plugin and keep handling signatures on
  // the exact host they were addressed to.
  app.addHook("preHandler", async (request, reply) => {
    if (request.method !== "GET" && request.method !== "HEAD") return;
    const site = await siteForHost(request.headers.host);
    if (!site?.customDomain) return;
    const requestHost = request.headers.host?.toLowerCase().replace(/\.$/, "");
    if (requestHost !== site.customDomain) {
      return reply.redirect(`${siteOrigin(site)}${request.url}`, 308);
    }
  });

  app.get("/", async (request, reply) => {
    if (request.headers.host === process.env.BASE_DOMAIN) {
      const apexSite = await siteForHost(request.headers.host);
      if (!apexSite) return sendHtml(reply, renderLandingPage());
    }
    await resolveTenant(request, reply);
    if (reply.sent) return;
    const site = request.site!;
    const { page } = pageQuerySchema.parse(request.query);
    return sendCachedHtml(request, reply, site.id, async () => {
      const [objects, total, availablePaths] = await Promise.all([
        publishedObjects(site.id, undefined, PAGE_SIZE, (page - 1) * PAGE_SIZE),
        publishedCount(site.id),
        publishedNavPaths(site.id),
      ]);
      return renderList(site, site.title, objects, "/", availablePaths, {
        page,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        metadata: { path: page > 1 ? `/?page=${page}` : "/", description: site.tagline ?? site.introduction ?? undefined, type: "profile" },
      });
    });
  });

  app.get("/robots.txt", { preHandler: resolveTenant }, async (request, reply) => {
    const site = request.site!;
    return reply
      .type("text/plain; charset=utf-8")
      .header("cache-control", `public, max-age=${PAGE_CACHE_TTL_MS / 1000}`)
      .send(`User-agent: *\nAllow: /\nSitemap: ${siteOrigin(site)}/sitemap.xml\n`);
  });

  app.get("/sitemap.xml", { preHandler: resolveTenant }, async (request, reply) => {
    const site = request.site!;
    const [objects, paths] = await Promise.all([publishedObjects(site.id), publishedNavPaths(site.id)]);
    const staticPaths = [
      "/",
      "/archive",
      ...(workPageEnabled() ? ["/my-work", "/contact"] : []),
      "/about",
      ...paths,
    ];
    const urls = [...staticPaths, ...objects.map((object) => `/${objectPath(object)}`)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
      .map((path) => `<url><loc>${siteOrigin(site)}${path}</loc></url>`)
      .join("")}</urlset>`;
    return reply
      .type("application/xml; charset=utf-8")
      .header("cache-control", `public, max-age=${PAGE_CACHE_TTL_MS / 1000}`)
      .send(xml);
  });

  app.get("/archive", { preHandler: resolveTenant }, async (request, reply) => {
    const site = request.site!;
    return sendCachedHtml(request, reply, site.id, async () => {
      const [rows, availablePaths] = await Promise.all([
        db.select({ publishedAt: contentObjects.publishedAt }).from(contentObjects)
          .where(and(eq(contentObjects.siteId, site.id), eq(contentObjects.status, "published")))
          .orderBy(desc(contentObjects.publishedAt)),
        publishedNavPaths(site.id),
      ]);
      const grouped = new Map<number, Map<number, number>>();
      for (const row of rows) {
        if (!row.publishedAt) continue;
        const year = row.publishedAt.getUTCFullYear();
        const month = row.publishedAt.getUTCMonth() + 1;
        const months = grouped.get(year) ?? new Map<number, number>();
        months.set(month, (months.get(month) ?? 0) + 1);
        grouped.set(year, months);
      }
      const groups = [...grouped.entries()].map(([year, months]) => ({
        year,
        months: [...months.entries()].map(([month, monthCount]) => ({
          month,
          count: monthCount,
          label: new Intl.DateTimeFormat(site.locale, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1))),
        })),
      }));
      return renderArchivePage(site, groups, availablePaths);
    });
  });

  app.get("/archive/:year/:month", { preHandler: resolveTenant }, async (request, reply) => {
    const site = request.site!;
    const params = z.object({ year: z.coerce.number().int().min(1970).max(9999), month: z.coerce.number().int().min(1).max(12) }).parse(request.params);
    const { page } = pageQuerySchema.parse(request.query);
    const start = new Date(Date.UTC(params.year, params.month - 1, 1));
    const end = new Date(Date.UTC(params.year, params.month, 1));
    const conditions = and(
      eq(contentObjects.siteId, site.id), eq(contentObjects.status, "published"),
      gte(contentObjects.publishedAt, start), lt(contentObjects.publishedAt, end),
    );
    const [objects, countRows, availablePaths] = await Promise.all([
      db.select().from(contentObjects).where(conditions).orderBy(desc(contentObjects.publishedAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
      db.select({ value: count() }).from(contentObjects).where(conditions),
      publishedNavPaths(site.id),
    ]);
    if (!objects.length && page === 1) return reply.code(404).send("Not found");
    const title = new Intl.DateTimeFormat(site.locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(start);
    const path = `/archive/${params.year}/${String(params.month).padStart(2, "0")}`;
    return sendCachedHtml(request, reply, site.id, async () => renderList(site, title, objects, path, availablePaths, {
      page,
      totalPages: Math.max(1, Math.ceil((countRows[0]?.value ?? 0) / PAGE_SIZE)),
      metadata: { path: page > 1 ? `${path}?page=${page}` : path, description: `${title} — ${site.title}` },
    }));
  });

  app.get("/search", { preHandler: resolveTenant }, async (request, reply) => {
    const site = request.site!;
    const { q = "", page } = z.object({ q: z.string().trim().max(200).default(""), page: z.coerce.number().int().min(1).max(10_000).default(1) }).parse(request.query);
    const searchCondition = sql`lower(coalesce(${contentObjects.title}, '') || ' ' || coalesce(${contentObjects.body}, '') || ' ' || coalesce(${contentObjects.sourceUrl}, '') || ' ' || ${contentObjects.metadata}) like ${`%${q.toLowerCase()}%`}`;
    const conditions = and(eq(contentObjects.siteId, site.id), eq(contentObjects.status, "published"), searchCondition);
    const [objects, countRows, availablePaths] = q ? await Promise.all([
      db.select().from(contentObjects).where(conditions).orderBy(desc(contentObjects.publishedAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
      db.select({ value: count() }).from(contentObjects).where(conditions),
      publishedNavPaths(site.id),
    ]) : [[], [{ value: 0 }], await publishedNavPaths(site.id)];
    return sendCachedHtml(request, reply, site.id, async () => renderList(site, t(site.locale, "search"), objects, "/search", availablePaths, {
      page,
      totalPages: Math.max(1, Math.ceil((countRows[0]?.value ?? 0) / PAGE_SIZE)),
      query: q ? { q } : {},
      prefix: searchForm(site, q),
      metadata: { path: q ? `/search?q=${encodeURIComponent(q)}` : "/search", noIndex: true },
    }));
  });

  // The About page contains both the structured identity profile and the
  // optional long-form About text. Hide it only when both are empty.
  app.get("/about", { preHandler: resolveTenant }, async (request, reply) => {
    const site = request.site!;
    return sendCachedHtml(request, reply, site.id, async () => renderAboutPage(site));
  });

  app.get("/my-work", { preHandler: resolveTenant }, async (request, reply) => {
    if (!workPageEnabled()) return reply.code(404).send("Not found");
    const site = request.site!;
    return sendCachedHtml(request, reply, site.id, async () => renderWorkPage(site));
  });

  app.get("/contact", { preHandler: resolveTenant }, async (request, reply) => {
    if (!workPageEnabled()) return reply.code(404).send("Not found");
    const site = request.site!;
    return sendCachedHtml(request, reply, site.id, async () => renderContactPage(site));
  });

  // Unlike /about, always available — these are product info (what
  // Shareblog is, what's changed about it), not something tied to whether
  // this site's owner has written a bio.
  app.get("/about-shareblog", { preHandler: resolveTenant }, async (request, reply) => {
    const site = request.site!;
    return sendCachedHtml(request, reply, site.id, async () => renderAboutProductPage(site));
  });

  app.get("/changelog", { preHandler: resolveTenant }, async (request, reply) => {
    const site = request.site!;
    return sendCachedHtml(request, reply, site.id, async () => renderReleaseHistoryPage(site));
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
      const { page } = pageQuerySchema.parse(request.query);
      return sendCachedHtml(request, reply, site.id, async () => {
        const [objects, total, availablePaths] = await Promise.all([
          publishedObjects(site.id, listing.type, PAGE_SIZE, (page - 1) * PAGE_SIZE),
          publishedCount(site.id, listing.type),
          publishedNavPaths(site.id),
        ]);
        return renderList(site, t(site.locale, listing.titleKey), objects, listing.path, availablePaths, {
          page,
          totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
          metadata: { path: page > 1 ? `${listing.path}?page=${page}` : listing.path },
        });
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

  // WordPress posts commonly lived at /<slug>; Shareblog articles live at
  // /articles/<slug>. Imported metadata supplies a narrow redirect map after
  // all real routes, so historical links survive without shadowing pages.
  app.get("/*", { preHandler: resolveTenant }, async (request, reply) => {
    const site = request.site!;
    const url = new URL(request.url, "http://shareblog.invalid");
    const legacyPath = url.pathname.replace(/\/$/, "") || "/";
    const [object] = await db
      .select()
      .from(contentObjects)
      .where(and(
        eq(contentObjects.siteId, site.id),
        eq(contentObjects.status, "published"),
        sql`json_extract(${contentObjects.metadata}, '$.import.legacyPath') = ${legacyPath}`,
      ))
      .limit(1);
    if (!object) return reply.code(404).send("Not found");
    const target = `/${objectPath(object)}${url.search}`;
    if (target === `${legacyPath}${url.search}`) return reply.code(404).send("Not found");
    return reply.redirect(target, 308);
  });
}
