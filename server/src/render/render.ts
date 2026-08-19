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
import type { ContentObject, PhotoMetadata, Site } from "./templates/types.js";

function wrap(site: Site, title: string | undefined, node: React.ReactNode): string {
  return "<!doctype html>" + renderToStaticMarkup(React.createElement(Layout, { site, title, children: node }));
}

async function photoImageUrl(object: ContentObject): Promise<string> {
  const metadata = object.metadata as PhotoMetadata;
  const [asset] = await db.select().from(assets).where(eq(assets.id, metadata.assetId)).limit(1);
  if (!asset) return "";
  const variants = asset.variants as Record<string, string>;
  return storage.getUrl(variants.medium ?? variants.original ?? asset.storageKey);
}

async function renderCard(object: ContentObject): Promise<React.ReactNode> {
  switch (object.type) {
    case "thought":
      return React.createElement(ThoughtPost, { object });
    case "photo":
      return React.createElement(PhotoPost, { object, imageUrl: await photoImageUrl(object) });
    case "book":
      return React.createElement(BookCard, { object });
    case "music":
      return React.createElement(MusicCard, { object });
    case "article":
      return React.createElement(ArticleCard, { object });
  }
}

async function renderDetail(object: ContentObject): Promise<React.ReactNode> {
  switch (object.type) {
    case "thought":
      return React.createElement(ThoughtPost, { object, linked: false });
    case "photo":
      return React.createElement(PhotoPost, { object, imageUrl: await photoImageUrl(object), linked: false });
    case "book":
      return React.createElement(BookCard, { object, variant: "page" });
    case "music":
      return React.createElement(MusicCard, { object, variant: "page" });
    case "article":
      return React.createElement(ArticlePage, { object });
  }
}

export async function renderList(site: Site, title: string, objects: ContentObject[]): Promise<string> {
  const cards = await Promise.all(objects.map(renderCard));
  if (cards.length === 0) {
    return wrap(site, title, React.createElement("p", { className: "meta" }, "Nothing here yet."));
  }
  return wrap(site, title, React.createElement(React.Fragment, null, ...cards));
}

export async function renderObjectPage(site: Site, object: ContentObject): Promise<string> {
  const detail = await renderDetail(object);
  return wrap(site, object.title ?? undefined, detail);
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

const PATH_PREFIX: Record<ContentObject["type"], string> = {
  thought: "posts",
  photo: "photos",
  book: "books",
  music: "music",
  article: "articles",
};

export function objectPath(object: ContentObject): string {
  return `${PATH_PREFIX[object.type]}/${object.slug}`;
}
