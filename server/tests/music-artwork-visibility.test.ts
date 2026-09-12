import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { feedItemContent, renderObjectPage } from "../src/render/render.js";
import { MusicCard } from "../src/render/templates/MusicCard.js";
import type { ContentObject, Site } from "../src/render/templates/types.js";

const ARTWORK_URL = "https://artwork.example/visible-only-when-enabled.jpg";

function song(showArtwork?: boolean): ContentObject {
  return {
    id: "music-1",
    siteId: "site-1",
    type: "music",
    slug: "example-song",
    title: null,
    body: "A note about this song.",
    status: "published",
    sourceUrl: "https://music.example/song",
    metadata: {
      artist: "Example Artist",
      releaseTitle: "Example Song",
      artworkUrl: ARTWORK_URL,
      ...(showArtwork === undefined ? {} : { showArtwork }),
    },
    publishedAt: new Date("2026-09-06T10:00:00Z"),
    createdAt: new Date("2026-09-06T10:00:00Z"),
    updatedAt: new Date("2026-09-06T10:00:00Z"),
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

test("song artwork remains public when showArtwork is absent", async () => {
  const object = song();
  const card = renderToStaticMarkup(React.createElement(MusicCard, { object }));
  const feed = await feedItemContent(object, "en");
  const page = await renderObjectPage(site, object);

  assert.ok(card.includes(ARTWORK_URL));
  assert.ok(feed.includes(ARTWORK_URL));
  assert.ok(page.includes(ARTWORK_URL));
});

test("showArtwork false omits retained artwork from all public outputs", async () => {
  const object = song(false);

  for (const theme of ["classic", "cards", "washi", "prism", "ledger", "cabinet", "aqua", "think"] as const) {
    for (const variant of ["card", "page"] as const) {
      const html = renderToStaticMarkup(
        React.createElement(MusicCard, {
          object,
          theme,
          variant,
          backHref: "/",
          backLabel: "Back",
        }),
      );
      assert.ok(!html.includes(ARTWORK_URL), `${theme} ${variant} exposed the hidden artwork`);
    }
  }

  assert.ok(!(await feedItemContent(object, "en")).includes(ARTWORK_URL));
  assert.ok(!(await renderObjectPage(site, object)).includes(ARTWORK_URL));
});
