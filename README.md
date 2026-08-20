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
- `Shareblog` — main app (onboarding, feed, settings).
- `ShareblogShareExtension` — the share-sheet flow (type picker → per-type compose screen → publish).

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

**Not yet verified in a running Simulator**: this machine's CoreSimulator
framework is out of date relative to the installed Xcode build, which
currently blocks booting a simulator. Both targets do build cleanly for the
iOS Simulator SDK (`xcodebuild ... -destination 'generic/platform=iOS
Simulator'`), so the code compiles — running the actual share-sheet flow
end-to-end still needs a real device or a working simulator, which needs a
macOS software update.
