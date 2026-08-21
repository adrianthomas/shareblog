import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { assets } from "../db/schema.js";
import { storage } from "../storage/index.js";
import { Layout } from "./templates/Layout.js";
import { LandingPage } from "./templates/LandingPage.js";
import { ThoughtPost } from "./templates/ThoughtPost.js";
import { PhotoPost } from "./templates/PhotoPost.js";
import { BookCard } from "./templates/BookCard.js";
import { MusicCard } from "./templates/MusicCard.js";
import { ArticleCard, ArticlePage } from "./templates/ArticlePage.js";
import { QuotePost } from "./templates/QuotePost.js";
import type {
  ContentObject,
  ArticleMetadata,
  PhotoMetadata,
  BookMetadata,
  MusicMetadata,
  QuoteMetadata,
  Site,
} from "./templates/types.js";
import { t, resolveLocale, type MessageKey } from "./i18n.js";

function wrap(
  site: Site,
  title: string | undefined,
  node: React.ReactNode,
  opts: { currentPath?: string; cardsDetail?: boolean; availablePaths?: string[] } = {},
): string {
  return (
    "<!doctype html>" +
    renderToStaticMarkup(
      React.createElement(Layout, {
        site,
        title,
        children: node,
        currentPath: opts.currentPath,
        cardsDetail: opts.cardsDetail,
        availablePaths: opts.availablePaths,
      }),
    )
  );
}

async function assetImageUrl(assetId: string | undefined): Promise<string | undefined> {
  if (!assetId) return undefined;
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset) return undefined;
  const variants = asset.variants as Record<string, string>;
  return storage.getUrl(variants.medium ?? variants.original ?? asset.storageKey);
}

async function photoImageUrl(object: ContentObject): Promise<string> {
  const metadata = object.metadata as PhotoMetadata;
  return (await assetImageUrl(metadata.assetId)) ?? "";
}

async function articleImageUrl(object: ContentObject): Promise<string | undefined> {
  const metadata = object.metadata as ArticleMetadata;
  return assetImageUrl(metadata.coverAssetId);
}

export const PATH_PREFIX: Record<ContentObject["type"], string> = {
  thought: "posts",
  photo: "photos",
  book: "books",
  music: "music",
  article: "articles",
  quote: "quotes",
};

const LISTING_KEY: Record<ContentObject["type"], MessageKey> = {
  thought: "posts",
  photo: "photos",
  book: "books",
  music: "music",
  article: "articles",
  quote: "quotes",
};

async function renderCard(object: ContentObject, locale: string, theme: Site["theme"]): Promise<React.ReactNode> {
  switch (object.type) {
    case "thought":
      return React.createElement(ThoughtPost, { object, locale, theme });
    case "photo":
      return React.createElement(PhotoPost, { object, imageUrl: await photoImageUrl(object), locale, theme });
    case "book":
      return React.createElement(BookCard, { object, locale, theme });
    case "music":
      return React.createElement(MusicCard, { object, locale, theme });
    case "article":
      return React.createElement(ArticleCard, {
        object,
        locale,
        theme,
        coverImageUrl: await articleImageUrl(object),
      });
    case "quote":
      return React.createElement(QuotePost, { object, locale, theme });
  }
}

async function renderDetail(object: ContentObject, locale: string, theme: Site["theme"]): Promise<React.ReactNode> {
  const backHref = `/${PATH_PREFIX[object.type]}`;
  const backLabel = t(locale, "backTo", { section: t(locale, LISTING_KEY[object.type]) });
  const detailProps = { theme, backHref, backLabel };

  switch (object.type) {
    case "thought":
      return React.createElement(ThoughtPost, { object, linked: false, locale, ...detailProps });
    case "photo":
      return React.createElement(PhotoPost, {
        object,
        imageUrl: await photoImageUrl(object),
        linked: false,
        locale,
        ...detailProps,
      });
    case "book":
      return React.createElement(BookCard, { object, variant: "page", locale, ...detailProps });
    case "music":
      return React.createElement(MusicCard, { object, variant: "page", locale, ...detailProps });
    case "article":
      return React.createElement(ArticlePage, {
        object,
        locale,
        coverImageUrl: await articleImageUrl(object),
        ...detailProps,
      });
    case "quote":
      return React.createElement(QuotePost, { object, linked: false, locale, ...detailProps });
  }
}

export function renderLandingPage(): string {
  return "<!doctype html>" + renderToStaticMarkup(React.createElement(LandingPage));
}

export async function renderList(
  site: Site,
  title: string,
  objects: ContentObject[],
  currentPath = "/",
  availablePaths?: string[],
): Promise<string> {
  const cards = await Promise.all(objects.map((object) => renderCard(object, site.locale, site.theme)));
  const wrapOpts = { currentPath, availablePaths };
  if (cards.length === 0) {
    return wrap(
      site,
      title,
      React.createElement("p", { className: "meta" }, t(site.locale, "nothingHereYet")),
      wrapOpts,
    );
  }
  const list =
    site.theme === "cards"
      ? React.createElement("div", { className: "cards-feed" }, ...cards)
      : React.createElement(React.Fragment, null, ...cards);
  return wrap(site, title, list, wrapOpts);
}

