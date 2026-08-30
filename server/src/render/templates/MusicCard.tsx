import React from "react";
import type { ContentObject, MusicMetadata } from "./types.js";
import type { Theme } from "../../db/schema.js";
import { formatDate } from "./ThoughtPost.js";
import { t } from "../i18n.js";
import { CardsFeedItem, CardsDetailHeader, CardsMusicDetailHeader } from "../themes/cards.js";
import { CabinetDetailHeader, CabinetFeedItem } from "../themes/cabinet.js";
import { formatBasicText } from "../format.js";
import { CopyLinkButton } from "./CopyButton.js";

function Note({ body }: { body: string | null }) {
  if (!body) return null;
  return <div className="body-content" dangerouslySetInnerHTML={{ __html: formatBasicText(body) }} />;
}

export const PLATFORM_LABELS: Record<string, string> = {
  spotify: "Spotify",
  appleMusic: "Apple Music",
  youtubeMusic: "YouTube Music",
  bandcamp: "Bandcamp",
};

function MusicLink({ platform, url, locale }: { platform: string; url: string; locale: string }) {
  return (
    <a href={url}>
      <span className="music-link-icon" aria-hidden="true">
        ▶︎
      </span>
      <span>{t(locale, "listenOn", { platform: PLATFORM_LABELS[platform] ?? platform })}</span>
    </a>
  );
}

export function MusicCard({
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
  const metadata = object.metadata as MusicMetadata;
  const links = Object.entries(metadata.links ?? {}).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );
  const visibleLinks = variant === "card" ? links.slice(0, 1) : links;

  if (theme === "cabinet") {
    const image = metadata.artworkUrl
      ? { url: metadata.artworkUrl, alt: "" }
      : undefined;
    if (variant === "card") {
      return (
        <CabinetFeedItem
          href={`/music/${object.slug}`}
          eyebrow={t(locale, "music")}
          title={metadata.releaseTitle}
          subtitle={metadata.artist}
          dateLabel={formatDate(object.publishedAt, locale)}
          type={object.type}
          image={image}
        />
      );
    }
    return (
      <>
        <CabinetDetailHeader
          type={object.type}
          eyebrow={t(locale, "music")}
          title={metadata.releaseTitle}
          subtitle={metadata.artist}
          dateLabel={
            <>
              {formatDate(object.publishedAt, locale)}
              <CopyLinkButton locale={locale} />
            </>
          }
          image={image}
          backHref={backHref!}
          backLabel={backLabel!}
        />
        {object.body || links.length > 0 ? (
          <div className="cabinet-detail-body cabinet-detail-body--music">
            <Note body={object.body} />
            {links.length > 0 ? (
              <p className="music-links">
                {links.map(([platform, url]) => (
                  <MusicLink key={platform} platform={platform} url={url} locale={locale} />
                ))}
              </p>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  if (theme === "cards" || theme === "prism" || theme === "ledger") {
    const hero = {
      imageUrl: metadata.artworkUrl,
      imageAlt: `Artwork for ${metadata.releaseTitle}`,
      gradientSeed: object.slug,
    };
    if (variant === "card") {
      return (
        <CardsFeedItem
          href={`/music/${object.slug}`}
          eyebrow={t(locale, "music")}
          title={metadata.releaseTitle}
          subtitle={metadata.artist}
          type={object.type}
          hero={hero}
        />
      );
    }
    if (metadata.artworkUrl) {
      return (
        <>
          <CardsMusicDetailHeader
            eyebrow={t(locale, "music")}
            title={metadata.releaseTitle}
            artist={metadata.artist}
            dateLabel={
              <>
                {formatDate(object.publishedAt, locale)}
                <CopyLinkButton locale={locale} />
              </>
            }
            artworkUrl={metadata.artworkUrl}
            artworkAlt={hero.imageAlt}
            backHref={backHref!}
            backLabel={backLabel!}
          />
          <div className="cards-body">
            <Note body={object.body} />
            {links.length > 0 ? (
              <p className="music-links">
                {links.map(([platform, url]) => (
                  <MusicLink key={platform} platform={platform} url={url} locale={locale} />
                ))}
              </p>
            ) : null}
          </div>
        </>
      );
    }
    return (
      <>
        <CardsDetailHeader
          href={`/music/${object.slug}`}
          eyebrow={t(locale, "music")}
          title={metadata.releaseTitle}
          subtitle={metadata.artist}
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
        <div className="cards-body">
          <Note body={object.body} />
          {links.length > 0 ? (
            <p className="music-links">
              {links.map(([platform, url]) => (
                <MusicLink key={platform} platform={platform} url={url} locale={locale} />
              ))}
            </p>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <article className={variant === "card" ? "card music" : "music"}>
      {metadata.artworkUrl ? (
        <img className="artwork" src={metadata.artworkUrl} alt={`Artwork for ${metadata.releaseTitle}`} />
      ) : null}
      <div>
        <h2>
          {variant === "card" ? (
            <a className="title-link" href={`/music/${object.slug}`}>
              {metadata.releaseTitle}
            </a>
          ) : (
            metadata.releaseTitle
          )}
        </h2>
        <p className="meta">{metadata.artist}</p>
        <Note body={object.body} />
        {visibleLinks.length > 0 ? (
          <p className="music-links">
            {visibleLinks.map(([platform, url]) => (
              <MusicLink key={platform} platform={platform} url={url} locale={locale} />
            ))}
          </p>
        ) : null}
        <p className="meta">
          {formatDate(object.publishedAt, locale)}
          {variant === "page" ? <CopyLinkButton locale={locale} /> : null}
        </p>
      </div>
    </article>
  );
}
