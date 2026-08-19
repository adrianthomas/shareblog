# Shareblog — Product Spec (Draft v0.2)

*A personal publishing system, driven by the iOS Share Sheet, for everything you want on the public web — articles, thoughts, photos, recommendations, and projects — built as a Fediverse-native engine.*

Status: early concept, synthesized from a working conversation. Sections marked **[OPEN]** are flagged as unresolved and need follow-up.

---

## 1. One-line pitch

Anything you can share from your phone can become a polished post on your own website. Capture via the share sheet → it's enriched with structured metadata and rendered beautifully at your own domain → and it's simultaneously distributed to the social web, so people can follow and interact with your site without visiting it.

## 2. Product thesis

The interesting product is **not** "a nicer blogging platform" — that market is extremely crowded (WordPress, Ghost, Bear, Pika, Scribbles, Feather, Micro.blog). What's actually different here is:

> A personal publishing system for everything you want to put on the public web — articles, thoughts, photos, things you recommend, projects and work — where publishing feels more like sending a message than operating a CMS.

The core reframe: **the primitive is "the thing I'm publishing," not "a blog post."** Book, music, product, and project recommendations are first-class structured object types with their own metadata, not blog posts with tags bolted on.

The core interaction model:

> Share → enrich → publish to your domain → optionally syndicate.

You should almost never need to open a CMS. The thing you're looking at — an album in Apple Music, a book, a product, a GitHub repo, a photo — is already the starting point.

**Positioning:** *Your place on the internet. Articles, photos, recommendations, projects and short posts — published in seconds, on your own domain.* Internally: *the personal CMS for people who don't want a CMS.*

**Dogfooding constraint:** if publishing something takes enough effort that the answer becomes "I'll do that later," the product has failed.

## 3. Competitive landscape

| Product | Publishing friction | Short posts/social | Photos | Structured recommendations | Work/projects | Theming | Your-domain-first |
|---|---|---|---|---|---|---|---|
| WordPress | 😬 | plugins | ✅ | plugins | ✅ | ✅✅✅ | ✅ |
| Ghost | 🙂 | weak | ✅ | ❌ | pages | ✅✅ | ✅ |
| Bear | 😀 | basic | basic | ❌ | basic | limited | ✅ |
| Pika | 😀 | basic | ✅ | ❌ | basic | some | ✅ |
| Scribbles | 😀 | notes/posts | ✅ | ❌ | basic | some | ✅ |
| Feather/Notion | 😀 | weak | ✅ | ❌ | possible | some | ✅ |
| Micro.blog | 😀 | ✅✅ | ✅✅ | books only-ish | possible | ✅✅ | ✅✅ |
| **Shareblog** | 😀😀 | ✅✅ | ✅✅ | ✅✅✅ | ✅✅ | ✅✅ | ✅✅ |

Notes on the field:
- **Bear** — the purest "make blogging tiny and fast" product: minuscule sites, custom domains/themes, no trackers/scripts. Still fundamentally a blog.
- **Pika / Scribbles** — attack the authoring experience well (Pika: forgiving simple web editor; Scribbles: custom domains, clean image handling, private/ephemeral posts). Still blog-shaped underneath.
- **Feather** — doesn't build an editor at all; Notion *is* the CMS, publishing = moving a page to "Published." Strong validation that CMS authoring, not rendering, is the real problem.
- **Ghost** — the mature publication/business alternative (memberships, newsletters, strong themes). Still conceptually a publication, not "my corner of the internet containing lots of different kinds of stuff."
- **Micro.blog** — the closest existing product, and the one to take seriously. Own-domain blogging for short posts/essays/photos/newsletters, explicit IndieWeb POSSE model (publish on your own site, syndicate elsewhere), mobile apps, custom themes, cross-posts to Mastodon/Bluesky, first-class photos (`/photos`, photo collections), and **already has structured bookshelves** — book lookup, reading state, ISBN/cover/author metadata, generated reading pages, exposed to themes/API. If the pitch were "Micro.blog, but nicer," it wouldn't be worth building.

### The gap even Micro.blog has

Micro.blog's data model is still blog-shaped. You can bend it into article/note/book/photo/page, but a highly designed `/work`, `/projects`, `/uses`, `/music`, `/books`, `/recommendations` pushes users into Hugo templates, custom plugins, and shortcodes — even for straightforward custom collection pages. Music recommendations are possible but via user-authored shortcodes, not a first-class music object. That's precisely where this product diverges: make music, products, and projects first-class object types with their own metadata schema and rendering, not blog-post variants.

