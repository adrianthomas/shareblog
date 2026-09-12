import type { FastifyInstance } from "fastify";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { contentObjects, dailyVisitCounts } from "../db/schema.js";
import { authGuard } from "../middleware/auth-guard.js";
import { visitSourceLabels, type VisitSource } from "../analytics/visits.js";

function utcPeriodStarts(now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekday = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - weekday + 1);
  return {
    day,
    week: monday.toISOString().slice(0, 10),
    month: `${day.slice(0, 7)}-01`,
    year: `${day.slice(0, 4)}-01-01`,
  };
}

export async function statsRoutes(app: FastifyInstance) {
  app.get("/stats", { preHandler: authGuard }, async (request, reply) => {
    const site = request.authSite;
    if (!site) return reply.code(404).send({ error: { code: "not_found", message: "Site not found." } });

    const starts = utcPeriodStarts();
    const totalFrom = async (start?: string) => {
      const conditions = [eq(dailyVisitCounts.siteId, site.id)];
      if (start) conditions.push(gte(dailyVisitCounts.day, start));
      const [row] = await db
        .select({ value: sql<number>`coalesce(sum(${dailyVisitCounts.visits}), 0)` })
        .from(dailyVisitCounts)
        .where(and(...conditions));
      return Number(row?.value ?? 0);
    };

    const [day, week, month, year, allTime, articleRows, sourceRows] = await Promise.all([
      totalFrom(starts.day),
      totalFrom(starts.week),
      totalFrom(starts.month),
      totalFrom(starts.year),
      totalFrom(),
      db
        .select({
          id: contentObjects.id,
          title: contentObjects.title,
          slug: contentObjects.slug,
          visits: sql<number>`coalesce(sum(${dailyVisitCounts.visits}), 0)`,
        })
        .from(contentObjects)
        .leftJoin(
          dailyVisitCounts,
          and(eq(dailyVisitCounts.contentObjectId, contentObjects.id), eq(dailyVisitCounts.siteId, site.id)),
        )
        .where(and(eq(contentObjects.siteId, site.id), eq(contentObjects.type, "article"), eq(contentObjects.status, "published")))
        .groupBy(contentObjects.id, contentObjects.title, contentObjects.slug)
        .orderBy(desc(sql`sum(${dailyVisitCounts.visits})`)),
      db
        .select({ source: dailyVisitCounts.source, visits: sql<number>`sum(${dailyVisitCounts.visits})` })
        .from(dailyVisitCounts)
        .where(and(eq(dailyVisitCounts.siteId, site.id), ne(dailyVisitCounts.source, "internal")))
        .groupBy(dailyVisitCounts.source)
        .orderBy(desc(sql`sum(${dailyVisitCounts.visits})`)),
    ]);

    return reply.send({
      totals: { day, week, month, year, allTime },
      articles: articleRows.map((row) => ({ ...row, visits: Number(row.visits) })),
      sources: sourceRows.map((row) => ({
        source: row.source,
        label: visitSourceLabels[row.source as VisitSource] ?? "Other websites",
        visits: Number(row.visits),
      })),
      privacy: {
        message: "Aggregate page views only. No cookies or persistent visitor identifiers are used.",
        timeZone: "UTC",
      },
    });
  });
}
