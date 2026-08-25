import React from "react";
import type { ContentObject, QuoteMetadata } from "./types.js";
import type { Theme } from "../../db/schema.js";
import { formatDate } from "./ThoughtPost.js";
import { t } from "../i18n.js";
import { CardsFeedItem, CardsDetailHeader } from "../themes/cards.js";
import { CopyLinkButton, CopyQuoteButton } from "./CopyButton.js";
import { formatBasicText } from "../format.js";

function Comment({ text }: { text: string | undefined }) {
  if (!text) return null;
  return <div className="body-content" dangerouslySetInnerHTML={{ __html: formatBasicText(text) }} />;
}

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
  // What actually gets copied to the clipboard — the quote and its
  // attribution, not the poster's own comment underneath it, since that's
  // a personal reflection rather than part of the quote being shared.
  const quoteCopyText = `“${object.body ?? ""}” — ${metadata.author}`;

  if (theme === "cards" || theme === "prism") {
    const hero = { gradientSeed: object.slug, imageAlt: "" };
    if (linked) {
      return (
        <CardsFeedItem
          href={`/quotes/${object.slug}`}
          eyebrow={t(locale, "quotes")}
          title={quoted}
          subtitle={metadata.author}
          type={object.type}
          hero={hero}
          variant="quote"
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
          dateLabel={
            <>
              <CopyQuoteButton text={quoteCopyText} locale={locale} className="copy-btn--leading" />
              {formatDate(object.publishedAt, locale)}
              <CopyLinkButton locale={locale} />
            </>
          }
          type={object.type}
          hero={hero}
          backHref={backHref!}
          backLabel={backLabel!}
          variant="quote"
        />
        {metadata.comment ? (
          <div className="cards-body">
            <Comment text={metadata.comment} />
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
      <Comment text={metadata.comment} />
      <div className="meta">
        {linked ? (
          <a className="title-link" href={`/quotes/${object.slug}`}>
            {formatDate(object.publishedAt, locale)}
          </a>
        ) : (
          <>
            <CopyQuoteButton text={quoteCopyText} locale={locale} className="copy-btn--leading" />
            {formatDate(object.publishedAt, locale)}
            <CopyLinkButton locale={locale} />
          </>
        )}
      </div>
    </article>
  );
}