### Adjacent but not competing
- **ShopMy** and similar creator-commerce tools turn product recommendations into storefronts — commerce-first, influencer-oriented, not a general personal website.
- **Micropub** (the IndieWeb publishing protocol) already anticipates richer content types — bookmarks, favourites, events, RSVPs, check-ins — rather than treating everything as an article. This product can be read as a modern, opinionated productization of that idea rather than another Markdown CMS.

## 4. Content types & capture UX

Opening the app / share sheet surfaces:

> **What do you want to add?**
> Thought · Article · Photo · Book · Music · Product · Project · Work

Each type resolves structured metadata automatically from minimal input.

**Book** — paste a title or share a link:
```
The Ministry for the Future
Kim Stanley Robinson
[cover]
Your rating: ★★★★☆
Your take: Some text…
Available from: Local/indie · Bookshop · Thalia · Apple Books · Amazon
```
Produces a permanent `/books/...` object, optionally also a dated post in the stream.

**Music** — paste an Apple Music (or other) URL:
```
Rolling In — Sam Evian
[artwork]
Listen: Apple Music · Spotify · Bandcamp · YouTube Music
```
Cross-service resolution is feasible today via universal music-link systems (e.g. Odesli/Songlink), which already resolve one release across platforms.

**Product** — paste a product URL:
```
[image]
Manufacturer, model, description
I've owned this for two years. Excellent apart from…
```
Becomes a proper recommendation object, not an undifferentiated blog post.

**Project** — add directly:
```
My ridiculous garage-door widget
Status: Released
Description · Screenshots · GitHub · Download · Demo
```
`/projects` becomes an automatically generated portfolio.

**Also:** Thought (short post), Article (long-form), Photo, Work — **[OPEN: exact field schema for each type needs defining.]**

### The killer demo

1. On an iPhone, share an album from Apple Music.
2. Choose the site.
3. It instantly recognizes the release.
4. Type "Best thing I've heard this month."
5. Publish.
6. The website now has an attractive recommendation card with Apple Music, Spotify, Bandcamp, etc.
7. It appears under `/music`.
8. It appears chronologically in `/posts`.
9. The short recommendation appears on Bluesky/Mastodon.
10. Ten seconds elapsed.

Repeat for a book, a camera, a photo, a GitHub project. That's the product, demonstrated rather than described.

## 5. Product principles

1. **Capture must be effortless.** The share sheet is the primary authoring surface. Sharing a link, photo, or thought from any app should be enough to publish.
2. **Reject the CMS interaction model.** Not: `Log in → Dashboard → Posts → Add New → blocks → featured image → category → permalink → publish`. Instead: `Add → Book → search → one sentence → publish`, or `Share photo → site → caption → publish`, or `Paste URL → Recommendation → "I love this because…" → publish`. Your website should be an *output*, not an application you operate.
3. **Your site is the canonical source.** Distribution to the social web sits on top of a real, ownable, self-hostable website — never the other way around.
4. **The hosted service is convenience, not captivity.** Nothing about the product should make a person's site stop working, look worse, or lose functionality because they stopped paying. Paying buys infrastructure and convenience, not features.
5. **Self-host and hosted produce an identical site.** No crippled "community edition." Same engine, same output, different ops burden.
6. **Identity is portable.** A user's domain is their identity, on the web and on the Fediverse. Moving between self-host and hosted (either direction) must not change public URLs or the Fediverse handle.
7. **Import, don't embed.** The domain is the source of truth. Existing Bluesky/Mastodon history can be imported, but going forward, posts flow *out* from the domain (`Note → yoursite.com → Bluesky + Mastodon`), not the reverse. A personal site that's mostly embedded widgets from other companies' platforms has failed at this.

## 6. Architecture: publishing and presentation are radically separate

Content is a collection of structured objects — `Article`, `Note`, `Photo`, `Recommendation<Book>`, `Recommendation<Music>`, `Recommendation<Product>`, `Project`, `Work` — each with a canonical URL and metadata. A rendering layer turns those into a fast website. Themes operate *only* on the rendering layer, never on content.

Consequence: switching `Theme → Swiss` restyles the entire site instantly. Not: install theme → migrate blocks → tweak plugins → discover `/projects` doesn't support the new theme.

This also implies a real static-generation story: the user never runs a build command, but the implementation can emit static HTML — Micro.blog already proves this model (Hugo underneath; posting from web/mobile regenerates the site). Target: CDN-served HTML, effectively no application runtime on the user's public pages, tiny pages, minimal maintenance surface.

