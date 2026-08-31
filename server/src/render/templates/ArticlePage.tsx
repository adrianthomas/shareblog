import React from "react";
import type { ContentObject, ArticleMetadata } from "./types.js";
import type { Theme } from "../../db/schema.js";
import { formatDate } from "./ThoughtPost.js";
import { t } from "../i18n.js";
import { CardsFeedItem, CloseButton } from "../themes/cards.js";
import { CabinetDetailHeader, CabinetFeedItem } from "../themes/cabinet.js";
import { formatRichText, stripBasicFormatting } from "../format.js";
import { CopyLinkButton } from "./CopyButton.js";

function articleExcerpt(object: ContentObject, metadata: ArticleMetadata): string | undefined {
  const excerpt = metadata.excerpt?.trim();
  if (excerpt) return excerpt;
  const text = stripBasicFormatting(object.body ?? "");
  if (!text) return undefined;
  return text.length > 220 ? `${text.slice(0, 220).trim()}…` : text;
}

export function ArticleCard({
  object,
  locale = "en",
  theme = "classic",
  coverImageUrl,
}: {
  object: ContentObject;
  locale?: string;
  theme?: Theme;
  coverImageUrl?: string;
}) {
  const metadata = object.metadata as ArticleMetadata;
  const excerpt = articleExcerpt(object, metadata);
  const coverAltText = metadata.coverAltText ?? "";

  if (theme === "cabinet") {
    return (
      <CabinetFeedItem
        href={`/articles/${object.slug}`}
        eyebrow={t(locale, "articles")}
        title={object.title}
        subtitle={excerpt}
        dateLabel={formatDate(object.publishedAt, locale)}
        actionLabel={
          <>
            {t(locale, "readMore")} <span aria-hidden="true">→</span>
          </>
        }
        type={object.type}
        image={coverImageUrl ? { url: coverImageUrl, alt: coverAltText } : undefined}
      />
    );
  }

  if (theme === "cards" || theme === "prism" || theme === "ledger") {
    if (coverImageUrl) {
      return (
        <a className="cards-item cards-article-feed-card" href={`/articles/${object.slug}`}>
          <div className="cards-hero cards-article-feed-image">
            <img src={coverImageUrl} alt={coverAltText} loading="lazy" />
          </div>
          <div className="cards-article-feed-copy">
            <p className="cards-text-badge">
              <span className="cards-text-badge-dot" aria-hidden="true" />
              {t(locale, "articles")}
            </p>
            <h2 className="cards-article-feed-title">{object.title}</h2>
            {excerpt ? <p className="cards-article-feed-excerpt">{excerpt}</p> : null}
            <p className="cards-text-date">{formatDate(object.publishedAt, locale)}</p>
          </div>
        </a>
      );
    }
    return (
      <CardsFeedItem
        href={`/articles/${object.slug}`}
        eyebrow={t(locale, "articles")}
        title={object.title}
        subtitle={excerpt}
        actionLabel={
          <>
            {t(locale, "readMore")} <span aria-hidden="true">→</span>
          </>
        }
        type={object.type}
        hero={{ imageUrl: coverImageUrl, imageAlt: coverAltText, gradientSeed: object.slug }}
      />
    );
  }

  return (
    <article className="card article-card">
      {coverImageUrl ? (
        <a className="article-card-cover" href={`/articles/${object.slug}`} aria-label={object.title ?? t(locale, "articles")}>
          <img src={coverImageUrl} alt={coverAltText} loading="lazy" />
        </a>
      ) : null}
      <h2>
        <a className="title-link" href={`/articles/${object.slug}`}>
          {object.title}
        </a>
      </h2>
      {excerpt ? <p className="article-excerpt">{excerpt}</p> : null}
      {theme === "washi" ? (
        <p className="article-actions">
          <a className="content-action-button" href={`/articles/${object.slug}`}>
            {t(locale, "readMore")} <span aria-hidden="true">→</span>
          </a>
        </p>
      ) : null}
      <p className="meta">{formatDate(object.publishedAt, locale)}</p>
    </article>
  );
}

export function ArticlePage({
  object,
  locale = "en",
  theme = "classic",
  coverImageUrl,
  backHref,
  backLabel,
}: {
  object: ContentObject;
  locale?: string;
  theme?: Theme;
  coverImageUrl?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const metadata = object.metadata as ArticleMetadata;
  const bodyHtml = formatRichText(object.body ?? "");
  const metadataExcerpt = metadata.excerpt?.trim();
  const coverAltText = metadata.coverAltText ?? "";

  if (theme === "cabinet") {
    return (
      <>
        <CabinetDetailHeader
          type={object.type}
          eyebrow={t(locale, "articles")}
          title={object.title}
          subtitle={metadataExcerpt}
          dateLabel={
            <>
              {formatDate(object.publishedAt, locale)}
              <CopyLinkButton locale={locale} />
            </>
          }
          image={coverImageUrl ? { url: coverImageUrl, alt: coverAltText } : undefined}
          backHref={backHref!}
          backLabel={backLabel!}
        />
        <div
          className="cabinet-detail-body cabinet-article-body body-content"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </>
    );
  }

  if (theme === "cards" || theme === "prism" || theme === "ledger") {
    if (!coverImageUrl) {
      return (
        <>
          <CloseButton backHref={backHref!} backLabel={backLabel!} />
          <article className="cards-article-detail">
            <header className="cards-article-header">
              <p className="cards-text-badge">
                <span className="cards-text-badge-dot" aria-hidden="true" />
                {t(locale, "articles")}
              </p>
              <h1 className="cards-article-title">{object.title}</h1>
              {metadataExcerpt ? <p className="cards-article-excerpt">{metadataExcerpt}</p> : null}
              <p className="cards-article-date">
                {formatDate(object.publishedAt, locale)}
                <CopyLinkButton locale={locale} />
              </p>
            </header>
            <div className="cards-article-body body-content" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </article>
        </>
      );
    }
    return (
      <>
        <CloseButton backHref={backHref!} backLabel={backLabel!} />
        <article className="cards-article-detail">
          <img className="cards-article-cover" src={coverImageUrl} alt={coverAltText} loading="lazy" />
          <header className="cards-article-header">
            <p className="cards-text-badge">
              <span className="cards-text-badge-dot" aria-hidden="true" />
              {t(locale, "articles")}
            </p>
            <h1 className="cards-article-title">{object.title}</h1>
            {metadataExcerpt ? <p className="cards-article-excerpt">{metadataExcerpt}</p> : null}
            <p className="cards-article-date">
              {formatDate(object.publishedAt, locale)}
              <CopyLinkButton locale={locale} />
            </p>
          </header>
          <div className="cards-article-body body-content" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </article>
      </>
    );
  }

  return (
    <article className="article-detail">
      {coverImageUrl ? <img className="article-detail-cover" src={coverImageUrl} alt={coverAltText} /> : null}
      <h1>{object.title}</h1>
      {metadataExcerpt ? <p className="article-excerpt">{metadataExcerpt}</p> : null}
      <p className="meta">
        {formatDate(object.publishedAt, locale)}
        <CopyLinkButton locale={locale} />
      </p>
      <div className="body-content" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </article>
  );
}
