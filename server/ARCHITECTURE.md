# Server architecture map

A fast-orientation reference for `server/`: route tables, schema tables, and
the checklist for cross-cutting changes (like adding a content type) that touch
many files at once. Keep it in sync with the implementation.

## Request lifecycle

`server.ts` calls `buildApp()` (`app.ts`), which registers, in order:

1. Global plugins: `@fastify/compress`, `@fastify/etag`, `@fastify/cors`,
   `@fastify/cookie`, `@fastify/multipart`, `@fastify/rate-limit` (200/min
   baseline; auth routes set their own tighter limits).
2. `/api/v1/*` — `authRoutes`, `siteRoutes`, `themeRoutes`,
   `objectRoutes`, `assetRoutes`, `resolveRoutes`.
3. `/files/*` (local storage driver only) and `/static/*` — plain
   filesystem serving with path-traversal guards.
4. `activityPubRoutes` — WebFinger/actor/inbox, resolved by Host header,
   same lookup as tenant resolution.
5. `sitePageRoutes` — the public site (registered **last**, catch-all for
   any host that isn't `api.<BASE_DOMAIN>`).

One process, split entirely by the `Host` header (`middleware/tenant.ts`):
`api.<BASE_DOMAIN>` → the JSON API; `<subdomain>.<BASE_DOMAIN>` or a site's
configured canonical `customDomain` → that site's public pages.
`siteForHost()` is the shared lookup (30s in-memory cache, keyed by hostname
and cleared on site update); `resolveTenant` wraps it as a route preHandler
and 404s unknown hosts. `authGuard` (`middleware/auth-guard.ts`) is the separate, unrelated
preHandler for `/api/v1` routes — it reads the `Authorization: Bearer`
token, not the Host header, and sets `request.authUser`/`request.authSite`.

## Route map

**`/api/v1` (auth: `authGuard`, bearer token unless noted)**

| File | Routes | Notes |
|---|---|---|
| `routes/auth.ts` | `POST /auth/request-code`, `POST /auth/verify-code`, `POST /auth/claim-owner`, `GET /auth/magic/:token`, `POST /auth/logout`, `GET /me` | Magic-code email auth (mobile gets a bearer token, web gets a session cookie), plus `claim-owner` — redeems a short-lived pairing code minted by an interactive `npm run bootstrap-owner` run (`db/bootstrap-owner.ts` + `auth/owner-claim.ts`), the QR/manual-code alternative to email for first sign-in (see the `ownerClaims` table below). Logout revokes *every* token for the account. |
| `routes/sites.ts` | site CRUD (create; update identity/domain/theme/about/federation) | One site per user today (`sites.ownerUserId` is `.unique()`). New identity fields are additive for older clients. |
| `routes/themes.ts` | `GET /themes` (no auth) | Server-owned catalog of selectable site themes (`id`/`name`/`description`) used by iOS Settings. Keep this additive so newer servers can expose themes without requiring an iOS app update. |
| `routes/objects.ts` | `POST/GET/PATCH/DELETE /objects`, `GET /objects/:id` | Owns slug generation (`uniqueSlug`, `slugSourceText`), asset-ownership checks and deletion (including URL-only inline Article/Thought images), cache invalidation, and triggers `deliverCreateActivity` on publish. It also normalizes legacy iOS article posts that arrived as `thought` with a leading Markdown H1 into real `article` rows. `GET /objects` hides `link` rows unless the client sends `X-Shareblog-Features: link-content-type`, because old iOS apps decode `ContentType` as a closed enum. |
| `routes/assets.ts` | asset upload | Feeds `image/worker.ts` for variants + EXIF extraction. |
| `routes/resolve.ts` | book/music/article metadata lookup | Thin wrapper over `resolvers/*.ts`; used by the iOS compose screens before publish, not stored server-side until the object is created. |

**Public site (auth: `resolveTenant`, Host header)** — `routes/site-pages.ts`

| Path | Renders |
|---|---|
| `/` | Home — all types mixed, paginated 20 at a time (`renderList`) |
| `/posts`, `/articles`, `/links`, `/books`, `/music`, `/photos`, `/quotes` | Per-type listings (`LISTING_TYPES`), paginated 20 at a time |
| `/<listing>/feed.xml`, `/feed.xml` | RSS (`renderFeed`) |
| `/<prefix>/:slug` (`DETAIL_TYPES`) | Detail page (`renderObjectPage`) — 404s if not published |
| `/archive`, `/archive/:year/:month` | Chronological month index and paginated month views |
| `/search?q=...` | Search titles, bodies, source URLs, and structured metadata; marked `noindex` |
| `/sitemap.xml`, `/robots.txt` | Search-engine discovery using the site's canonical origin |
| `/about`, `/about-shareblog`, `/changelog` | Static-ish pages; `/about` 404s if the site has no About text |

`PATH_PREFIX` (exported from `render.ts`) is the single source of truth
mapping a `ContentType` to its URL segment (`photo` → `/photos`) — reused by
`LISTING_TYPES`/`DETAIL_TYPES` here and by `renderDetail`'s close-button
`backHref`. Every page response goes through `sendCachedHtml`/
`sendCachedFeed`, which check `page-cache.ts` (in-memory, keyed by
`siteId` + full URL) before rendering, and `invalidateSitePages(siteId)` is
called on every object/site mutation.

## Database (`db/schema.ts`, SQLite via Drizzle)

| Table | Purpose |
|---|---|
| `users` | One row per email. |
| `sites` | One per user (today). Identity (`title`, `tagline`, `introduction`, `location`, `profileImageUrl`, `profileLinks`, contact CTA), `theme`, `about`, `federationEnabled`, and `subdomain`/canonical `customDomain`. |
| `siteActorKeys` | ActivityPub keypair, deliberately its own table (never returned in a site API response — see the comment in schema.ts). |
| `apFollowers` | Remote Fediverse followers per site; backs both the followers collection and outbound delivery recipient list. |
| `apiTokens` | Bearer tokens, hashed; `revokedAt` for logout. |
| `magicTokens` | Email auth codes/links, hashed, purpose-tagged (`web_session`/`mobile_code`). |
| `ownerClaims` | Short-lived (20 min), single-use pairing codes minted by an interactive `bootstrap-owner` run; redeemed via `POST /auth/claim-owner`. |
| `contentObjects` | The core table — `type` (`contentTypeValues`), `slug` (unique per site), `title`/`body`/`status`/`sourceUrl`, freeform JSON `metadata` (shape varies by type, not modeled in SQL). |
| `assets` | Uploaded files — `variants` (JSON, e.g. `medium`/`original` URLs), `exif` (JSON, photos only). Linked from a `contentObjects.metadata.assetId`/`coverAssetId` field, **not** a DB foreign key — `objects.ts`'s `referencedAssetIds`/`assertOwnedAssets` walk those metadata fields by hand. |

## Render pipeline

Server-side React only (`renderToStaticMarkup`), no client hydration, no
bundler for client JS — interactive themes use plain template-literal scripts
injected as inline `<script>` elements (`cardsScript` in `themes/cards.tsx`,
and the standalone `cabinetScript` in `themes/cabinet-script.ts`).

`render.ts` orchestrates: `renderCard`/`renderDetail` switch on
`ContentType` to the matching template in `render/templates/*.tsx`, every
page is wrapped via `wrap()` in `Layout.tsx`. Templates have three rendering
paths: classic-style markup (also used by Washi), the cards pipeline shared by
`cards`/`prism`/`ledger`, and Cabinet's explicit per-type feed/detail markup.
The cards-derived themes usually render `CardsFeedItem`/`CardsDetailHeader`
from `themes/cards.tsx`; link posts and covered article cards are the main
exceptions. Adding a field to a content type means updating every path that
should expose it. Washi is deliberately lighter: `renderList()` wraps list pages in
`.washi-feed` so it can render a responsive paper-card grid, while detail pages
reuse the classic markup. The rest of Washi lives in a gated `<style>` block in
`Layout.tsx`: shared color tokens, self-hosted display type
(`server/public/fonts/shippori-mincho-*`, same latin/latin-ext-only pattern as
the cards theme's Special Elite), textured backgrounds, sticky translucent
header, refined nav pills, paper cards, and media/quote treatments. Prism is a
proper cards-derived theme: it uses the cards animation/overlay script, tab
bar, detail headers, and feed link semantics, then restyles the `.cards-*`
surfaces in its own gated CSS block with rounded system typography,
high-contrast surfaces, and saturated blue/pink accents. Ledger is also
cards-derived, but presents the feed as a single-column professional index with
separators and compact type labels; its branch in `cardsScript` uses an
iOS-style right-to-left push detail panel instead of the expanding-card motion.

Cabinet is a standalone interactive pipeline rather than a Cards skin.
`themes/cabinet.tsx` owns its chronological rail, numbered navigation,
type-specific artifact and detail components, typography, and responsive
styles; every content template has an explicit `theme === "cabinet"` branch.
`themes/cabinet-script.ts` progressively enhances the ordinary same-origin
detail links into fetched in-place panels with shared-media/clip-path motion,
pull-down dismissal from the top of the detail scroller, history handling,
scroll locking, focus trapping/restoration, an inert underlying page, and
reading progress. Direct navigation and failed enhancement still use the
server-rendered detail URL; reduced-motion users receive a short opacity
transition instead of spatial motion.

`Layout.tsx` also owns the refinement baseline shared by every theme: the
system reading type scale, visible site title/tagline identity, 44pt-equivalent
header/filter targets, focus treatment, reduced-motion fallback, and the
`--fg`/`--muted`/`--border`/`--focus` color contract. Theme-specific CSS should
change the visual voice without shrinking those controls or replacing that
accessibility contract. Cards-derived themes may override the shape of a
control (Ledger's rounded-rectangle back/filter buttons, for example), but not
its usable hit area.

The cards pipeline has specialized media openers where the feed card and
detail page have genuinely different geometry: photos fly the photo into the
viewer, books fly a portrait cover into `CardsBookDetailHeader`, and music
flies square album art into `CardsMusicDetailHeader`. Keep square/portrait art
out of the generic cover-image hero path, which is meant for article-like
landscape imagery.

`render/site-url.ts` is the canonical-origin source of truth. A configured
`sites.customDomain` wins over `<subdomain>.<BASE_DOMAIN>` and threads through
HTML canonical/Open Graph metadata, JSON-LD, RSS, sitemaps, and ActivityPub.
`Layout.tsx` emits the shared Person/WebSite or BlogPosting structured data.
`AboutPage.tsx` renders the cross-theme identity profile alongside the longer
About copy. Product marketing routes remain available
for old links but are no longer linked from a person's About page and are
`noindex`.
Article `metadata.coverAssetId` is the card/detail header image, with
`metadata.coverAltText` as its alt text. Inline markdown images in the article
body are separate body images and render below the title/excerpt/date content.

Body formatting (`render/format.ts`) — three tiers, a deliberate per-field
choice, not a default:
- `formatBasicText` — paragraphs, `**bold**`, `*italic*`, `[text](url)`.
- `formatRichText` — the above plus `#` through `######` headings,
  `-`/`•` unordered lists, and `![alt](url)`.
- `stripBasicFormatting` — strips back to plain text (RSS `<title>`, a
  cards-theme feed tile).

Photo metadata deliberately separates visible `caption` from image `altText`;
renderers and RSS image markup use `altText` for the `<img alt>` value, not the
caption.

i18n (`render/i18n.ts`) — `MessageKey` union + `t(locale, key, params?)`;
`site.locale` threads through every render call. Add a string here, not as
a hardcoded literal in a template.

## Federation (`activitypub/`)

Built on Fedify. `adapter.ts` is a hand-rolled bridge (not the official
`@fedify/fastify` plugin — see its own comment for why) resolving the site
from the Host header, same as `resolveTenant`. `federation.ts` handles
WebFinger/actor/inbox dispatch and `deliverCreateActivity` — delivery is
**synchronous**, called inline from `objects.ts` on publish, no queue
worker. `keys.ts` manages the per-site keypair in `siteActorKeys`.
`sites.federationEnabled` (default on) only gates outbound delivery; the
actor/WebFinger/inbox stay live regardless, so existing follows never
silently break.

## Storage (`storage/`)

Driver abstraction behind `storage-adapter.ts`. `local` (filesystem, served
via the `/files/*` route in `app.ts`) is implemented; `s3` is a documented
placeholder, not implemented. Selected via `STORAGE_DRIVER` env var.

## Adding a new content type — checklist

1. `db/schema.ts` — add to `contentTypeValues`; run `npm run db:generate` +
   `db:migrate`.
2. `resolvers/` — only if it resolves from a shared URL (book/music/article
   pattern); skip for a type authored directly (thought/quote/photo-style).
3. `render/templates/<Type>.tsx` — card + detail variants, both theme
   branches.
4. `render.ts` — wire into `renderCard`/`renderDetail`'s switches, and
   `PATH_PREFIX`.
5. `routes/site-pages.ts` — add to `LISTING_TYPES` and `DETAIL_TYPES`.
6. `render/i18n.ts` — add a `MessageKey` for the listing title (plural) in
   every locale.
7. `routes/objects.ts` — add a backwards-compatibility gate before returning
   the new type from unfiltered list/detail responses. Older iOS apps decode
   content types as a closed enum, so returning an unknown `type` breaks the
   entire feed.
8. Coordinate the matching client changes; a new type needs changes on both
   sides together.

## Testing

No lint script. `npx tsc -p tsconfig.json --noEmit` (from `server/`) for
type safety, plus manual/browser verification for anything a type check
can't catch — still the primary way to check most changes.

One real automated suite exists: `tests/e2e/` (Playwright, WebKit —
matching the cards theme's real target browser, not Chromium), run via
`npm run test:e2e` (`playwright.config.ts` spins up its own throwaway
SQLite DB and dev server on port 3100, seeded through `bootstrap-owner.ts`
+ the live API — see the spec file for the pattern). Its primary coverage is
`themes/cards.tsx`'s scroll-lock/restore mechanism
around opening and closing a card (`lockPageScroll`/`unlockPageScroll`) —
a bug class subtle enough to have regressed silently once already — and it
also exercises uploaded-asset cleanup through the live API. It does
**not** catch every variant of that bug: the iOS Safari toolbar-reveal
case (see `unlockPageScroll`'s own comment) is driven by the browser's own
chrome animation, which a synthetic tap doesn't reliably provoke, so that
one still needs on-device verification. Add to this suite rather than
starting a second test setup if you're adding coverage elsewhere in
`server/`. If this section doesn't match what's actually in `tests/`,
that's a sign it's behind — update it rather than trusting it blindly.