### Three separable system components

```
                     ┌── self-host ── your VPS / Uberspace / Docker
Share sheet → app → engine
                     └── hosted ───── shareblog.com infrastructure
```

**The publishing engine (open source)** — runs locally or self-hosted. Owns the content model, web renderer/themes, ActivityPub implementation, metadata resolver framework (turns a shared URL into a structured object), import/export, and API.

**The clients** — iPhone/iPad/Mac/web app. Owns the share-sheet capture workflow and the lightweight editor. **[OPEN: whether clients are open source is separate from the server decision.]**

**The hosted service** — runs the identical engine, plus domains, storage/CDN, backups, upgrades, image/video processing, managed federation delivery queues, push notifications, account management, mobile/desktop sync.

### Open source vs. hosted split

| Layer | Self-host (open source) | Hosted product |
|---|---|---|
| Content model | ✓ | ✓ |
| Web renderer / themes | ✓ | ✓ |
| ActivityPub | ✓ | ✓ |
| Metadata resolver framework | ✓ | ✓ |
| Import/export | ✓ | ✓ |
| API | ✓ | ✓ |
| Self-hosting docs/tooling | ✓ | — |
| Infrastructure, CDN, domains | — | ✓ |
| Automatic updates | — | ✓ |
| Backups | — | ✓ |
| Image/video processing | — | ✓ |
| Push notifications | — | ✓ |
| Managed federation queues | — | ✓ |
| Account management | — | ✓ |
| Mobile/desktop sync | — | ✓ |

Almost the entire server is open source. The hosted product sells operations, not capability.

## 7. Fediverse / identity strategy

The website itself is a Fediverse actor. There is no separate `@adrian@mastodon.social`-style identity to maintain — followers follow the domain directly, e.g. `@adrian@adrianthomas.com`, or potentially a bare WebFinger identity `@adrianthomas.com`. **[OPEN: exact actor model — single site-level actor vs. per-user actors.]**

**Note on Bluesky vs. Mastodon — these need two different mechanisms, not one.** Mastodon and the wider Fediverse speak ActivityPub, so the site being a native AP actor covers them: followers subscribe to the domain itself, no separate account. Bluesky runs on AT Protocol, a different protocol entirely — it can't be folded into the native-actor model. Bluesky distribution stays what the earlier framing called it: POSSE-style syndication, an explicit "also publish this to ☑ Bluesky" step with its own API integration, conceptually closer to cross-posting than to federation.

Reference point: **Ghost(Pro)** already does publication-shaped ActivityPub — sites as followable actors, interactions from Mastodon-style clients. Useful validation of the direction. This product is object-shaped and personal-site-shaped rather than publication/newsletter-shaped, which is the differentiation.

## 8. Content model → ActivityPub mapping

Every custom object type maps to a standard ActivityPub type, so any Mastodon-class client can render it without understanding the custom type:

| Site object | ActivityPub type |
|---|---|
| Thought | `Note` |
| Photo | `Image` / `Note` |
| Article | `Article` |
| Book recommendation | `Article` (+ structured extension) |
| Music recommendation | `Article` (+ structured extension) |
| Product recommendation | `Article` (+ structured extension) |
| Project | `Article` |

Every object carries a canonical link back to its fully-rendered version on the user's own site.

### Structured metadata extensions

Recommendation-type objects carry ordinary interoperable ActivityPub fields plus a namespaced structured extension, e.g. for a book:

```
type: Article
url: https://adrianthomas.com/books/...
name: The Ministry for the Future
content: Really enjoyed this…

schema:isbn
schema:author
schema:rating
```

A generic Mastodon client ignores the extra fields and renders a normal post. A client built on this engine can read them and offer richer actions — "Add to my books," star rendering, etc. (See §11 — later-stage territory, but the architecture should support it from the start.)

## 9. Technical architecture: static site + dynamic federation service

The site can't be entirely static once it's a Fediverse actor, but the split is clean:

```
Website (public content)
99% static
  ↓
cheap, fast CDN

GET /books/...
GET /photos/...
GET /posts/...
```

```
Federation service (protocol surface)
dynamic
  ↓
ActivityPub inbox/outbox + delivery queues

/.well-known/webfinger
/users/adrian
/users/adrian/inbox
/users/adrian/outbox
```

Federation requires signed HTTP request delivery (in and out), retry/delivery queues, and follower state — genuinely dynamic infrastructure, kept separate from the static content-serving path.

