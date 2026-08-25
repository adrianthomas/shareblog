import React from "react";
import type { ContentObject, LinkMetadata } from "./types.js";
import type { Theme } from "../../db/schema.js";
import { formatDate } from "./ThoughtPost.js";
import { t } from "../i18n.js";
import { formatBasicText } from "../format.js";
import { CopyLinkButton } from "./CopyButton.js";

function externalUrl(object: ContentObject): string {
  return object.sourceUrl ?? `/links/${object.slug}`;
}

function ExternalTitle({ object }: { object: ContentObject }) {
  return (
    <a className="title-link link-title-link" href={externalUrl(object)} target="_blank" rel="noopener noreferrer">
      {object.title}
      <span aria-hidden="true"> -&gt;</span>
    </a>
  );
}

function OpenLinkButton({ object, locale }: { object: ContentObject; locale: string }) {
  return (
    <a className="open-link-button" href={externalUrl(object)} target="_blank" rel="noopener noreferrer">
      {t(locale, "openLink")} <span aria-hidden="true">-&gt;</span>
    </a>
  );
}

export function LinkPost({
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
  const metadata = object.metadata as LinkMetadata;
  const bodyHtml = formatBasicText(object.body ?? "");

  if (theme === "cards" || theme === "prism") {
    return (
      <>
        {!linked ? (
          <a className="cards-close" href={backHref} aria-label={backLabel}>
            <span aria-hidden="true">×</span>
          </a>
        ) : null}
        <article className={`cards-link-card${linked ? "" : " cards-link-card--full"}`}>
          <p className="cards-link-eyebrow">{t(locale, "links")}</p>
          <h2 className="cards-link-title">
            <ExternalTitle object={object} />
          </h2>
          {metadata.excerpt ? <p className="cards-link-excerpt">{metadata.excerpt}</p> : null}
          {bodyHtml ? <div className="cards-link-comment body-content" dangerouslySetInnerHTML={{ __html: bodyHtml }} /> : null}
          <p className="cards-link-date">{formatDate(object.publishedAt, locale)}</p>
          <div className="cards-link-actions">
            <OpenLinkButton object={object} locale={locale} />
            {!linked ? <CopyLinkButton locale={locale} /> : null}
          </div>
        </article>
      </>
    );
  }

  return (
    <article className="card link-card">
      <p className="meta">{t(locale, "links")}</p>
      <h2>
        <ExternalTitle object={object} />
      </h2>
      {metadata.excerpt ? <p className="link-excerpt">{metadata.excerpt}</p> : null}
      {bodyHtml ? <div className="body-content link-comment" dangerouslySetInnerHTML={{ __html: bodyHtml }} /> : null}
      <p className="meta">{formatDate(object.publishedAt, locale)}</p>
      <p className="link-actions">
        <OpenLinkButton object={object} locale={locale} />
        {!linked ? <CopyLinkButton locale={locale} /> : null}
      </p>
    </article>
  );
}
