import React from "react";
import type { ContentObject, MusicMetadata } from "./types.js";
import { formatDate } from "./ThoughtPost.js";
import { t } from "../i18n.js";

const PLATFORM_LABELS: Record<string, string> = {
  spotify: "Spotify",
  appleMusic: "Apple Music",
  youtubeMusic: "YouTube Music",
  bandcamp: "Bandcamp",
};

export function MusicCard({
  object,
  variant = "card",
  locale = "en",
}: {
  object: ContentObject;
  variant?: "card" | "page";
  locale?: string;
}) {
  const metadata = object.metadata as MusicMetadata;
  const links = Object.entries(metadata.links ?? {}).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );
  const visibleLinks = variant === "card" ? links.slice(0, 1) : links;

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
        {object.body ? <p>{object.body}</p> : null}
        {visibleLinks.length > 0 ? (
          <p className="music-links">
            {visibleLinks.map(([platform, url]) => (
              <a key={platform} href={url}>
                {t(locale, "listenOn", { platform: PLATFORM_LABELS[platform] ?? platform })}
              </a>
            ))}
          </p>
        ) : null}
        <p className="meta">{formatDate(object.publishedAt, locale)}</p>
      </div>
    </article>
  );
}
