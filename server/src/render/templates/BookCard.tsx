import React from "react";
import type { ContentObject, BookMetadata } from "./types.js";
import type { Theme } from "../../db/schema.js";
import { formatDate } from "./ThoughtPost.js";
import { t } from "../i18n.js";
import { CardsFeedItem, CardsDetailHeader } from "../themes/cards.js";

// Retailer brand names — proper nouns, not translated per locale.
const STORE_LABELS: Record<string, string> = {
  amazon: "Amazon",
  bookshop: "Bookshop.org",
  kobo: "Kobo",
  appleBooks: "Apple Books",
};

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
          hero={hero}
        />
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
          {metadata.links && Object.values(metadata.links).some(Boolean) ? (
            <p className="meta">
              {Object.entries(metadata.links)
                .filter(([, url]) => url)
                .map(([label, url]) => (
                  <a key={label} href={url} style={{ marginRight: "0.75rem" }}>
                    {STORE_LABELS[label] ?? label}
                  </a>
                ))}
            </p>
          ) : null}
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
        {variant === "page" && metadata.links && Object.values(metadata.links).some(Boolean) ? (
          <p className="meta">
            {Object.entries(metadata.links)
              .filter(([, url]) => url)
              .map(([label, url]) => (
                <a key={label} href={url} style={{ marginRight: "0.75rem" }}>
                  {label}
                </a>
              ))}
          </p>
        ) : null}
        <p className="meta">{formatDate(object.publishedAt, locale)}</p>
      </div>
    </article>
  );
}
