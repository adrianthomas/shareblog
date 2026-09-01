import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { assets, type AssetExif } from "../db/schema.js";
import { storage } from "../storage/index.js";
import { Layout, type PageMetadata } from "./templates/Layout.js";
import { LandingPage } from "./templates/LandingPage.js";
import { ThoughtPost } from "./templates/ThoughtPost.js";
import { PhotoPost, formatExif } from "./templates/PhotoPost.js";
import { BookCard, flattenLinks } from "./templates/BookCard.js";
import { MusicCard, musicLinkLabel } from "./templates/MusicCard.js";
import { ArticleCard, ArticlePage } from "./templates/ArticlePage.js";
import { LinkPost } from "./templates/LinkPost.js";
import { QuotePost } from "./templates/QuotePost.js";
import { AboutPage } from "./templates/AboutPage.js";
import { ReleaseHistoryPage } from "./templates/ReleaseHistoryPage.js";
import { AboutProductPage } from "./templates/AboutProductPage.js";
import { WorkPage } from "./templates/WorkPage.js";
import { ContactPage } from "./templates/ContactPage.js";
import { currentCommit } from "../lib/version.js";
import type {
  ContentObject,
  ArticleMetadata,
  LinkMetadata,
  PhotoMetadata,
  BookMetadata,
  MusicMetadata,
  QuoteMetadata,
  Site,
} from "./templates/types.js";
import { t, resolveLocale, type MessageKey } from "./i18n.js";
import { formatBasicText, formatRichText, stripBasicFormatting } from "./format.js";
import { siteOrigin } from "./site-url.js";
import { bookRetailerLinksFor } from "../lib/book-links.js";
import { musicLinksFor } from "../lib/music-links.js";

