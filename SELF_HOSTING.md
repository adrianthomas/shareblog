# Self-hosting Shareblog

Shareblog runs as a single Node process (Fastify) backed by Postgres. There's
no hosted service yet — self-hosting on your own domain is the only way to
run it in production today. This doc covers a generic Linux server; adapt
the reverse-proxy/process-manager steps if your host does things differently
(e.g. Uberspace uses `supervisord` instead of `systemd`, and doesn't support
wildcard domains — see the note at the end). On Uberspace specifically, skip
straight to [UBERSPACE.md](UBERSPACE.md) for a full walkthrough using its
actual commands instead of adapting these on the fly.

## What you need

- A Linux server (VPS or similar) you can SSH into and run long-lived
  processes on.
- A domain you control, with the ability to add DNS records.
- Node.js 22+ and PostgreSQL 14+.
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

## 2. Set up Postgres

```bash
sudo -u postgres createuser shareblog -P
sudo -u postgres createdb --encoding=UTF8 --owner=shareblog --template=template0 shareblog
```

## 3. Configure the environment

Copy `.env.example` to `.env` and fill in production values:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://shareblog:<password>@localhost:5432/shareblog
BASE_DOMAIN=yourdomain.com
API_BASE_URL=https://api.yourdomain.com
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=/home/youruser/shareblog/server/data/uploads
SMTP_HOST=<your SMTP host>
SMTP_PORT=587
SMTP_USER=<smtp username>
SMTP_PASS=<smtp password>
SMTP_FROM=Shareblog <noreply@yourdomain.com>
```

`PORT` just needs to be free on the box — the reverse proxy is what's
actually reachable from the internet, not this port directly. Auth codes are
emailed via `SMTP_*`; without a host configured there, `NODE_ENV=production`
will fail to send them (dev-only console logging is disabled once
`NODE_ENV=production`), so don't skip this — see
[server/src/auth/email.ts](server/src/auth/email.ts).

## 4. Run migrations

```bash
npm run db:migrate
```

## 5. Keep the server running

A basic systemd unit at `/etc/systemd/system/shareblog.service`:

```ini
[Unit]
Description=Shareblog server
After=network.target postgresql.service

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

## 7. Point the iOS app at your server

Open the app — the first screen asks for your server's domain
(`yourdomain.com`, no `https://` needed). It assumes the `api.<domain>`
convention above. Sign-in codes will arrive by email via the SMTP settings
from step 3.

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
sudo systemctl restart shareblog
```

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