### Implementation notes
- **Fedify** (TypeScript ActivityPub framework) is preferred over hand-rolling ActivityPub — handles discovery, HTTP signatures, vocabulary, and delivery without dictating app architecture.
- Self-host target is deliberately small: one website with one or a few actors, not a general multi-tenant social host — closer to **GoToSocial's** "lightweight AP server" scope than to Mastodon's.
- Minimal self-host stack: `docker compose up -d` with `app`, `database`, `object storage/files`, `federation worker`. For single-user instances, SQLite + local filesystem may be sufficient — no Postgres/S3 requirement for the small case.

## 10. Portability: self-host ⇄ hosted

Treated as a first-class product feature, not an edge case.

**Hosted → self-host ("I'm leaving"):**
1. Install the self-host package.
2. `Settings → Export / Move site` produces `content.json`, `media/`, `themes/`, `site-config.json`.
3. Self-hosted instance imports the export.
4. Repoint the domain's DNS at the new server.
5. Public URLs and Fediverse identity are unchanged.

**Self-host → hosted ("I'm tired of ops"):**
1. Export from the self-hosted instance (same format).
2. Import into the hosted product, or click "Move to hosted."
3. Repoint DNS. Done.

Deliberately symmetric with changing email providers while keeping `me@mydomain.com` — identity isn't tied to whoever operates the server.

## 11. Federation-native recommendations (future direction)

Once structured metadata (§8) is in the ActivityPub payload, federation stops being cross-posting and becomes a shared interaction layer between instances of this software specifically:

- Another user of the same engine sees a book recommendation in their federated timeline.
- Because their client understands the `schema:isbn` / `schema:rating` extension, it can offer "Add to my books" rather than just reply/boost.
- Same pattern for music (`Listen / Recommend`), products (`Save / Recommend`), projects (`Fork / Save`).

Explicitly later-stage — the point is that the architecture (custom types + standard AP fallback + namespaced extensions) doesn't need to be redesigned to get there.

## 12. Business model

Open-core, funnel shaped like:

```
Open source
  ↓
"I love this"
  ↓
"I don't want to administer it"
  ↓
€X/month hosted
```

Not: *free version deliberately annoying → pay to unlock useful features.*

The ops burden being funneled toward the hosted tier is concrete and real for this kind of software: Docker/OS updates, TLS, backups, object storage, SMTP, and — specific to this product — ActivityPub delivery queues and federation infra. That's a credible, non-manufactured reason to pay, which matters for a target audience of people who *could* self-host but usually won't want to indefinitely.

**[OPEN: actual pricing, tiers, whether there's a free hosted tier at all.]**

## 13. Opportunity assessment

| Positioning | Assessment |
|---|---|
| Generic personal-site/blog SaaS | 🔴 extremely commoditized |
| Beautiful zero-maintenance blog | 🔴 Bear/Pika/Scribbles/Micro.blog already do this |
| Own-site social posting | 🟠 Micro.blog is already strong here |
| Mobile-first personal publishing | 🟠 several partial solutions exist |
| Structured books/media/products/projects as first-class types | 🟢 interesting, real gap |
| Automatic cross-provider recommendation cards | 🟢 particularly interesting |
| All of the above unified around one's own domain | 🟢 **this is the promising product** |

Conclusion: pursue it, with the discipline that "Article" is only one content type among many — the risk to actively guard against is the project slowly turning into WordPress Lite.

## 14. Open questions

- [ ] Exact field schema per content type (Thought, Article, Photo, Book, Music, Product, Project, Work)
- [ ] Actor model: one Fediverse actor per site vs. per-user
- [ ] Client platform priority and build order (iOS first, presumably — needs confirming)
- [ ] Whether native clients are open source
- [ ] Theming system design (how a theme like "Swiss" declares support for arbitrary custom object types)
- [ ] Moderation / spam / abuse handling on the federation side for a single-user instance (blocklists, report handling)
- [ ] Multi-user support — is this ever more than single-author sites, or deliberately not?
- [ ] Pricing and hosted tier structure
- [ ] Metadata resolver framework: which source APIs/scrapers for books, music, products at launch (e.g. Odesli/Songlink for music; ISBN/book metadata provider TBD; product metadata is the hardest — likely OpenGraph scraping plus manual fallback)
- [ ] Backup/export format versioning and forward compatibility guarantees
- [ ] Bluesky syndication mechanics — API, auth model, and whether it's launch-scope or later
