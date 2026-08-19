import React from "react";
import type { ContentObject, ArticleMetadata } from "./types.js";
import { formatDate } from "./ThoughtPost.js";

export function ArticleCard({ object }: { object: ContentObject }) {
  const metadata = object.metadata as ArticleMetadata;
  return (
    <article className="card">
      <h2>
        <a className="title-link" href={`/articles/${object.slug}`}>
          {object.title}
        </a>
      </h2>
      {metadata.excerpt ? <p>{metadata.excerpt}</p> : null}
      <p className="meta">{formatDate(object.publishedAt)}</p>
    </article>
  );
}

export function ArticlePage({ object }: { object: ContentObject }) {
  return (
    <article>
      <h1>{object.title}</h1>
      <p className="meta">{formatDate(object.publishedAt)}</p>
      {(object.body ?? "").split("\n\n").map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </article>
  );
}
