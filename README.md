# Shareblog Server

The self-hosted Shareblog API and public-site renderer. It stores structured
thoughts, articles, photos, books, music, links, and quotes, then publishes them
on the owner's own site with optional ActivityPub federation.

Each site also has a small cross-theme identity profile, can use an apex or
custom canonical domain, and exposes paginated feeds, chronological archives,
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
npm run test:e2e
```

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
