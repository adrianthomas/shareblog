# Self-hosting Shareblog

Shareblog runs as a single Node process (Fastify) backed by a SQLite file —
no separate database server to install or manage. There's no hosted
service, and none is planned — self-hosting on your own domain is the only
way to run it, by design. This doc covers a generic Linux server; adapt
the reverse-proxy/process-manager steps if your host does things differently
(e.g. Uberspace uses `supervisord` instead of `systemd`, and doesn't support
wildcard domains — see the note at the end). On Uberspace specifically, skip
straight to [UBERSPACE.md](UBERSPACE.md) for a full walkthrough using its
actual commands instead of adapting these on the fly.

## What you need

- A Linux server (VPS or similar) you can SSH into and run long-lived
  processes on.
- A domain you control, with the ability to add DNS records.
- Node.js 22+.
- A reverse proxy that can terminate TLS. These steps use
  [Caddy](https://caddyserver.com) because it gets you automatic Let's
  Encrypt certs with almost no config; nginx + certbot works too if you
  already run that.

## How routing works

One server process serves everything, split by the `Host` header:

- `api.yourdomain.com` — the API the iOS app talks to.
- `<subdomain>.yourdomain.com` — each site's public pages (one subdomain per
  site; see [tenant.ts](server/src/middleware/tenant.ts)).

So you'll point at least two hostnames at the same backend port: the apex/API
host, and one subdomain per site you create. There's no wildcard support
built in — see the note at the end for how to get one anyway if you want
sites to appear without touching the server each time.

## 1. Get the code onto the server

```bash
git clone <your-fork-or-this-repo> shareblog
cd shareblog/server
npm install
npm run build
```

`sharp` (image processing) has native bindings — always run `npm install` on
the target machine itself, never copy a `node_modules` built elsewhere.

## 2. Configure the environment

Copy `.env.example` to `.env` and fill in production values:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=/home/youruser/shareblog/server/data/shareblog.db
BASE_DOMAIN=yourdomain.com
API_BASE_URL=https://api.yourdomain.com
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=/home/youruser/shareblog/server/data/uploads
SMTP_HOST=<your SMTP host>
SMTP_PORT=587
SMTP_USER=<smtp username>
SMTP_PASS=<smtp password>
SMTP_FROM=Shareblog <noreply@yourdomain.com>
ALLOWED_SIGNUP_EMAILS=you@yourdomain.com
```

`PORT` just needs to be free on the box — the reverse proxy is what's
actually reachable from the internet, not this port directly. Auth codes are
emailed via `SMTP_*`; without a host configured there, `NODE_ENV=production`
will fail to send them (dev-only console logging is disabled once
`NODE_ENV=production`), so don't skip this — see
[server/src/auth/email.ts](server/src/auth/email.ts).

**`ALLOWED_SIGNUP_EMAILS` is required in production** — the server refuses
to boot without it (`server.ts`), since without it anyone who finds your API
could request a code, verify it, and create their own account and site on
your box. Set it to a comma-separated list of the email(s) that should be
able to sign in at all (everyone else's request still returns success, so it
can't be used to probe which addresses are allowlisted — see
[server/src/auth/magic-code.ts](server/src/auth/magic-code.ts)).

`DATABASE_URL` is just a file path — SQLite creates it automatically on
first migration, no server to provision. It's worth pointing it at the same
`data/` directory as `LOCAL_STORAGE_DIR`: a full backup is then just
`systemctl stop shareblog && cp -r data/ backup/`.

## 3. Run migrations

```bash
npm run db:migrate
```

## 4. Create the owner account

```bash
npm run bootstrap-owner
```

Mints the single owner account directly in the database over this same SSH
session — no working mailbox needed just to get signed in the first time.
Run interactively like this, it also prints a QR code (plus a manual-entry
fallback code) that the iOS app's **Scan to Connect** button reads directly:
one scan sets the server address and signs in, no email step at all. The
code expires in 20 minutes and is single-use; just re-run this command
whenever you want to pair another device — it always mints a fresh one on
an interactive run. (Run non-interactively — e.g. by `deploy.sh`, which
calls this on every deploy — it skips the code/QR and only handles the
idempotent "create the owner if none exists yet" part, so automated deploys
don't spam unused codes.)

If you'd rather not scan, day-to-day sign-in can still go through the email
code flow instead, which is why step 2's `ALLOWED_SIGNUP_EMAILS` matters:
set it to the same address you bootstrap with.

## 5. Keep the server running

A basic systemd unit at `/etc/systemd/system/shareblog.service`:

```ini
[Unit]
Description=Shareblog server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser/shareblog/server
ExecStart=/usr/bin/node dist/server.js
Restart=always
EnvironmentFile=/home/youruser/shareblog/server/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now shareblog
sudo systemctl status shareblog
```

## 6. Reverse proxy + TLS

DNS: point `yourdomain.com`, `api.yourdomain.com`, and each site subdomain
you create at your server's IP (A/AAAA records).

A `Caddyfile` proxying the apex, the API host, and one example site
subdomain to the app:

```
yourdomain.com, api.yourdomain.com, myfirstsite.yourdomain.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

Add a new line (or extend the host list) for every additional site you
create — Caddy requests a cert for each hostname automatically.

### Use the apex or another custom domain for your site

The iOS app's **Settings → Identity & Domain** screen can make a hostname such
as `yourdomain.com` the site's canonical public address. The server then uses
that Host header for permalinks, feeds, social metadata, sitemaps, and
ActivityPub identity. This setting does not change DNS or obtain a certificate
by itself: include the hostname in the reverse-proxy configuration above,
point its DNS at the server, and reload Caddy first. Keep
`api.yourdomain.com` routed to the same process for the app.

Changing the canonical domain after Fediverse followers already exist changes
the actor's public host. Choose the permanent domain before actively promoting
the Fediverse handle whenever possible.

## 7. Point the iOS app at your server

Easiest path: tap **Scan to Connect** on the app's first screen and scan
the QR code step 4 printed (or re-run `npm run bootstrap-owner` if it's
already expired) — sets the server address and signs you in together.

Otherwise, open the app — the first screen asks for your server's domain
(`yourdomain.com`, no `https://` needed). It assumes the `api.<domain>`
convention above. Sign-in codes will arrive by email via the SMTP settings
from step 2, for whichever address(es) you put in `ALLOWED_SIGNUP_EMAILS`.

To point at a different server later, or to test against a local dev server
from a physical device (e.g. `http://192.168.1.5:3000`), use **Settings →
Change server** — that field accepts a full `http(s)://` URL too, used
as-is instead of assuming `api.<domain>`.

## Updating

```bash
git pull
npm install
npm run build
npm run db:migrate
npm run bootstrap-owner
sudo systemctl restart shareblog
```

(`bootstrap-owner` is a no-op once an owner exists — harmless to run on
every update, same as `deploy.sh` does.)

## A note on wildcard subdomains

Wanting sites to go live without an ops step per site means wanting a
wildcard cert (`*.yourdomain.com`) instead of adding each subdomain to the
proxy config by hand. That needs DNS-01 validation (proving you control the
domain via a DNS TXT record) rather than the HTTP-01 validation shown above.
Caddy and certbot both support this via a plugin for your DNS provider (e.g.
`caddy-dns/cloudflare`) — worth setting up if you expect to create sites
often. **This is not available on Uberspace**: its automatic domain/cert
tooling only does HTTP-01, so on Uberspace every subdomain has to be added
individually with `uberspace web domain add` + a matching DNS record + a
`uberspace web backend set`, run again for each new site.
