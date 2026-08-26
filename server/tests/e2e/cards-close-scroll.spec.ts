import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

// Mints a fresh owner account + API token directly in the test DB, reusing
// the same script `deploy.sh` runs on every real deploy (see
// src/db/bootstrap-owner.ts) rather than reimplementing that logic here —
// it's already the tested, production way to get an authenticated session
// without a mailbox. Idempotent by design (a no-op if a user already
// exists), so this only actually mints a token on a fresh DB — which is
// exactly what playwright.config.ts's webServer guarantees by deleting the
// test DB file before every run.
function bootstrapOwnerToken(): string {
  const serverRoot = path.resolve(import.meta.dirname, "../..");
  const output = execFileSync("npx", ["tsx", "src/db/bootstrap-owner.ts", "--email", "e2e@test.local"], {
    cwd: serverRoot,
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? path.resolve(serverRoot, "data/e2e-test.db") },
    encoding: "utf8",
  });
  const match = output.match(/SHAREBLOG_BOOTSTRAP_TOKEN=(\S+)/);
  if (!match) throw new Error(`bootstrap-owner.ts didn't print a token — was the DB already seeded?\n${output}`);
  return match[1];
}

async function api(baseURL: string, token: string, path: string, body: unknown, method = "POST") {
  const res = await fetch(`${baseURL.replace("localhost", "api.localhost")}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

// A minimal but valid 8x8 red JPEG, uploaded for real through /api/v1/assets
// (multipart, the same way the app does it) rather than inserted straight
// into the DB — this exercises the real upload -> processImage -> variants
// pipeline, so the photo card in the feed is exactly what production would
// render, not a stand-in.
const TINY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAAIAAgBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/AKp//9k=";

async function uploadAsset(baseURL: string, token: string): Promise<string> {
  const bytes = Buffer.from(TINY_JPEG_BASE64, "base64");
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "image/jpeg" }), "test.jpg");
  const res = await fetch(`${baseURL.replace("localhost", "api.localhost")}/api/v1/assets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`asset upload -> ${res.status}: ${await res.text()}`);
  const { asset } = await res.json();
  return asset.id as string;
}

// Enough cards to make the feed taller than one viewport — the bug this
// guards against only shows up once there's an actual scroll position to
// lose. Content/order doesn't matter otherwise.
const POSTS = [
  { type: "thought", status: "published", body: "First test post.", metadata: {} },
  { type: "quote", status: "published", body: "A quote worth testing.", metadata: { author: "Test Author" } },
  { type: "thought", status: "published", body: "Second test post, a bit longer to take up more vertical space in the feed.", metadata: {} },
  { type: "quote", status: "published", body: "Another quote.", metadata: { author: "Someone Else" } },
  { type: "thought", status: "published", body: "Third test post.", metadata: {} },
  { type: "thought", status: "published", body: "Fourth test post.", metadata: {} },
];

let siteBaseURL: string;
let apiBaseURL: string;
let ownerToken: string;

test.beforeAll(async ({ baseURL }) => {
  ownerToken = bootstrapOwnerToken();
  apiBaseURL = baseURL!;
  await api(apiBaseURL, ownerToken, "/api/v1/sites", { subdomain: "e2ecards", title: "E2E Cards Site" });
  await api(apiBaseURL, ownerToken, "/api/v1/sites", { theme: "cards" }, "PATCH");
  for (const post of POSTS) {
    await api(apiBaseURL, ownerToken, "/api/v1/objects", post);
  }
  await api(apiBaseURL, ownerToken, "/api/v1/objects", {
    type: "book",
    title: "Test Book",
    status: "published",
    body: "A reading note.",
    metadata: {
      author: "Test Author",
      coverUrl: `data:image/jpeg;base64,${TINY_JPEG_BASE64}`,
      links: {},
      source: "manual",
    },
  });
  await api(apiBaseURL, ownerToken, "/api/v1/objects", {
    type: "music",
    status: "published",
    body: "A listening note.",
    metadata: {
      artist: "Test Artist",
      releaseTitle: "Test Album",
      artworkUrl: `data:image/jpeg;base64,${TINY_JPEG_BASE64}`,
      links: {},
    },
  });
  const assetId = await uploadAsset(apiBaseURL, ownerToken);
  await api(apiBaseURL, ownerToken, "/api/v1/objects", {
    type: "photo",
    status: "published",
    metadata: { assetId, caption: "A test photo." },
  });
  siteBaseURL = apiBaseURL.replace("localhost", "e2ecards.localhost");
});

