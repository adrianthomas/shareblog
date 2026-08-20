import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { assets } from "../db/schema.js";
import { storage } from "../storage/index.js";
import { Layout } from "./templates/Layout.js";
import { ThoughtPost } from "./templates/ThoughtPost.js";
import { PhotoPost } from "./templates/PhotoPost.js";
import { BookCard } from "./templates/BookCard.js";
import { MusicCard } from "./templates/MusicCard.js";
import { ArticleCard, ArticlePage } from "./templates/ArticlePage.js";
import type { ContentObject, ArticleMetadata, PhotoMetadata, Site } from "./templates/types.js";
import { t, type MessageKey } from "./i18n.js";

function wrap(
  site: Site,
  title: string | undefined,
  node: React.ReactNode,
  opts: { currentPath?: string; cardsDetail?: boolean } = {},
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

const PATH_PREFIX: Record<ContentObject["type"], string> = {
  thought: "posts",
  photo: "photos",
  book: "books",
  music: "music",
  article: "articles",
};

const LISTING_KEY: Record<ContentObject["type"], MessageKey> = {
  thought: "posts",
  photo: "photos",
  book: "books",
  music: "music",
  article: "articles",
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
  }
}

export async function renderList(
  site: Site,
  title: string,
  objects: ContentObject[],
  currentPath = "/",
): Promise<string> {
  const cards = await Promise.all(objects.map((object) => renderCard(object, site.locale, site.theme)));
  const wrapOpts = { currentPath };
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

export async function renderObjectPage(site: Site, object: ContentObject, currentPath?: string): Promise<string> {
  const detail = await renderDetail(object, site.locale, site.theme);
  return wrap(site, object.title ?? undefined, detail, {
    currentPath: currentPath ?? `/${PATH_PREFIX[object.type]}/${object.slug}`,
    cardsDetail: site.theme === "cards",
  });
}

function siteOrigin(site: Site): string {
  const baseDomain = process.env.BASE_DOMAIN ?? "localhost:3000";
  const scheme = baseDomain.startsWith("localhost") ? "http" : "https";
  return `${scheme}://${site.subdomain}.${baseDomain}`;
}

function feedTitle(object: ContentObject): string {
  if (object.title) return object.title;
  const excerpt = (object.body ?? "").slice(0, 60);
  return excerpt.length < (object.body ?? "").length ? `${excerpt}…` : excerpt || object.type;
}

export async function renderFeed(site: Site, objects: ContentObject[]): Promise<string> {
  const origin = siteOrigin(site);
  const items = objects
    .map((object) => {
      const link = `${origin}/${objectPath(object)}`;
      const title = feedTitle(object);
      return `<item><title><![CDATA[${title}]]></title><link>${link}</link><guid>${link}</guid><pubDate>${(
        object.publishedAt ?? object.createdAt
      ).toUTCString()}</pubDate></item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${site.title}</title><description>${
    site.tagline ?? ""
  }</description>${items}</channel></rss>`;
}

export function objectPath(object: ContentObject): string {
  return `${PATH_PREFIX[object.type]}/${object.slug}`;
}
