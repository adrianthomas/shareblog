import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { feedItemContent, renderObjectPage } from "../src/render/render.js";
import { BookCard } from "../src/render/templates/BookCard.js";
import type { ContentObject, Site } from "../src/render/templates/types.js";

const COVER_URL = "https://covers.example/visible-only-when-enabled.jpg";

function book(showCover?: boolean): ContentObject {
  return {
    id: "book-1",
    siteId: "site-1",
    type: "book",
    slug: "history-book",
    title: "A History Book",
    body: "A contextual review.",
    status: "published",
    sourceUrl: null,
    metadata: {
      author: "A. Historian",
      coverUrl: COVER_URL,
      ...(showCover === undefined ? {} : { showCover }),
    },
    publishedAt: new Date("2026-09-05T10:00:00Z"),
    createdAt: new Date("2026-09-05T10:00:00Z"),
    updatedAt: new Date("2026-09-05T10:00:00Z"),
  } as ContentObject;
}

const site = {
  id: "site-1",
  title: "Test Site",
  tagline: null,
  introduction: null,
  profileImageUrl: null,
  subdomain: "test",
  customDomain: null,
  locale: "en",
  theme: "classic",
} as Site;

test("book covers remain public when showCover is absent", async () => {
  const object = book();
  const card = renderToStaticMarkup(React.createElement(BookCard, { object }));
  const feed = await feedItemContent(object, "en");
  const page = await renderObjectPage(site, object);

  assert.match(card, new RegExp(COVER_URL));
  assert.match(feed, new RegExp(COVER_URL));
  assert.match(page, new RegExp(COVER_URL));
});

test("showCover false omits a retained cover from all public outputs", async () => {
  const object = book(false);

  for (const theme of ["classic", "cards", "washi", "prism", "ledger", "cabinet"] as const) {
    for (const variant of ["card", "page"] as const) {
      const html = renderToStaticMarkup(
        React.createElement(BookCard, {
          object,
          theme,
          variant,
          backHref: "/",
          backLabel: "Back",
        }),
      );
      assert.doesNotMatch(html, new RegExp(COVER_URL), `${theme} ${variant} exposed the hidden cover`);
    }
  }

  assert.doesNotMatch(await feedItemContent(object, "en"), new RegExp(COVER_URL));
  assert.doesNotMatch(await renderObjectPage(site, object), new RegExp(COVER_URL));
});