export async function renderObjectPage(
  site: Site,
  object: ContentObject,
  currentPath?: string,
  availablePaths?: string[],
): Promise<string> {
  const detail = await renderDetail(object, site.locale, site.theme);
  return wrap(site, object.title ?? undefined, detail, {
    currentPath: currentPath ?? `/${PATH_PREFIX[object.type]}/${object.slug}`,
    cardsDetail: site.theme === "cards",
    availablePaths,
  });
}

function siteOrigin(site: Site): string {
  const baseDomain = process.env.BASE_DOMAIN ?? "localhost:3000";
  const scheme = baseDomain.startsWith("localhost") ? "http" : "https";
  return `${scheme}://${site.subdomain}.${baseDomain}`;
}

function feedTitle(object: ContentObject): string {
  if (object.title) return object.title;
  const body = object.body ?? "";
  const excerpt = body.slice(0, 60);
  const truncated = excerpt.length < body.length ? `${excerpt}…` : excerpt || object.type;
  if (object.type === "quote") {
    const { author } = object.metadata as QuoteMetadata;
    return author ? `“${truncated}” — ${author}` : `“${truncated}”`;
  }
  return truncated;
}

// Escapes text for use both as XML character data and, since the same
// characters are unsafe in both contexts, as the HTML markup we build for
// each item's CDATA-wrapped <description>.
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraphs(body: string | null): string {
  return (body ?? "")
    .split("\n\n")
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeXml(paragraph)}</p>`)
    .join("");
}

async function feedItemContent(object: ContentObject): Promise<string> {
  switch (object.type) {
    case "thought":
      return paragraphs(object.body);
    case "article": {
      const metadata = object.metadata as ArticleMetadata;
      const cover = await articleImageUrl(object);
      const image = cover ? `<p><img src="${escapeXml(cover)}" alt="" /></p>` : "";
      const excerpt = metadata.excerpt ? `<p><em>${escapeXml(metadata.excerpt)}</em></p>` : "";
      return image + excerpt + paragraphs(object.body);
    }
    case "book": {
      const metadata = object.metadata as BookMetadata;
      const image = metadata.coverUrl
        ? `<p><img src="${escapeXml(metadata.coverUrl)}" alt="Cover of ${escapeXml(object.title ?? "")}" /></p>`
        : "";
      const author = `<p>${escapeXml(metadata.author)}</p>`;
      const rating = metadata.rating
        ? `<p>${"★".repeat(metadata.rating)}${"☆".repeat(5 - metadata.rating)}</p>`
        : "";
      return image + author + rating + paragraphs(object.body);
    }
    case "music": {
      const metadata = object.metadata as MusicMetadata;
      const image = metadata.artworkUrl
        ? `<p><img src="${escapeXml(metadata.artworkUrl)}" alt="Artwork for ${escapeXml(metadata.releaseTitle)}" /></p>`
        : "";
      const artist = `<p>${escapeXml(metadata.artist)}</p>`;
      return image + artist + paragraphs(object.body);
    }
    case "photo": {
      const metadata = object.metadata as PhotoMetadata;
      const url = await photoImageUrl(object);
      const alt = escapeXml(metadata.caption ?? "");
      const image = url ? `<p><img src="${escapeXml(url)}" alt="${alt}" /></p>` : "";
      const caption = metadata.caption ? `<p>${escapeXml(metadata.caption)}</p>` : "";
      return image + caption;
    }
    case "quote": {
      const metadata = object.metadata as QuoteMetadata;
      const quote = `<p>“${escapeXml(object.body ?? "")}”</p>`;
      const attribution = `<p>— ${escapeXml(metadata.author)}</p>`;
      const comment = metadata.comment ? `<p>${escapeXml(metadata.comment)}</p>` : "";
      return quote + attribution + comment;
    }
  }
}

export async function renderFeed(
  site: Site,
  objects: ContentObject[],
  opts: { title?: string; description?: string; path?: string } = {},
): Promise<string> {
  const origin = siteOrigin(site);
  const selfUrl = `${origin}${opts.path ?? "/feed.xml"}`;
  const channelTitle = opts.title ? `${opts.title} — ${site.title}` : site.title;
  const channelDescription = opts.description ?? site.tagline ?? "";

  const items = (
    await Promise.all(
      objects.map(async (object) => {
        const link = `${origin}/${objectPath(object)}`;
        const title = escapeXml(feedTitle(object));
        const content = await feedItemContent(object);
        const pubDate = (object.publishedAt ?? object.createdAt).toUTCString();
        return (
          `<item><title>${title}</title><link>${escapeXml(link)}</link>` +
          `<guid isPermaLink="true">${escapeXml(link)}</guid><pubDate>${pubDate}</pubDate>` +
          `<description><![CDATA[${content}]]></description></item>`
        );
      }),
    )
  ).join("");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>` +
    `<title>${escapeXml(channelTitle)}</title>` +
    `<link>${escapeXml(origin)}</link>` +
    `<atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />` +
    `<description>${escapeXml(channelDescription)}</description>` +
    `<language>${resolveLocale(site.locale)}</language>` +
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>` +
    items +
    `</channel></rss>`
  );
}

export function objectPath(object: ContentObject): string {
  return `${PATH_PREFIX[object.type]}/${object.slug}`;
}
