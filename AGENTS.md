# Shareblog agent guide

This repository is the public, self-hosted Shareblog server and public-site
renderer. The application lives in `server/`; repository-root files cover
deployment, importing, and project-wide guidance.

## Start here

Before changing code:

1. Read this file and `server/ARCHITECTURE.md`.
2. Check `git status --short` and preserve unrelated or unfinished user work.
3. Read the implementation and tests for the area you are changing; the code
   is the source of truth when documentation and implementation disagree.
4. Consult the focused docs when relevant:
   - `README.md` — product overview and common commands.
   - `SELF_HOSTING.md` / `UBERSPACE.md` — production operation and deploys.
   - `WORDPRESS_IMPORT.md` — Markdown and WordPress archive imports.
   - `POTENTIAL_ROADMAP.md` — exploratory ideas only, not committed work.

Do not treat exploratory roadmap items as approved requirements. Do not put
secrets or machine-specific values from `deploy.env` or `server/.env` into
tracked files or command output.

## Repository map

- `server/src/app.ts` — Fastify construction and registration order.
- `server/src/routes/` — authenticated API and public-site routes.
- `server/src/db/schema.ts` and `server/src/db/migrations/` — Drizzle schema
  and ordered SQLite migrations.
- `server/src/render/` — server-rendered React, metadata, feeds, themes, and
  the in-memory page cache. There is no client bundler or hydration layer.
- `server/src/activitypub/` — Fedify adapter, actors, followers, and delivery.
- `server/src/storage/` and `server/src/image/` — asset persistence and image
  variants. Local storage works; the S3 driver remains a placeholder.
- `server/src/import/` — dry-run-by-default archive importer.
- `server/tests/*.test.ts` — Node unit tests.
- `server/tests/e2e/` — Playwright WebKit tests with an isolated database.
- `deploy.sh` — Uberspace deployment from a clean, already-pushed checkout.

## Local workflow

Run application commands from `server/`:

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Useful validation commands:

```bash
npm test
npm run build
npm run test:e2e
```

There is no lint script. `npm run build` is the canonical TypeScript check.
Use the smallest relevant validation while iterating, then run both unit tests
and the build for ordinary server changes. Run Playwright for public rendering,
interactive theme, asset-lifecycle, or route behavior changes. Playwright uses
WebKit and its own throwaway SQLite database and upload directory; do not point
tests at development or production data. Visual and iOS Safari behavior can
still require manual browser/device verification.

When the schema changes, update `server/src/db/schema.ts`, generate a migration
with `npm run db:generate`, inspect the generated SQL, and exercise it with
`npm run db:migrate`. Never rewrite an already-shipped migration.

## Contracts to preserve

- One process is split by `Host`: `api.<BASE_DOMAIN>` serves `/api/v1`, while
  tenant subdomains or a configured canonical custom domain serve public pages.
  Keep public catch-all routes last.
- API errors use `{ "error": { "code": string, "message": string } }`.
- Older iOS clients decode content types as a closed enum. New types require an
  additive feature gate before they can appear in unfiltered API responses;
  follow the checklist in `server/ARCHITECTURE.md`.
- New site settings and API response fields must be additive where possible so
  older installed clients keep working.
- `render/site-url.ts` is the canonical-origin source for HTML metadata, feeds,
  sitemaps, and ActivityPub. Do not reconstruct public origins ad hoc.
- `render/render.ts` owns `PATH_PREFIX`; reuse it for content URLs.
- Object and site mutations must invalidate the public page cache.
- Uploaded asset references live in JSON metadata, not database foreign keys.
  Keep ownership checks and cleanup in sync when adding metadata fields that
  reference assets.
- Rendering must not introduce third-party runtime dependencies. Bundled fonts
  and generated assets are served locally; visitor-locale retailer selection is
  a client-only enhancement because public HTML is shared-cacheable.
- ActivityPub publishing is synchronous and imported historical content must
  not be re-federated. `federationEnabled` gates outbound delivery, not the
  actor, WebFinger, or inbox endpoints.
- Production must have `ALLOWED_SIGNUP_EMAILS`; never weaken that boot-time
  requirement. Treat URL fetching and imports as SSRF-sensitive code.

## Public rendering and feature flags

All six themes (`classic`, `cards`, `washi`, `prism`, `ledger`, `cabinet`)
share the templates and accessibility baseline described in
`server/ARCHITECTURE.md`. A rendering change is not complete until the relevant
classic, cards-derived, and Cabinet paths have been considered. Keep hit areas,
keyboard focus, reduced motion, semantic links, dark mode, and responsive layout
intact.

`ENABLE_WORK_PAGE=true` exposes `/my-work` and `/contact`.
`ENABLE_IMPRESSUM_PAGE=true` exposes `/impressum`. These are server-level,
deployment-wide flags; disabled routes return 404 and are omitted from the
footer and sitemap. `/about` is always routable but may have no long-form body.

## Companion iOS repository

The private companion iOS app and share extension are in the local checkout:

`/Users/adrian/Library/Mobile Documents/com~apple~CloudDocs/Projects/shareblog-ios`

If work changes the app/server API contract, pairing or authentication, site
settings, content metadata, feature negotiation, or requires an iOS editor,
inspect that repository's `AGENTS.md`, `product-spec.md`, and
`ios/ARCHITECTURE.md` before implementing. Coordinate both repositories and
preserve compatibility with already-installed clients where possible. Merely
changing the public renderer does not require an iOS change.

## Keep the handoff current

Update `server/ARCHITECTURE.md` in the same change when routes, tables, render
pipelines, themes, storage, federation, or test strategy change. Update the
operator docs when commands, environment variables, prerequisites, migrations,
or deployment behavior change. Record speculative product ideas in
`POTENTIAL_ROADMAP.md`, clearly separated from implemented behavior.
