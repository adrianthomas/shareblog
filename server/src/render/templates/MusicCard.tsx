import React from "react";
import type { ContentObject, MusicMetadata } from "./types.js";
import { formatDate } from "./ThoughtPost.js";

export function MusicCard({
  object,
  variant = "card",
}: {
  object: ContentObject;
  variant?: "card" | "page";
}) {
  const metadata = object.metadata as MusicMetadata;

  return (
    <article className={variant === "card" ? "card music" : "music"}>
      {metadata.artworkUrl ? <img src={metadata.artworkUrl} alt={metadata.releaseTitle} /> : null}
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
        {variant === "page" && metadata.links && Object.values(metadata.links).some(Boolean) ? (
          <p className="meta">
            {Object.entries(metadata.links)
              .filter(([, url]) => url)
              .map(([label, url]) => (
                <a key={label} href={url} style={{ marginRight: "0.75rem" }}>
                  {label}
                </a>
              ))}
          </p>
        ) : null}
        <p className="meta">{formatDate(object.publishedAt)}</p>
      </div>
    </article>
  );
}
