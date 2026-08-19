import React from "react";
import type { ContentObject } from "./types.js";

export function ThoughtPost({
  object,
  linked = true,
  locale = "en",
}: {
  object: ContentObject;
  linked?: boolean;
  locale?: string;
}) {
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
