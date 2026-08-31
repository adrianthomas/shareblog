# Shareblog Server

The self-hosted Shareblog API and public-site renderer. It stores structured
thoughts, articles, photos, books, music, links, and quotes, then publishes them
on the owner's own site with optional ActivityPub federation.

Each site also has explicit title/tagline settings and a separate cross-theme
footer profile, can use an apex or custom canonical domain, and exposes paginated feeds, chronological archives,
search, social-card metadata, structured data, a sitemap, and robots policy.

## Local development

```bash
cd server
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

No external database is required. SQLite is created automatically at
`DATABASE_URL` (default: `./data/shareblog.db`) when migrations run.

Local development serves the API at `api.localhost:3000` and public sites at
`<subdomain>.localhost:3000`. Authentication codes and links are written to the
development console rather than sent by email.

For production installation, see [SELF_HOSTING.md](SELF_HOSTING.md). An
Uberspace-specific walkthrough is available in [UBERSPACE.md](UBERSPACE.md).

## Commands

Run these from `server/`:

```bash
npm run dev
npm run build
npm run db:generate
npm run db:migrate
npm run bootstrap-owner
npm run import:markdown -- --input /path/to/archive
npm run test:e2e
```

## Importing a Markdown archive

`import:markdown` recursively reads Markdown files with YAML frontmatter,
uploads every referenced local image through Shareblog's normal image
pipeline, and preserves historical dates and slugs. It is a dry-run unless
`--commit` is explicitly passed, is safe to rerun when the frontmatter has a
stable `id`, and publishes historical entries without ActivityPub delivery.
For WordPress imports, pass the original WXR/XML too so gallery attachment IDs
and exact legacy permalinks can be recovered.

```bash
cd server
npm run import:markdown -- \
  --input /path/to/markdown-export \
  --source wordpress:example.com \
  --source-base-url https://example.com \
  --wordpress-export /path/to/wordpress-export.xml

# After reviewing the report:
npm run import:markdown -- \
  --input /path/to/markdown-export \
  --source wordpress:example.com \
  --source-base-url https://example.com \
  --wordpress-export /path/to/wordpress-export.xml \
  --commit
```

WordPress `post` entries become Articles. WordPress pages are counted and
skipped for deliberate mapping to About, Project, or adjacent static pages.
See [WORDPRESS_IMPORT.md](WORDPRESS_IMPORT.md) for the export/conversion
workflow and current formatting limits.

## First-owner pairing

Running `npm run bootstrap-owner` interactively creates the owner if necessary
and prints a short-lived, single-use pairing QR code plus a manual-entry code.
The client redeems it through `POST /auth/claim-owner`. Subsequent email sign-in
is restricted by `ALLOWED_SIGNUP_EMAILS`, which is required in production.

## Federation

Each site is a followable Fediverse actor by default. Federation uses Fedify and
runs in the same Node process; no separate worker or queue is required.

## License

[MIT](LICENSE)