function wrap(
  site: Site,
  title: string | undefined,
  node: React.ReactNode,
  opts: { currentPath?: string; cardsDetail?: boolean; availablePaths?: string[]; metadata?: PageMetadata } = {},
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
        metadata: opts.metadata,
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

// EXIF only exists for assets uploaded after that capture was added (see
// image/worker.ts) — older photos simply have no `exif` row and this
// resolves to undefined, which every renderer treats as "omit the panel."
async function photoExif(object: ContentObject): Promise<AssetExif | undefined> {
  const metadata = object.metadata as PhotoMetadata;
  if (!metadata.assetId) return undefined;
  const [asset] = await db.select().from(assets).where(eq(assets.id, metadata.assetId)).limit(1);
  return (asset?.exif as AssetExif | null) ?? undefined;
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
  link: "links",
  quote: "quotes",
};

async function renderCard(object: ContentObject, locale: string, theme: Site["theme"]): Promise<React.ReactNode> {
  switch (object.type) {
    case "thought":
      return React.createElement(ThoughtPost, { object, locale, theme });
    case "photo":
      return React.createElement(PhotoPost, {
        object,
        imageUrl: await photoImageUrl(object),
        exif: await photoExif(object),
        locale,
        theme,
      });
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
    case "link":
      return React.createElement(LinkPost, { object, locale, theme });
    case "quote":
      return React.createElement(QuotePost, { object, locale, theme });
  }
}

async function renderDetail(object: ContentObject, locale: string, theme: Site["theme"]): Promise<React.ReactNode> {
  // Always back to the unfiltered home list, not the type's own category
  // listing — a permalink can be reached from anywhere (a share, a search
  // result, the home feed itself), and closing it should return to that
  // full list rather than a category page the visitor may never have
  // been on.
  const backHref = "/";
  const backLabel = t(locale, "backTo", { section: t(locale, "home") });
  const detailProps = { theme, backHref, backLabel };

  switch (object.type) {
    case "thought":
      return React.createElement(ThoughtPost, { object, linked: false, locale, ...detailProps });
    case "photo":
      return React.createElement(PhotoPost, {
        object,
        imageUrl: await photoImageUrl(object),
        exif: await photoExif(object),
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
    case "link":
      return React.createElement(LinkPost, { object, linked: false, locale, ...detailProps });
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
  options: {
    page?: number;
    totalPages?: number;
    query?: Record<string, string>;
    prefix?: React.ReactNode;
    metadata?: PageMetadata;
  } = {},
): Promise<string> {
  const cards = await Promise.all(objects.map((object) => renderCard(object, site.locale, site.theme)));
  const wrapOpts = { currentPath, availablePaths };
  const pageTitle = currentPath === "/" ? undefined : title;
  const pagination = paginationNode(site, currentPath, options.page ?? 1, options.totalPages ?? 1, options.query);
  if (cards.length === 0) {
    return wrap(
      site,
      pageTitle,
      React.createElement(React.Fragment, null, options.prefix, React.createElement("p", { className: "meta" }, t(site.locale, "nothingHereYet"))),
      { ...wrapOpts, metadata: options.metadata },
    );
  }
  const list =
    site.theme === "cabinet"
      ? React.createElement("div", { className: "cabinet-feed" }, ...cards)
      : site.theme === "cards" || site.theme === "prism" || site.theme === "ledger"
        ? React.createElement("div", { className: "cards-feed" }, ...cards)
        : site.theme === "washi"
          ? React.createElement(
              "div",
              { className: "washi-feed" },
              ...cards.map((card, index) =>
                React.createElement(
                  "div",
                  { className: "washi-feed-item", key: objects[index].id },
                  React.createElement("a", {
                    className: "washi-card-permalink",
                    href: `/${PATH_PREFIX[objects[index].type]}/${objects[index].slug}`,
                    "aria-label": `${t(site.locale, "readMore")}: ${objects[index].title ?? feedContentSummary(objects[index])}`,
                  }),
                  card,
                ),
              ),
            )
          : React.createElement(React.Fragment, null, ...cards);
  return wrap(site, pageTitle, React.createElement(React.Fragment, null, options.prefix, list, pagination), {
    ...wrapOpts,
    metadata: options.metadata,
  });
}

function paginationNode(
  site: Site,
  path: string,
  page: number,
  totalPages: number,
  query: Record<string, string> = {},
): React.ReactNode {
  if (totalPages <= 1) return null;
  const href = (target: number) => {
    const params = new URLSearchParams(query);
    if (target > 1) params.set("page", String(target));
    const suffix = params.toString();
    return suffix ? `${path}?${suffix}` : path;
  };
  return React.createElement(
    "nav",
    { className: "pagination", "aria-label": "Pagination" },
    page > 1 ? React.createElement("a", { href: href(page - 1), rel: "prev" }, `← ${t(site.locale, "previous")}`) : React.createElement("span"),
    page < totalPages ? React.createElement("a", { href: href(page + 1), rel: "next" }, `${t(site.locale, "next")} →`) : React.createElement("span"),
  );
}

export async function renderObjectPage(
  site: Site,
  object: ContentObject,
  currentPath?: string,
  availablePaths?: string[],
): Promise<string> {
  const detail = await renderDetail(object, site.locale, site.theme);
  const detailTitle = object.title ?? (feedContentSummary(object) || undefined);
  const metadataRecord = object.metadata as Record<string, unknown>;
  const description =
    (typeof metadataRecord.excerpt === "string" ? metadataRecord.excerpt : undefined) ??
    (typeof metadataRecord.caption === "string" ? metadataRecord.caption : undefined) ??
    (object.body ? truncateSummary(stripBasicFormatting(object.body), 200) : undefined);
  const imageUrl =
    object.type === "photo"
      ? await photoImageUrl(object)
      : object.type === "article"
        ? await articleImageUrl(object)
        : object.type === "book"
          ? (object.metadata as BookMetadata).coverUrl
          : object.type === "music"
            ? (object.metadata as MusicMetadata).artworkUrl
            : undefined;
  return wrap(site, detailTitle, detail, {
    currentPath: currentPath ?? `/${PATH_PREFIX[object.type]}/${object.slug}`,
    cardsDetail:
      site.theme === "cards" || site.theme === "prism" || site.theme === "ledger" || site.theme === "cabinet",
    availablePaths,
    metadata: {
      path: `/${PATH_PREFIX[object.type]}/${object.slug}`,
      description,
      imageUrl,
      type: "article",
      publishedAt: object.publishedAt,
    },
  });
}

export function renderAboutPage(site: Site): string {
  return wrap(site, t(site.locale, "about"), React.createElement(AboutPage, { site }), {
    currentPath: "/about",
    metadata: { path: "/about", description: site.about ?? site.tagline ?? undefined, type: "profile" },
  });
}

export function renderWorkPage(site: Site): string {
  return wrap(site, "My work", React.createElement(WorkPage, { site }), {
    currentPath: "/my-work",
    metadata: {
      path: "/my-work",
      description: "Selected work across product thinking, digital experiences, systems, and independent projects.",
      type: "profile",
    },
  });
}

export function renderContactPage(site: Site): string {
  return wrap(site, "Contact", React.createElement(ContactPage, { site }), {
    currentPath: "/contact",
    metadata: {
      path: "/contact",
      description: `Get in touch with ${site.title}.`,
      type: "profile",
    },
  });
}

export function renderArchivePage(
  site: Site,
  groups: Array<{ year: number; months: Array<{ month: number; label: string; count: number }> }>,
  availablePaths?: string[],
): string {
  const content = React.createElement(
    React.Fragment,
    null,
    React.createElement("h2", null, t(site.locale, "archive")),
    React.createElement(
      "ol",
      { className: "archive-list" },
      ...groups.map((group) => React.createElement(
        "li",
        { key: group.year },
        React.createElement("h2", null, String(group.year)),
        React.createElement(
          "ul",
          { className: "archive-months" },
          ...group.months.map((month) => React.createElement(
            "li",
            { key: month.month },
            React.createElement("a", { href: `/archive/${group.year}/${String(month.month).padStart(2, "0")}` }, `${month.label} (${month.count})`),
          )),
        ),
      )),
    ),
  );
  return wrap(site, t(site.locale, "archive"), content, {
    currentPath: "/archive",
    availablePaths,
    metadata: { path: "/archive", description: `${site.title} — ${t(site.locale, "archive")}` },
  });
}

export function searchForm(site: Site, query = ""): React.ReactNode {
  return React.createElement(
    "form",
    { className: "search-form", action: "/search", method: "get", role: "search" },
    React.createElement("input", { type: "search", name: "q", defaultValue: query, placeholder: t(site.locale, "search"), "aria-label": t(site.locale, "search") }),
    React.createElement("button", { type: "submit" }, t(site.locale, "search")),
  );
}

export function renderAboutProductPage(site: Site): string {
  return wrap(site, t(site.locale, "aboutShareblog"), React.createElement(AboutProductPage, {}), {
    currentPath: "/about-shareblog",
    metadata: { path: "/about-shareblog", noIndex: true },
  });
}

export function renderReleaseHistoryPage(site: Site): string {
  return wrap(
    site,
    t(site.locale, "releaseHistory"),
    React.createElement(ReleaseHistoryPage, { locale: site.locale, commit: currentCommit }),
    { currentPath: "/changelog", metadata: { path: "/changelog", noIndex: true } },
  );
}

export { siteOrigin } from "./site-url.js";

const TYPE_LABEL_KEY: Record<ContentObject["type"], MessageKey> = {
  thought: "typeThought",
  article: "typeArticle",
  link: "typeLink",
  book: "typeBook",
  music: "typeMusic",
  photo: "typePhoto",
  quote: "typeQuote",
};

const FEED_TITLE_MAX = 80;

function truncateSummary(text: string, max = FEED_TITLE_MAX): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

// The start (long-form types) or full content (everything else, which is
// short enough already) of a post — used as the feed item title, after the
// type label. Kept separate from feedItemContent below, which renders the
// *entire* body/metadata for the item description regardless of type; this
// is deliberately just enough to identify the post in a title.
function feedContentSummary(object: ContentObject): string {
  switch (object.type) {
    case "thought":
      return truncateSummary(stripBasicFormatting(object.body ?? ""));
    case "article":
      return object.title ?? truncateSummary(stripBasicFormatting(object.body ?? ""));
    case "link":
      return object.title ?? truncateSummary(stripBasicFormatting(object.body ?? ""));
    case "book":
      return object.title ?? "";
    case "music": {
      const { artist, releaseTitle } = object.metadata as MusicMetadata;
      return [artist, releaseTitle].filter(Boolean).join(" — ");
    }
    case "photo": {
      const { caption } = object.metadata as PhotoMetadata;
      return caption ? truncateSummary(caption) : "";
    }
    case "quote": {
      const { author } = object.metadata as QuoteMetadata;
      const text = truncateSummary(object.body ?? "");
      return author ? `“${text}” — ${author}` : `“${text}”`;
    }
  }
}

// Unified across every type — "{type label}: {summary}" — so a reader
// scanning a feed of mixed post types (or a photo/music post whose only
// natural title lives in metadata, not object.title) can always tell what
// kind of post it is and what it's about from the title alone.
export function feedTitle(object: ContentObject, locale: string): string {
  const typeLabel = t(locale, TYPE_LABEL_KEY[object.type]);
  const summary = feedContentSummary(object);
  return summary ? `${typeLabel}: ${summary}` : typeLabel;
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

// A "·"-separated line of links — the same list BookCard/MusicCard show on
// the site's own detail page, reused here so the feed item carries the same
// buy/listen links instead of stranding the reader with just a name.
function linkList(entries: Array<{ label: string; url: string }>): string {
  if (entries.length === 0) return "";
  const links = entries.map(({ label, url }) => `<a href="${escapeXml(url)}">${escapeXml(label)}</a>`).join(" · ");
  return `<p>${links}</p>`;
}

function exifList(rows: ReturnType<typeof formatExif>): string {
  if (!rows || rows.length === 0) return "";
  const items = rows.map((row) => `<li><strong>${escapeXml(row.label)}:</strong> ${escapeXml(row.value)}</li>`).join("");
  return `<ul>${items}</ul>`;
}

export async function feedItemContent(object: ContentObject, locale: string): Promise<string> {
  switch (object.type) {
    case "thought":
      return formatRichText(object.body ?? "");
    case "article": {
      const metadata = object.metadata as ArticleMetadata;
      const cover = await articleImageUrl(object);
      const image = cover ? `<p><img src="${escapeXml(cover)}" alt="${escapeXml(metadata.coverAltText ?? "")}" /></p>` : "";
      const excerpt = metadata.excerpt ? `<p><em>${escapeXml(metadata.excerpt)}</em></p>` : "";
      return image + excerpt + formatRichText(object.body ?? "");
    }
    case "link": {
      const metadata = object.metadata as LinkMetadata;
      const title = object.title ? `<p><strong>${escapeXml(object.title)}</strong></p>` : "";
      const source = object.sourceUrl ? linkList([{ label: t(locale, "openLink"), url: object.sourceUrl }]) : "";
      const excerpt = metadata.excerpt ? `<p><em>${escapeXml(metadata.excerpt)}</em></p>` : "";
      return title + excerpt + formatBasicText(object.body ?? "") + source;
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
      const retailerLinks = bookRetailerLinksFor(object.title ?? "", metadata.author, metadata);
      const links = linkList(retailerLinks ? flattenLinks(retailerLinks) : []);
      return image + author + rating + formatBasicText(object.body ?? "") + links;
    }
    case "music": {
      const metadata = object.metadata as MusicMetadata;
      const image = metadata.artworkUrl
        ? `<p><img src="${escapeXml(metadata.artworkUrl)}" alt="Artwork for ${escapeXml(metadata.releaseTitle)}" /></p>`
        : "";
      const artist = `<p>${escapeXml(metadata.artist)}</p>`;
      const linkEntries = Object.entries(musicLinksFor(metadata))
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(([platform, url]) => ({
          label: musicLinkLabel(locale, platform, url),
          url,
        }));
      return image + artist + formatBasicText(object.body ?? "") + linkList(linkEntries);
    }
    case "photo": {
      const metadata = object.metadata as PhotoMetadata;
      const url = await photoImageUrl(object);
      const alt = escapeXml(metadata.altText ?? "");
      const image = url ? `<p><img src="${escapeXml(url)}" alt="${alt}" /></p>` : "";
      const caption = metadata.caption ? `<p>${escapeXml(metadata.caption)}</p>` : "";
      const exif = exifList(formatExif(await photoExif(object), locale));
      return image + caption + exif;
    }
    case "quote": {
      const metadata = object.metadata as QuoteMetadata;
      const quote = `<p>“${escapeXml(object.body ?? "")}”</p>`;
      const attribution = `<p>— ${escapeXml(metadata.author)}</p>`;
      const comment = metadata.comment ? formatBasicText(metadata.comment) : "";
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
        const title = escapeXml(feedTitle(object, site.locale));
        const content = await feedItemContent(object, site.locale);
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
