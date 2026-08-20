# Running Shareblog on Uberspace

Uberspace-specific walkthrough for [SELF_HOSTING.md](SELF_HOSTING.md): shared
hosting, no root/sudo, no systemd, no Docker. The database is a single
SQLite file in your account's own storage — nothing to provision. You also
get `supervisord` instead of systemd, and `uberspace web
domain`/`uberspace web backend` instead of your own reverse proxy —
Uberspace terminates TLS for you automatically via Let's Encrypt.

Every command below runs as your normal Uberspace user over SSH — nothing
needs `sudo`, and nothing here will work if you try to use it.

## 0. Prerequisites

- An Uberspace 7 account (SSH access is included from signup).
- A domain you control, OR just use the free `<username>.uber.space` domain
  Uberspace gives every account to get started — either way, every
  subdomain you use still has to be added individually (see the wildcard
  note at the end).

## 1. Get the code onto your account

```bash
ssh <username>@<host>.uberspace.de
git clone <your-fork-or-this-repo> shareblog
cd shareblog/server
```

## 2. Pick a Node.js version and install

```bash
uberspace tools version list node
uberspace tools version use node 22
```

Uberspace 7 tops out at Node 22 (its GCC is too old to build anything
newer) — that's exactly what Shareblog targets, so nothing to reconcile.

```bash
npm install
npm run build
```

`sharp` (image processing) has native bindings but ships prebuilt Linux x64
binaries, so this should just work with a plain `npm install` — as with any
host, always run it on the box itself, never copy over a `node_modules`
built elsewhere.

## 3. Configure the environment

```bash
cp .env.example .env
```

Fill in:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=/home/<username>/shareblog/server/data/shareblog.db
BASE_DOMAIN=yourdomain.com
API_BASE_URL=https://api.yourdomain.com
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=/home/<username>/shareblog/server/data/uploads
SMTP_HOST=<host>.uberspace.de
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=<mailbox password from the mailbox you create below>
SMTP_FROM=Shareblog <noreply@yourdomain.com>
```

`PORT` just needs to be free and in Uberspace's allowed range (1024–65535);
the webserver in front of it is what's actually reachable from the
internet. `SMTP_HOST` is your account's own Uberspace host name (e.g.
`stardust.uberspace.de`, shown by `hostname` over SSH) — not `localhost`,
or TLS cert validation fails.

Uberspace's SMTP needs a real mailbox to authenticate as; create one before
starting the server (`NODE_ENV=production` refuses to boot without working
SMTP config, since auth codes are only emailed, never console-logged):

```bash
uberspace mail user add noreply
```

That prompts for a password — use it as `SMTP_PASS`, and use the resulting
address (`noreply@yourdomain.com` once that domain is added via
`uberspace mail domain add yourdomain.com`, or just
`noreply@<username>.uber.space` if you'd rather skip that step) as both
`SMTP_USER` and the address in `SMTP_FROM`.

`DATABASE_URL` is just a path in your account's own storage — SQLite
creates the file automatically on first migration, no role/database to
provision. Keeping it under `data/` next to `LOCAL_STORAGE_DIR` means a
full backup is just `supervisorctl stop shareblog && cp -r data/ backup/`.

## 4. Run migrations

```bash
npm run db:migrate
```

## 5. Keep the server running — supervisord, not systemd

Uberspace has no systemd or sudo; long-running processes are supervised by
`supervisord` instead, via one `.ini` file per service in
`~/etc/services.d/`. Shareblog already loads `.env` itself on boot (see
`import "dotenv/config"` in `server.ts`), so the service file doesn't need
to pass environment variables through — it just needs the right working
directory.

Find the node binary Uberspace set up in step 2 first:

```bash
which node
```

Then create `~/etc/services.d/shareblog.ini`:

```ini
[program:shareblog]
command=/home/<username>/bin/node dist/server.js
directory=/home/<username>/shareblog/server
autostart=true
autorestart=true
startsecs=5
stdout_logfile=/home/<username>/logs/shareblog.log
stderr_logfile=/home/<username>/logs/shareblog-error.log
```

(swap the `command=` path for whatever `which node` actually printed if
it differs)

```bash
supervisorctl reread
supervisorctl update
supervisorctl status shareblog
```

## 6. Domains and routing

One Shareblog process serves everything, split by the `Host` header (see
[tenant.ts](server/src/middleware/tenant.ts)): the apex/API host, plus one
hostname per site you create. Each one needs both a domain added and a
backend pointed at the app's port:

```bash
uberspace web domain add yourdomain.com
uberspace web domain add api.yourdomain.com
uberspace web backend set yourdomain.com --http --port 3000
uberspace web backend set api.yourdomain.com --http --port 3000
```

`uberspace web domain add` prints the exact DNS records (A/AAAA) to create
at your registrar for that hostname — use whatever it prints rather than a
copied value, since it's specific to the cluster your account lives on.
Uberspace requests the Let's Encrypt cert automatically once the DNS record
resolves; no Caddy/certbot config to write yourself.

Repeat both commands for every site subdomain you create afterwards:

```bash
uberspace web domain add myfirstsite.yourdomain.com
uberspace web backend set myfirstsite.yourdomain.com --http --port 3000
```

## 7. Point the iOS app at your server

Same as any other host — see step 6 in [SELF_HOSTING.md](SELF_HOSTING.md).
Open the app, enter `yourdomain.com` (no scheme needed) on the first
screen, and it assumes the `api.<domain>` convention set up above.

## Updating

```bash
git pull
npm install
npm run build
npm run db:migrate
supervisorctl restart shareblog
```

## No wildcard subdomains

Uberspace's automatic domain/cert tooling only does HTTP-01 validation, so
there's no way to get a wildcard cert here — every site subdomain has to be
added by hand with `uberspace web domain add` + a matching DNS record +
`uberspace web backend set`, each time you create a site. See the note at
the end of [SELF_HOSTING.md](SELF_HOSTING.md) for the DNS-01/wildcard
alternative available on hosts where you control the reverse proxy
directly.
