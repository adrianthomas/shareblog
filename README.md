# Shareblog

Share sheet → structured content → published on your own site. See
[product-spec.md](product-spec.md) for the product thinking behind this.

## Server

```bash
cd server
npm install
cp .env.example .env   # already done for local dev; edit DATABASE_URL if needed
npm run db:migrate
npm run dev
```

No external database to install — SQLite is created automatically at
`DATABASE_URL` (defaults to `./data/shareblog.db`) on first migration.
Auth codes/links are logged to the console in dev, not emailed.

Local dev hits the server as `api.localhost:3000` (API) and
`<subdomain>.localhost:3000` (public sites) — both resolve automatically, no
`/etc/hosts` changes needed.

To run this in production on your own server, see
[SELF_HOSTING.md](SELF_HOSTING.md).

Note: the original music resolver used Odesli/Songlink to turn one link into
every platform's link at once — that service has been sunset (confirmed).
`server/src/resolvers/music.ts` now resolves metadata per-platform instead,
straight from Apple Music (iTunes Lookup API), Spotify (oEmbed), and YouTube
Music (oEmbed via the youtube.com host), with an OpenGraph-scrape fallback
for anything else. All three have been verified live. The trade-off: no more
automatic "also available on X/Y/Z" links — just the one platform actually
shared. Spotify's oEmbed also doesn't return an artist name (Spotify
limitation, not ours), so that field comes back empty for Spotify links.

## iOS

```bash
cd ios
xcodegen generate   # regenerate Shareblog.xcodeproj after editing project.yml
open Shareblog.xcodeproj
```

Three pieces:
- `ShareblogKit` — local Swift package, shared models/API client/Keychain wrapper.
- `Shareblog` — main app (onboarding, feed, settings, editing/deleting existing objects, theme selection).
- `ShareblogShareExtension` — the share-sheet flow (type picker → per-type compose screen → save draft or publish).

Both app targets need the same Apple Developer Team selected in Xcode (Signing &
Capabilities) for the App Group (`group.com.adrianthomas.shareblog`) and Keychain
sharing to work — this can't be set from the command line. Bundle IDs
(`com.adrianthomas.shareblog` / `.ShareExtension`) and the app group in
`project.yml` and `ShareblogKit/Sources/ShareblogKit/AppGroup.swift` are
placeholders; change both together if you use a different identifier.

On first launch the app asks for a server domain and stores it in the shared
App Group (`ShareblogKit/Sources/ShareblogKit/ServerConfig.swift`); it's
changeable later from Settings. For local dev against the server above, use
your Mac's LAN IP (e.g. `http://192.168.1.5:3000`, not `api.localhost:3000`
— that only resolves on the Mac itself, not from the Simulator/device) —
that field accepts a full `http(s)://` URL for exactly this case. For a real
deployment, see [SELF_HOSTING.md](SELF_HOSTING.md).

Both targets build and run in the iOS Simulator (verified on iOS 17 and iOS
26 runtimes) as well as on a real device. Apple Notes and a few other system
apps aren't present on Simulator runtimes at all, so exercising the share
extension against *those* specific source apps still needs a real device —
everything else (onboarding, feed, compose screens, Settings) works fine in
the Simulator.

## Auth

New self-hosted instances have no email/SMTP requirement to get signed in
the first time. Running `npm run bootstrap-owner` interactively (over SSH —
it's also wired into `deploy.sh`, which runs it non-interactively on every
deploy) mints the single owner account directly in the database and prints
a QR code, plus a manual-entry fallback code, that the iOS app's "Scan to
Connect" (`ServerSetupView`/`ScanToConnectView`) exchanges for a real
session via `POST /auth/claim-owner` — one scan sets the server address
*and* signs in, no email involved. The code is short-lived (20 minutes) and
single-use; re-run the command any time to pair another device. Owner
creation itself is idempotent (no-op once an owner exists) — see the TODO
on `sites.ownerUserId` in `server/src/db/schema.ts` — but a fresh pairing
code is minted on every interactive run.

Day-to-day sign-in (for anyone not using that flow) goes through the email
code flow in `server/src/auth/magic-code.ts`, which `ALLOWED_SIGNUP_EMAILS`
locks down to specific addresses — **required** in production, the server
refuses to boot without it (`server.ts`) — see the "Configure the
environment" step in [SELF_HOSTING.md](SELF_HOSTING.md). Local dev leaves it
unset, since anyone who can create an account on your own machine already
has full access to it anyway.

## Federation

Every site is a followable Fediverse actor by default (Mastodon and other
ActivityPub-speaking apps can follow `@<subdomain>@<domain>` and see posts as
they're published) — see `server/src/activitypub/`, built on
[Fedify](https://fedify.dev). It's a per-site toggle in the iOS app's
Settings screen, on by default; turning it off stops new deliveries but
leaves the actor/inbox/outbox endpoints live so existing followers never see
a dead account. No extra setup or environment variables needed — it rides
on `BASE_DOMAIN` like everything else.

## License

[MIT](LICENSE)
