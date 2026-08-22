import React from "react";
import type { ContentObject } from "./types.js";
import type { Theme } from "../../db/schema.js";
import { t } from "../i18n.js";
import { CardsFeedItem, CardsDetailHeader } from "../themes/cards.js";
import { formatRichText, stripBasicFormatting } from "../format.js";
import { CopyLinkButton } from "./CopyButton.js";

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
    // The cards feed/detail treatment uses the body itself as the heading
    // (a Thought has no separate title field) — stripped to plain text so
    // any **bold**/# heading/![image] syntax a "full post" body now supports
    // (see the classic-theme rendering below) doesn't leak through as
    // literal characters. This compact card grid was never meant to host
    // full long-form structure anyway; write it as an Article for that.
    const title = stripBasicFormatting(object.body ?? "");
    if (linked) {
      return (
        <CardsFeedItem
          href={`/posts/${object.slug}`}
          eyebrow={t(locale, "posts")}
          title={title}
          type={object.type}
          hero={hero}
        />
      );
    }
    return (
      <CardsDetailHeader
        href={`/posts/${object.slug}`}
        eyebrow={t(locale, "posts")}
        title={title}
        dateLabel={
          <>
            {formatDate(object.publishedAt, locale)}
            <CopyLinkButton locale={locale} />
          </>
        }
        type={object.type}
        hero={hero}
        backHref={backHref!}
        backLabel={backLabel!}
      />
    );
  }

  return (
    <article className="card">
      <div className="body-content" dangerouslySetInnerHTML={{ __html: formatRichText(object.body ?? "") }} />
      <div className="meta">
        {linked ? (
          <a className="title-link" href={`/posts/${object.slug}`}>
            {formatDate(object.publishedAt, locale)}
          </a>
        ) : (
          <>
            {formatDate(object.publishedAt, locale)}
            <CopyLinkButton locale={locale} />
          </>
        )}
      </div>
    </article>
  );
}

export function formatDate(date: Date | null, locale = "en"): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(date);
}
