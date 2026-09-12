import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { classifyReferrer, shouldCountVisit } from "../src/analytics/visits.js";
import { buildApp } from "../src/app.js";
import { hashToken } from "../src/auth/tokens.js";
import { db } from "../src/db/client.js";
import { apiTokens, contentObjects, dailyVisitCounts, sites, users } from "../src/db/schema.js";

test("referrers are reduced to coarse source categories", () => {
  assert.equal(classifyReferrer(undefined, "example.com"), "direct");
  assert.equal(classifyReferrer("https://example.com/articles/one", "example.com"), "internal");
  assert.equal(classifyReferrer("https://www.google.com/search?q=private", "example.com"), "search");
  assert.equal(classifyReferrer("https://bsky.app/profile/person/post/secret", "example.com"), "bluesky");
  assert.equal(classifyReferrer("https://small-personal-site.example/a/private/path", "example.com"), "other");
});

test("privacy signals, prefetches, bots, and non-GET requests are not counted", () => {
  const request = (overrides: Record<string, unknown> = {}) => ({ method: "GET", headers: {}, ...overrides }) as never;
  assert.equal(shouldCountVisit(request()), true);
  assert.equal(shouldCountVisit(request({ headers: { dnt: "1" } })), false);
  assert.equal(shouldCountVisit(request({ headers: { "sec-gpc": "1" } })), false);
  assert.equal(shouldCountVisit(request({ headers: { purpose: "prefetch" } })), false);
  assert.equal(shouldCountVisit(request({ headers: { "user-agent": "ExampleBot/1.0" } })), false);
  assert.equal(shouldCountVisit(request({ method: "HEAD" })), false);
});

test("public HTML visits flow into the authenticated aggregate stats response", async () => {
  process.env.BASE_DOMAIN = "stats.test";
  const suffix = randomUUID().slice(0, 8);
  const userId = randomUUID();
  const siteId = randomUUID();
  const articleId = randomUUID();
  const unreadArticleId = randomUUID();
  const token = `stats-token-${suffix}`;
  await db.insert(users).values({ id: userId, email: `stats-${suffix}@example.com` });
  await db.insert(sites).values({ id: siteId, ownerUserId: userId, subdomain: `stats-${suffix}`, title: "Stats" });
  await db.insert(apiTokens).values({ userId, tokenHash: hashToken(token) });
  await db.insert(contentObjects).values({
    id: articleId,
    siteId,
    type: "article",
    slug: "measured-article",
    title: "Measured article",
    status: "published",
    publishedAt: new Date(),
  });
  await db.insert(contentObjects).values({
    id: unreadArticleId,
    siteId,
    type: "article",
    slug: "unread-article",
    title: "Unread article",
    status: "published",
    publishedAt: new Date(),
  });

  const app = buildApp();
  const host = `stats-${suffix}.stats.test`;
  try {
    const home = await app.inject({ method: "GET", url: "/", headers: { host, "user-agent": "Safari", referer: "https://www.google.com/search?q=private" } });
    assert.equal(home.statusCode, 200);
    const article = await app.inject({ method: "GET", url: "/articles/measured-article", headers: { host, "user-agent": "Safari", referer: "https://bsky.app/profile/someone/post/private" } });
    assert.equal(article.statusCode, 200);
    const cachedArticle = await app.inject({ method: "GET", url: "/articles/measured-article", headers: { host, "user-agent": "Safari" } });
    assert.equal(cachedArticle.statusCode, 200);

    const response = await app.inject({ method: "GET", url: "/api/v1/stats", headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.deepEqual(body.totals, { day: 3, week: 3, month: 3, year: 3, allTime: 3 });
    assert.deepEqual(body.articles, [
      { id: articleId, title: "Measured article", slug: "measured-article", visits: 2 },
      { id: unreadArticleId, title: "Unread article", slug: "unread-article", visits: 0 },
    ]);
    assert.deepEqual(
      body.sources.map((row: { source: string; visits: number }) => [row.source, row.visits]).sort(),
      [["bluesky", 1], ["direct", 1], ["search", 1]],
    );

    const disabled = await app.inject({
      method: "PATCH",
      url: "/api/v1/sites",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: { statsEnabled: false },
    });
    assert.equal(disabled.statusCode, 200);
    assert.equal(disabled.json().site.statsEnabled, false);
    const rowsAfterDisable = await db.select().from(dailyVisitCounts).where(eq(dailyVisitCounts.siteId, siteId));
    assert.deepEqual(rowsAfterDisable, []);

    const disabledStats = await app.inject({ method: "GET", url: "/api/v1/stats", headers: { authorization: `Bearer ${token}` } });
    assert.equal(disabledStats.statusCode, 403);
    assert.equal(disabledStats.json().error.code, "stats_disabled");

    const ignoredVisit = await app.inject({ method: "GET", url: "/", headers: { host, "user-agent": "Safari" } });
    assert.equal(ignoredVisit.statusCode, 200);
    const rowsAfterIgnoredVisit = await db.select().from(dailyVisitCounts).where(eq(dailyVisitCounts.siteId, siteId));
    assert.deepEqual(rowsAfterIgnoredVisit, []);
  } finally {
    await app.close();
    await db.delete(dailyVisitCounts).where(eq(dailyVisitCounts.siteId, siteId));
    await db.delete(contentObjects).where(eq(contentObjects.siteId, siteId));
    await db.delete(apiTokens).where(eq(apiTokens.userId, userId));
    await db.delete(sites).where(eq(sites.id, siteId));
    await db.delete(users).where(and(eq(users.id, userId), eq(users.email, `stats-${suffix}@example.com`)));
  }
});
