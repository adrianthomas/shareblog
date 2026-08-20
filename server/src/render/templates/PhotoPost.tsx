import React from "react";
import type { ContentObject, PhotoMetadata } from "./types.js";
import type { Theme } from "../../db/schema.js";
import { formatDate } from "./ThoughtPost.js";
import { t } from "../i18n.js";
import { CardsFeedItem, CardsDetailHeader } from "../themes/cards.js";

export function PhotoPost({
  object,
  imageUrl,
  linked = true,
  locale = "en",
  theme = "classic",
  backHref,
  backLabel,
}: {
  object: ContentObject;
  imageUrl: string;
  linked?: boolean;
  locale?: string;
  theme?: Theme;
  backHref?: string;
  backLabel?: string;
}) {
  const metadata = object.metadata as PhotoMetadata;

  if (theme === "cards") {
    const title = metadata.caption || formatDate(object.publishedAt, locale);
    const hero = { imageUrl, imageAlt: metadata.caption ?? "", gradientSeed: object.slug };
    if (linked) {
      return <CardsFeedItem href={`/photos/${object.slug}`} eyebrow={t(locale, "photos")} title={title} hero={hero} />;
    }
    return (
      <CardsDetailHeader
        href={`/photos/${object.slug}`}
        eyebrow={t(locale, "photos")}
        title={title}
        dateLabel={formatDate(object.publishedAt, locale)}
        hero={hero}
        backHref={backHref!}
        backLabel={backLabel!}
      />
    );
  }

  const image = <img src={imageUrl} alt={metadata.caption ?? ""} />;

  return (
    <article className="card">
      {linked ? <a href={`/photos/${object.slug}`}>{image}</a> : image}
      {metadata.caption ? <p>{metadata.caption}</p> : null}
      <div className="meta">{formatDate(object.publishedAt, locale)}</div>
    </article>
  );
}
