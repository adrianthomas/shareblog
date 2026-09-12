import type { FastifyRequest } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { dailyVisitCounts } from "../db/schema.js";

export const visitSourceLabels = {
  direct: "Direct",
  search: "Search engines",
  mastodon: "Mastodon",
  bluesky: "Bluesky",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  reddit: "Reddit",
  hackernews: "Hacker News",
  other: "Other websites",
  internal: "Internal navigation",
} as const;

export type VisitSource = keyof typeof visitSourceLabels;

export function classifyReferrer(referrer: string | undefined, siteHost: string | undefined): VisitSource {
  if (!referrer) return "direct";
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "direct";
  }
  const ownHost = siteHost?.split(":", 1)[0].toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  if (ownHost && host === ownHost) return "internal";
  if (host === "google.com" || host.endsWith(".google.com") || host === "bing.com" || host.endsWith(".bing.com") || host === "duckduckgo.com" || host.endsWith(".duckduckgo.com") || host === "search.brave.com") return "search";
  if (host === "bsky.app" || host.endsWith(".bsky.app")) return "bluesky";
  if (host === "mastodon.social" || host.includes("mastodon") || host === "mstdn.social") return "mastodon";
  if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.com") return "facebook";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com") || host === "lnkd.in") return "linkedin";
  if (host === "reddit.com" || host.endsWith(".reddit.com")) return "reddit";
  if (host === "news.ycombinator.com") return "hackernews";
  return "other";
}

export function shouldCountVisit(request: FastifyRequest): boolean {
  if (request.method !== "GET") return false;
  if (request.headers.dnt === "1" || request.headers["sec-gpc"] === "1") return false;
  const purpose = `${request.headers.purpose ?? ""} ${request.headers["sec-purpose"] ?? ""}`;
  if (/prefetch|prerender/i.test(purpose)) return false;
  const userAgent = request.headers["user-agent"] ?? "";
  return !/bot\b|crawler|spider|slurp|preview|facebookexternalhit|bingpreview/i.test(userAgent);
}

export async function recordVisit(request: FastifyRequest, siteId: string, contentObjectId = ""): Promise<void> {
  if (!shouldCountVisit(request)) return;
  const day = new Date().toISOString().slice(0, 10);
  const source = classifyReferrer(request.headers.referer, request.headers.host);
  await db
    .insert(dailyVisitCounts)
    .values({ siteId, day, contentObjectId, source, visits: 1 })
    .onConflictDoUpdate({
      target: [dailyVisitCounts.siteId, dailyVisitCounts.day, dailyVisitCounts.contentObjectId, dailyVisitCounts.source],
      set: { visits: sql`${dailyVisitCounts.visits} + 1` },
    });
}
