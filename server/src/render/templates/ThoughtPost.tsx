import React from "react";
import type { ContentObject } from "./types.js";
import type { Theme } from "../../db/schema.js";
import { t } from "../i18n.js";
import { CardsFeedItem, CardsDetailHeader } from "../themes/cards.js";

export function ThoughtPost({
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
  if (theme === "cards") {
    const hero = { gradientSeed: object.slug, imageAlt: "" };
    if (linked) {
      return (
        <CardsFeedItem
          href={`/posts/${object.slug}`}
          eyebrow={t(locale, "posts")}
          title={object.body}
          type={object.type}
          hero={hero}
        />
      );
    }
    return (
      <CardsDetailHeader
        href={`/posts/${object.slug}`}
        eyebrow={t(locale, "posts")}
        title={object.body}
        dateLabel={formatDate(object.publishedAt, locale)}
        type={object.type}
        hero={hero}
        backHref={backHref!}
        backLabel={backLabel!}
      />
    );
  }

  return (
    <article className="card">
      <p>{object.body}</p>
      <div className="meta">
        {linked ? (
          <a className="title-link" href={`/posts/${object.slug}`}>
            {formatDate(object.publishedAt, locale)}
          </a>
        ) : (
          formatDate(object.publishedAt, locale)
        )}
      </div>
    </article>
  );
}

export function formatDate(date: Date | null, locale = "en"): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(date);
}
