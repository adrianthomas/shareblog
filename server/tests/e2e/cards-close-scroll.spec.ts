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
const PORTRAIT_COVER_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="124" viewBox="0 0 80 124"><rect width="80" height="124" fill="#83512e"/><rect x="9" y="12" width="62" height="100" rx="2" fill="#f7ead7"/><text x="40" y="43" text-anchor="middle" font-size="12" font-family="serif" fill="#2f2217">Test</text><text x="40" y="60" text-anchor="middle" font-size="12" font-family="serif" fill="#2f2217">Book</text></svg>',
).toString("base64")}`;

async function uploadAsset(baseURL: string, token: string): Promise<{ id: string; url: string }> {
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
  return { id: asset.id as string, url: asset.url as string };
}

// Enough cards to make the feed taller than one viewport — the bug this
// guards against only shows up once there's an actual scroll position to
// lose. Content/order doesn't matter otherwise.
const POSTS = [
  {
    type: "thought",
    status: "published",
    body: "First test post with [a reference](https://example.com/reference).",
    metadata: {},
  },
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
    type: "link",
    title: "A link worth keeping",
    sourceUrl: "https://example.com/cabinet-test",
    status: "published",
    body: "A short note about why this belongs in the cabinet.",
    metadata: { excerpt: "The source and the owner's note remain distinct destinations." },
  });
  await api(apiBaseURL, ownerToken, "/api/v1/objects", {
    type: "book",
    title: "Test Book",
    status: "published",
    body: "A reading note.",
    metadata: {
      author: "Test Author",
      rating: 4,
      coverUrl: PORTRAIT_COVER_DATA_URI,
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
  const { id: assetId } = await uploadAsset(apiBaseURL, ownerToken);
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

  // The card being opened has to stay fully inside the viewport at the
  // scrolled position below — Playwright's .click() silently scrolls its
  // target into view first if it isn't, which would move the page itself
  // and invalidate this test's own "did the scroll position survive"
  // assertions. cardIndexToOpen === 0 (the newest post, right at the top
  // of the feed) is the tightest case: it goes out of view at a much
  // smaller scroll offset than a card further down the page, so the cap
  // here is based on its own resting position, not a fixed guess.
  const targetCard = page.locator("[data-cards-card]").nth(cardIndexToOpen);
  const targetRectAtRest = await targetCard.boundingBox();
  expect(targetRectAtRest).not.toBeNull();

  // Deliberately fractional: real on-device momentum/rubber-band scrolling
  // regularly leaves the browser at a sub-pixel position (this is what
  // originally made the bug possible — see the comment on lockedScrollY's
  // Math.round in cards.tsx). Desktop WebKit won't reproduce that from
  // simulated touch input, but it does honor an explicit fractional
  // scrollTo, so setting one directly exercises the same rounding path
  // deterministically instead of depending on unreliable scroll physics.
  const scrollTarget = Math.max(0, Math.min(targetRectAtRest!.y - 40, 300)) + 0.6;
  await page.evaluate((y) => window.scrollTo(0, y), scrollTarget);
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

test("deleting article and photo drafts removes their uploaded assets", async () => {
  const articleAsset = await uploadAsset(apiBaseURL, ownerToken);
  const { object: article } = await api(apiBaseURL, ownerToken, "/api/v1/objects", {
    type: "article",
    title: "Disposable article",
    body: `Body with an inline image.\n\n![Alt text](${articleAsset.url})`,
    status: "draft",
    metadata: {},
  });

  const photoAsset = await uploadAsset(apiBaseURL, ownerToken);
  const { object: photo } = await api(apiBaseURL, ownerToken, "/api/v1/objects", {
    type: "photo",
    status: "draft",
    metadata: { assetId: photoAsset.id, caption: "Disposable photo" },
  });

  for (const { object, asset } of [
    { object: article, asset: articleAsset },
    { object: photo, asset: photoAsset },
  ]) {
    const deleteResponse = await fetch(
      `${apiBaseURL.replace("localhost", "api.localhost")}/api/v1/objects/${object.id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${ownerToken}` } },
    );
    expect(deleteResponse.status).toBe(204);

    const assetResponse = await fetch(
      `${apiBaseURL.replace("localhost", "api.localhost")}/api/v1/assets/${asset.id}`,
      { headers: { Authorization: `Bearer ${ownerToken}` } },
    );
    expect(assetResponse.status).toBe(404);
    expect((await fetch(asset.url)).status).toBe(404);
  }
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
  const musicHero = page.locator('[data-cards-card][data-cards-type="music"] .cards-hero').first();
  const heroDisplay = await bookHero.evaluate((el) => getComputedStyle(el).display);
  expect(heroDisplay).toBe("grid");

  const coverBox = await bookCard.locator(".cards-hero img").boundingBox();
  const heroBox = await bookHero.boundingBox();
  const musicHeroBox = await musicHero.boundingBox();
  const bookCoverColumnWidth = await bookHero.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ")[0]);
  const musicCoverColumnWidth = await musicHero.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ")[0]);
  expect(coverBox).not.toBeNull();
  expect(heroBox).not.toBeNull();
  expect(musicHeroBox).not.toBeNull();
  await expect(bookCard.locator(".cards-rating")).toHaveText("★★★★☆");
  expect(bookCoverColumnWidth).toBe(musicCoverColumnWidth);
  expect(coverBox!.height / coverBox!.width).toBeGreaterThan(1.3);
  expect(coverBox!.width).toBeLessThan(heroBox!.width * 0.6);
  expect(coverBox!.y - heroBox!.y).toBeGreaterThan(4);
  expect(heroBox!.y + heroBox!.height - (coverBox!.y + coverBox!.height)).toBeGreaterThan(4);
  expect(heroBox!.height).toBeGreaterThan(musicHeroBox!.height);

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

test("Cabinet overlay preserves navigation, accessibility, focus, and scroll state", async ({ page }) => {
  await api(apiBaseURL, ownerToken, "/api/v1/sites", { theme: "cabinet" }, "PATCH");
  await page.goto(siteBaseURL + "/");

  const authoredLink = page.locator('.cabinet-thought-body a[href="https://example.com/reference"]').first();
  await expect(authoredLink).toBeVisible();
  expect(await authoredLink.evaluate((element) => Boolean(element.closest("a[data-cabinet-card]")))).toBe(false);
  await expect(
    page.locator(".cabinet-artifact:has(.cabinet-thought-body a) > .cabinet-thought-permalink"),
  ).toBeAttached();

  const card = page.locator('a[data-cabinet-card][data-cabinet-type="thought"]').first();
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();

  // Cabinet intentionally rounds its fixed-body lock position because mobile
  // WebKit can otherwise expose a sub-pixel seam. Start from that same stable
  // integer contract, then verify both the numerical scroll position and an
  // unaffected artifact's visual position after the overlay is gone.
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, Math.round(window.scrollY));
  });
  const initialScrollY = await page.evaluate(() => window.scrollY);
  const referenceArtifact = page.locator(".cabinet-artifact").last();
  const initialReferenceRect = await referenceArtifact.boundingBox();
  expect(initialReferenceRect).not.toBeNull();

  const homeURL = page.url();
  const homeTitle = await page.title();
  const href = await card.getAttribute("href");
  expect(href).not.toBeNull();
  const detailURL = new URL(href!, siteBaseURL).toString();

  await card.focus();
  await expect(card).toBeFocused();
  await card.click();

  const dialog = page.locator('.cabinet-panel[role="dialog"]');
  await expect(dialog).toBeAttached();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(page).toHaveURL(detailURL);
  await expect(page).toHaveTitle(/Fourth test post/);
  expect(await page.title()).not.toBe(homeTitle);

  const underlyingHeader = page.locator("body > header.site-header");
  const underlyingMain = page.locator("body > main#main-content");
  for (const region of [underlyingHeader, underlyingMain]) {
    await expect(region).toHaveAttribute("inert", "");
    await expect(region).toHaveAttribute("aria-hidden", "true");
  }

  const labelledBy = await dialog.getAttribute("aria-labelledby");
  expect(labelledBy).toBeTruthy();
  await expect
    .poll(() => page.evaluate((id) => document.activeElement?.id === id, labelledBy!))
    .toBe(true);

  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });

  await expect(page).toHaveURL(homeURL);
  await expect(page).toHaveTitle(homeTitle);
  for (const region of [underlyingHeader, underlyingMain]) {
    await expect(region).not.toHaveAttribute("inert", "");
    await expect(region).not.toHaveAttribute("aria-hidden", "true");
  }
  await expect(card).toBeFocused();

  const finalScrollY = await page.evaluate(() => window.scrollY);
  const finalReferenceRect = await referenceArtifact.boundingBox();
  expect(finalScrollY).toBe(initialScrollY);
  expect(finalReferenceRect).not.toBeNull();
  expect(finalReferenceRect!.y).toBeCloseTo(initialReferenceRect!.y, 1);
});

test("Cabinet detail panels can be pulled down to close", async ({ page }) => {
  await api(apiBaseURL, ownerToken, "/api/v1/sites", { theme: "cabinet" }, "PATCH");
  await page.goto(siteBaseURL + "/");

  const card = page.locator('a[data-cabinet-card][data-cabinet-type="music"]').first();
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  const initialScrollY = await page.evaluate(() => window.scrollY);
  const homeURL = page.url();
  await card.click();

  const dialog = page.locator('.cabinet-panel[role="dialog"]');
  const scroller = dialog.locator(".cabinet-panel-scroll");
  await expect(dialog).toBeVisible();
  await scroller.evaluate((element) => { element.scrollTop = 0; });
  const box = await scroller.boundingBox();
  expect(box).not.toBeNull();

  const startX = box!.x + box!.width * 0.72;
  const startY = box!.y + 120;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + 55, { steps: 3 });
  await page.waitForTimeout(180);
  await page.mouse.up();
  await expect(dialog).toBeAttached();
  await expect.poll(() => dialog.evaluate((element) => getComputedStyle(element).transform)).toBe("none");

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + 170, { steps: 6 });
  await expect.poll(() => dialog.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
  await page.mouse.up();

  await dialog.waitFor({ state: "detached" });
  await expect(page).toHaveURL(homeURL);
  await expect(card).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(initialScrollY);
});

test("Cabinet overlay honors reduced motion for the shared-photo path", async ({ page }) => {
  await api(apiBaseURL, ownerToken, "/api/v1/sites", { theme: "cabinet" }, "PATCH");
  await page.emulateMedia({ reducedMotion: "reduce" });

  // Record the Web Animations durations chosen by the runtime. This proves
  // the preference was observed without turning wall-clock timing into a
  // flaky assertion; the real animate() implementation still runs normally.
  await page.addInitScript(() => {
    const durations: number[] = [];
    (window as Window & { __cabinetAnimationDurations?: number[] }).__cabinetAnimationDurations = durations;
    const originalAnimate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      if (typeof options === "number") durations.push(options);
      else if (typeof options?.duration === "number") durations.push(options.duration);
      return originalAnimate.call(this, keyframes, options);
    };
  });

  await page.goto(siteBaseURL + "/");
  const photoCard = page.locator('a[data-cabinet-card][data-cabinet-type="photo"]').first();
  await expect(photoCard).toBeVisible();
  await photoCard.click();

  const dialog = page.locator('.cabinet-panel[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __cabinetAnimationDurations?: number[] }).__cabinetAnimationDurations ?? [],
      ),
    )
    .toContain(120);
  const openDurations = await page.evaluate(
    () => (window as Window & { __cabinetAnimationDurations?: number[] }).__cabinetAnimationDurations ?? [],
  );
  expect(openDurations).not.toContain(580);

  await page.locator(".cabinet-close").click();
  await dialog.waitFor({ state: "detached" });
  await expect(photoCard).toBeFocused();
});

test("Cabinet link artifacts keep the source and saved note as distinct routes", async ({ page }) => {
  await api(apiBaseURL, ownerToken, "/api/v1/sites", { theme: "cabinet" }, "PATCH");
  await page.goto(siteBaseURL + "/");

  const artifact = page.locator(".cabinet-item--link").first();
  const outbound = artifact.locator(".cabinet-outbound");
  const permalink = artifact.locator(".cabinet-link-permalink");

  await expect(outbound).toHaveAttribute("href", "https://example.com/cabinet-test");
  await expect(outbound).toHaveAttribute("target", "_blank");
  await expect(outbound).not.toHaveAttribute("data-cabinet-card", "");
  await expect(permalink).toHaveAttribute("href", /\/links\//);
  await expect(permalink).toContainText("Read more");

  await permalink.click();
  const dialog = page.locator('.cabinet-panel[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/links\//);
  await expect(dialog.locator("h1")).toContainText("A link worth keeping");

  await dialog.locator(".cabinet-close").click();
  await dialog.waitFor({ state: "detached" });
  await expect(permalink).toBeFocused();
});
