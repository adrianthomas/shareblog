import React from "react";
import type { ContentObject, PhotoMetadata } from "./types.js";
import { formatDate } from "./ThoughtPost.js";

export function PhotoPost({
  object,
  imageUrl,
  linked = true,
}: {
  object: ContentObject;
  imageUrl: string;
  linked?: boolean;
}) {
  const metadata = object.metadata as PhotoMetadata;
  const image = <img src={imageUrl} alt={metadata.caption ?? ""} />;

  return (
    <article className="card">
      {linked ? <a href={`/photos/${object.slug}`}>{image}</a> : image}
      {metadata.caption ? <p>{metadata.caption}</p> : null}
      <div className="meta">{formatDate(object.publishedAt)}</div>
    </article>
  );
}
