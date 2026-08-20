import React from "react";
import type { ContentObject, QuoteMetadata } from "./types.js";
import type { Theme } from "../../db/schema.js";
import { formatDate } from "./ThoughtPost.js";
import { t } from "../i18n.js";
import { CardsFeedItem, CardsDetailHeader } from "../themes/cards.js";

export function QuotePost({
  object,
  linked = true,
  locale = "en",
  theme = "classic",
  backHref,
  backLabel,
}: {
  object: ContentObject;
  linked?: boolean;
  locale?: string;
  theme?: Theme;
  backHref?: string;
  backLabel?: string;
}) {
  const metadata = object.metadata as QuoteMetadata;
  // Literal curly quote marks rather than a bare <q> — a feed reader or the
  // RSS description (see feedItemContent in render.ts) doesn't apply the
  // browser's lang-based UA quoting, so the marks need to be real characters
  // to look right everywhere the post appears, not just on this page.
  const quoted = <>“{object.body}”</>;

  if (theme === "cards") {
    const hero = { gradientSeed: object.slug, imageAlt: "" };
    if (linked) {
      return (
        <CardsFeedItem
          href={`/quotes/${object.slug}`}
          eyebrow={t(locale, "quotes")}
          title={quoted}
          subtitle={metadata.author}
          hero={hero}
        />
      );
    }
    return (
      <>
        <CardsDetailHeader
          href={`/quotes/${object.slug}`}
          eyebrow={t(locale, "quotes")}
          title={quoted}
          subtitle={metadata.author}
          dateLabel={formatDate(object.publishedAt, locale)}
          hero={hero}
          backHref={backHref!}
          backLabel={backLabel!}
        />
        {metadata.comment ? (
          <div className="cards-body">
            <p>{metadata.comment}</p>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <article className="card quote">
      <blockquote className="quote-text">
        <p>{quoted}</p>
        <footer>
          — <cite>{metadata.author}</cite>
        </footer>
      </blockquote>
      {metadata.comment ? <p>{metadata.comment}</p> : null}
      <div className="meta">
        {linked ? (
          <a className="title-link" href={`/quotes/${object.slug}`}>
            {formatDate(object.publishedAt, locale)}
          </a>
        ) : (
          formatDate(object.publishedAt, locale)
        )}
      </div>
    </article>
  );
}
