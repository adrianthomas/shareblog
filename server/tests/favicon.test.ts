import assert from "node:assert/strict";
import test from "node:test";
import { renderFavicon } from "../src/render/favicon.js";
import type { Site } from "../src/render/templates/types.js";

test("uses the profile initial in a safe SVG favicon", () => {
  const site = {
    profileName: "Adrian & friends",
    title: "Notes",
    locale: "en",
  } as Site;

  const svg = renderFavicon(site);
  assert.match(svg, />A<\/text>/);
  assert.doesNotMatch(svg, /Adrian/);
  assert.match(svg, /prefers-color-scheme: dark/);
});

test("falls back to the site title when no profile name is configured", () => {
  const site = { profileName: null, title: "Shareblog", locale: "en" } as Site;
  assert.match(renderFavicon(site), />S<\/text>/);
});
