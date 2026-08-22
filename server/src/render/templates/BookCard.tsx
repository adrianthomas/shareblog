import React from "react";
import type { ContentObject, BookMetadata } from "./types.js";
import type { Theme } from "../../db/schema.js";
import { formatDate } from "./ThoughtPost.js";
import { t } from "../i18n.js";
import { CardsFeedItem, CardsDetailHeader, CardsBookDetailHeader } from "../themes/cards.js";

// Retailer brand names — proper nouns, not translated per locale.
const STORE_LABELS: Record<string, string> = {
  bookshop: "Bookshop.org",
  kobo: "Kobo",
  appleBooks: "Apple Books",
};

const AMAZON_REGION_ORDER = ["us", "de", "uk", "fr", "it", "es", "ca", "jp"] as const;
const AMAZON_REGION_LABELS: Record<(typeof AMAZON_REGION_ORDER)[number], string> = {
  us: "Amazon (US)",
  de: "Amazon (DE)",
  uk: "Amazon (UK)",
  fr: "Amazon (FR)",
  it: "Amazon (IT)",
  es: "Amazon (ES)",
  ca: "Amazon (CA)",
  jp: "Amazon (JP)",
};

export interface BookLink {
  key: string;
  label: string;
  url: string;
  amazonRegion?: string;
}

// Flattens the amazon region map alongside the other single-URL retailer
// links so both theme branches can render one uniform list. Amazon entries
// carry an `amazonRegion` so the client can promote the visitor's likely
// storefront (see the script in Layout.tsx) without any server-side
// geolocation or header sniffing.
export function flattenLinks(links: NonNullable<BookMetadata["links"]>): BookLink[] {
  const entries: BookLink[] = [];
  for (const region of AMAZON_REGION_ORDER) {
    const url = links.amazon?.[region];
    if (url) entries.push({ key: `amazon-${region}`, label: AMAZON_REGION_LABELS[region], url, amazonRegion: region });
  }
  for (const key of ["bookshop", "kobo", "appleBooks"] as const) {
    const url = links[key];
    if (url) entries.push({ key, label: STORE_LABELS[key], url });
  }
  return entries;
}

function BookLinks({ links }: { links?: BookMetadata["links"] }) {
  const entries = links ? flattenLinks(links) : [];
  if (entries.length === 0) return null;
  return (
    <p className="meta">
      {entries.map(({ key, label, url, amazonRegion }) => (
        <a key={key} href={url} data-amazon-region={amazonRegion} style={{ marginRight: "0.75rem" }}>
          {label}
        </a>
      ))}
    </p>
  );
}

export function BookCard({
  object,
  variant = "card",
  locale = "en",
  theme = "classic",
  backHref,
  backLabel,
}: {
  object: ContentObject;
  variant?: "card" | "page";
  locale?: string;
  theme?: Theme;
  backHref?: string;
  backLabel?: string;
}) {
  const metadata = object.metadata as BookMetadata;
  const stars = metadata.rating ? "★".repeat(metadata.rating) + "☆".repeat(5 - metadata.rating) : null;

  if (theme === "cards") {
    const hero = { imageUrl: metadata.coverUrl, imageAlt: object.title ? `Cover of ${object.title}` : "", gradientSeed: object.slug };
    if (variant === "card") {
      return (
        <CardsFeedItem
          href={`/books/${object.slug}`}
          eyebrow={t(locale, "books")}
          title={object.title}
          subtitle={metadata.author}
          type={object.type}
          hero={hero}
        />
      );
    }
    if (metadata.coverUrl) {
      return (
        <>
          <CardsBookDetailHeader
            eyebrow={t(locale, "books")}
            title={object.title}
            author={metadata.author}
            stars={stars}
            ratingLabel={metadata.rating ? t(locale, "ratingLabel", { rating: metadata.rating }) : undefined}
            dateLabel={formatDate(object.publishedAt, locale)}
            coverUrl={metadata.coverUrl}
            coverAlt={hero.imageAlt}
            backHref={backHref!}
            backLabel={backLabel!}
          />
          <div className="cards-body">
            {object.body ? <p>{object.body}</p> : null}
            <BookLinks links={metadata.links} />
          </div>
        </>
      );
    }
    return (
      <>
        <CardsDetailHeader
          href={`/books/${object.slug}`}
          eyebrow={t(locale, "books")}
          title={object.title}
          subtitle={metadata.author}
          dateLabel={formatDate(object.publishedAt, locale)}
          type={object.type}
          hero={hero}
          backHref={backHref!}
          backLabel={backLabel!}
        />
        <div className="cards-body">
          {stars ? (
            <p>
              <span aria-hidden="true">{stars}</span>
              <span className="sr-only">{t(locale, "ratingLabel", { rating: metadata.rating! })}</span>
            </p>
          ) : null}
          {object.body ? <p>{object.body}</p> : null}
          <BookLinks links={metadata.links} />
        </div>
      </>
    );
  }

  return (
    <article className={variant === "card" ? "card book" : "book"}>
      {metadata.coverUrl ? (
        <img src={metadata.coverUrl} alt={object.title ? `Cover of ${object.title}` : ""} />
      ) : null}
      <div>
        <h2>
          {variant === "card" ? (
            <a className="title-link" href={`/books/${object.slug}`}>
              {object.title}
            </a>
          ) : (
            object.title
          )}
        </h2>
        <p className="meta">{metadata.author}</p>
        {stars ? (
          <p>
            <span aria-hidden="true">{stars}</span>
            <span className="sr-only">{t(locale, "ratingLabel", { rating: metadata.rating! })}</span>
          </p>
        ) : null}
        {object.body ? <p>{object.body}</p> : null}
        {variant === "page" ? <BookLinks links={metadata.links} /> : null}
        <p className="meta">{formatDate(object.publishedAt, locale)}</p>
      </div>
    </article>
  );
}