// Both signals checked independently: scrollY is the thing the fix in
// cards.tsx's lockPageScroll/unlockPageScroll operates on directly, and the
// reference card's on-screen position is what a person actually sees — a
// regression that somehow left scrollY correct but shifted layout above the
// fold (e.g. a header height change) would only show up in the second one.
async function expectCloseRestoresScroll(page: Page, cardIndexToOpen: number) {
  await page.goto(siteBaseURL + "/");
  await page.waitForSelector("[data-cards-card]");

  // Deliberately fractional: real on-device momentum/rubber-band scrolling
  // regularly leaves the browser at a sub-pixel position (this is what
  // originally made the bug possible — see the comment on lockedScrollY's
  // Math.round in cards.tsx). Desktop WebKit won't reproduce that from
  // simulated touch input, but it does honor an explicit fractional
  // scrollTo, so setting one directly exercises the same rounding path
  // deterministically instead of depending on unreliable scroll physics.
  await page.evaluate(() => window.scrollTo(0, 300.6));
  const initialScrollY = await page.evaluate(() => window.scrollY);
  // A card that's never the one being opened/closed, so its own box is a
  // clean read of "did the page around the overlay move" independent of
  // whatever FLIP animation the opened card itself is doing.
  const referenceCard = page.locator("[data-cards-card]").nth((cardIndexToOpen + 3) % 7);
  const initialRect = await referenceCard.boundingBox();
  expect(initialRect).not.toBeNull();

  await page.locator("[data-cards-card]").nth(cardIndexToOpen).click();
  await page.waitForSelector(".cards-panel", { state: "attached" });
  await page.waitForSelector(".cards-close", { state: "visible" });

  await page.locator(".cards-close").first().click();
  // Confirms closeOverlay's cleanup() — which calls unlockPageScroll() —
  // actually ran, rather than asserting on a fixed timeout that could pass
  // by accident on a fast run and flake on a slow one.
  await page.waitForSelector(".cards-panel", { state: "detached" });

  const finalScrollY = await page.evaluate(() => window.scrollY);
  const finalRect = await referenceCard.boundingBox();

  expect(finalScrollY).toBe(initialScrollY);
  expect(finalRect!.y).toBeCloseTo(initialRect!.y, 1);
}

test("closing a generic card (openCard) restores the exact pre-open scroll position", async ({ page }) => {
  // The feed orders newest-first and the photo post is created last (see
  // beforeAll), so index 0 is the photo, index 1 is music, index 2 is a
  // book, and 3+ are the quote/thought posts —
  // any of those goes through the generic whole-panel FLIP path
  // (openCard/closeOverlay), the one lockPageScroll/unlockPageScroll were
  // added to directly.
  await expectCloseRestoresScroll(page, 3);
});

test("closing a photo card (openPhotoCard) restores the exact pre-open scroll position", async ({ page }) => {
  // Photos get their own dedicated shared-element open animation
  // (openPhotoCard/finishOpenPhotoCard) — a separate code path from the
  // generic one above that calls the same lockPageScroll, worth its own
  // coverage rather than assuming the generic path's correctness transfers.
  await expectCloseRestoresScroll(page, 0);
});

async function expectMusicCardKeepsDetailAnimation(page: Page) {
  await page.goto(siteBaseURL + "/");
  const musicCard = page.locator('[data-cards-card][data-cards-type="music"]').first();
  await expect(musicCard).toBeVisible();

  const musicHero = musicCard.locator(".cards-hero");
  const heroDisplay = await musicHero.evaluate((el) => getComputedStyle(el).display);
  expect(heroDisplay).toBe("grid");

  const artworkBox = await musicCard.locator(".cards-hero img").boundingBox();
  const heroBox = await musicHero.boundingBox();
  expect(artworkBox).not.toBeNull();
  expect(heroBox).not.toBeNull();
  expect(artworkBox!.width).toBeLessThan(heroBox!.width * 0.6);

  await musicCard.click();
  await page.waitForSelector(".cards-panel", { state: "attached" });
  await expect(page.locator(".cards-music-header")).toBeVisible();
  await expect(page.locator(".cards-music-artwork")).toBeVisible();

  await page.locator(".cards-close").first().click();
  await page.waitForSelector(".cards-panel", { state: "detached" });
}

async function expectBookCardKeepsDetailAnimation(page: Page) {
  await page.goto(siteBaseURL + "/");
  const bookCard = page.locator('[data-cards-card][data-cards-type="book"]').first();
  await expect(bookCard).toBeVisible();

  const bookHero = bookCard.locator(".cards-hero");
  const heroDisplay = await bookHero.evaluate((el) => getComputedStyle(el).display);
  expect(heroDisplay).toBe("grid");

  const coverBox = await bookCard.locator(".cards-hero img").boundingBox();
  const heroBox = await bookHero.boundingBox();
  expect(coverBox).not.toBeNull();
  expect(heroBox).not.toBeNull();
  expect(coverBox!.height / coverBox!.width).toBeGreaterThan(1.3);
  expect(coverBox!.width).toBeLessThan(heroBox!.width * 0.6);

  await bookCard.click();
  await page.waitForSelector(".cards-panel", { state: "attached" });
  await expect(page.locator(".cards-book-header")).toBeVisible();
  await expect(page.locator(".cards-book-cover")).toBeVisible();

  await page.locator(".cards-close").first().click();
  await page.waitForSelector(".cards-panel", { state: "detached" });
}

test("Cards music feed cards keep the music detail animation path", async ({ page }) => {
  await api(apiBaseURL, ownerToken, "/api/v1/sites", { theme: "cards" }, "PATCH");
  await expectMusicCardKeepsDetailAnimation(page);
});

test("Cards book feed cards keep the book detail animation path", async ({ page }) => {
  await api(apiBaseURL, ownerToken, "/api/v1/sites", { theme: "cards" }, "PATCH");
  await expectBookCardKeepsDetailAnimation(page);
});

test("Prism music feed cards keep the music detail animation path", async ({ page }) => {
  await api(apiBaseURL, ownerToken, "/api/v1/sites", { theme: "prism" }, "PATCH");
  await expectMusicCardKeepsDetailAnimation(page);
});

test("Prism book feed cards keep the book detail animation path", async ({ page }) => {
  await api(apiBaseURL, ownerToken, "/api/v1/sites", { theme: "prism" }, "PATCH");
  await expectBookCardKeepsDetailAnimation(page);
});
