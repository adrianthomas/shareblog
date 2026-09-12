import assert from "node:assert/strict";
import test from "node:test";
import { renderImpressumPage } from "../src/render/render.js";
import type { Site } from "../src/render/templates/types.js";

function site(statsEnabled: boolean): Site {
  return {
    id: "legal-site",
    ownerUserId: "legal-owner",
    subdomain: "legal",
    customDomain: null,
    title: "Legal test",
    tagline: null,
    profileName: null,
    introduction: null,
    location: null,
    profileImageUrl: null,
    profileLinks: [],
    contactLabel: null,
    contactUrl: null,
    contactLinks: [],
    about: null,
    locale: "en",
    theme: "classic",
    federationEnabled: true,
    statsEnabled,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

test("legal page identifies itself as Legal and discloses enabled statistics", () => {
  process.env.BASE_DOMAIN = "example.test";
  process.env.ENABLE_IMPRESSUM_PAGE = "true";
  const html = renderImpressumPage(site(true));

  assert.match(html, /<title>Legal — Legal test<\/title>/);
  assert.match(html, /<h1>Legal<\/h1>/);
  assert.match(html, /Status: Reichweitenmessung aktiviert\./);
  assert.match(html, /Do Not Track/);
  assert.match(html, /href="\/impressum">Legal<\/a>/);
  assert.doesNotMatch(html, /Status: Reichweitenmessung deaktiviert\./);
});

test("legal page discloses disabled statistics and deletion of old counters", () => {
  process.env.BASE_DOMAIN = "example.test";
  process.env.ENABLE_IMPRESSUM_PAGE = "true";
  const html = renderImpressumPage(site(false));

  assert.match(html, /Status: Reichweitenmessung deaktiviert\./);
  assert.match(html, /zuvor gespeicherte aggregierte Zähler unwiderruflich gelöscht/);
  assert.doesNotMatch(html, /Status: Reichweitenmessung aktiviert\./);
});
