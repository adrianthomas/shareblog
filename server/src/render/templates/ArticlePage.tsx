import React from "react";
import type { ContentObject, ArticleMetadata } from "./types.js";
import type { Theme } from "../../db/schema.js";
import { formatDate } from "./ThoughtPost.js";
import { t } from "../i18n.js";
import { CardsFeedItem, CardsDetailHeader } from "../themes/cards.js";

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

  if (theme === "cards") {
    return (
      <CardsFeedItem
        href={`/articles/${object.slug}`}
        eyebrow={t(locale, "articles")}
        title={object.title}
        subtitle={metadata.excerpt}
        type={object.type}
        hero={{ imageUrl: coverImageUrl, imageAlt: "", gradientSeed: object.slug }}
      />
    );
  }

  return (
    <article className="card">
      <h2>
        <a className="title-link" href={`/articles/${object.slug}`}>
          {object.title}
        </a>
      </h2>
      {metadata.excerpt ? <p>{metadata.excerpt}</p> : null}
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
  const paragraphs = (object.body ?? "").split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>);

  if (theme === "cards") {
    return (
      <>
        <CardsDetailHeader
          href={`/articles/${object.slug}`}
          eyebrow={t(locale, "articles")}
          title={object.title}
          subtitle={metadata.excerpt}
          dateLabel={formatDate(object.publishedAt, locale)}
          type={object.type}
          hero={{ imageUrl: coverImageUrl, imageAlt: "", gradientSeed: object.slug }}
          backHref={backHref!}
          backLabel={backLabel!}
        />
        <div className="cards-body">{paragraphs}</div>
      </>
    );
  }

  return (
    <article>
      <h1>{object.title}</h1>
      <p className="meta">{formatDate(object.publishedAt, locale)}</p>
      {paragraphs}
    </article>
  );
}
