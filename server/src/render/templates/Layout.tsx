import React from "react";
import type { Site } from "./types.js";
import { resolveLocale, t } from "../i18n.js";
import { cardsStyles, cardsScript, CardsTabBar } from "../themes/cards.js";
import { copyButtonScript, CopyHandleButton } from "./CopyButton.js";

// Promotes the Amazon storefront closest to the visitor's browser-reported
// language (navigator.language — never sent to the server, never logged),
// among the region links BookCard renders with a data-amazon-region
// attribute. No-ops instantly on pages without any. This is a client-only
// enhancement precisely because pages are served with a shared public
// cache-control header (see site-pages.ts): picking a region server-side
// from the Accept-Language header would require varying the cached
// response per visitor, which isn't compatible with that caching.
const amazonRegionScript = `
(function () {
  var links = document.querySelectorAll('[data-amazon-region]');
  if (!links.length) return;
  var country = (navigator.language || '').split(/[-_]/)[1];
  var region = country && {
    US: 'us', GB: 'uk', DE: 'de', AT: 'de', CH: 'de', FR: 'fr', IT: 'it', ES: 'es', CA: 'ca', JP: 'jp',
  }[country.toUpperCase()];
  if (!region) return;
  var match = document.querySelector('[data-amazon-region="' + region + '"]');
  if (!match) return;
  if (match !== links[0]) match.parentNode.insertBefore(match, links[0]);
  match.textContent += ' — closest to you';
})();
`;

function navItems(site: Site, availablePaths?: string[]) {
  const items = [
    { href: "/posts", label: t(site.locale, "posts") },
    { href: "/articles", label: t(site.locale, "articles") },
    { href: "/books", label: t(site.locale, "books") },
    { href: "/music", label: t(site.locale, "music") },
    { href: "/photos", label: t(site.locale, "photos") },
    { href: "/quotes", label: t(site.locale, "quotes") },
  ];
  return [
    { href: "/", label: t(site.locale, "home") },
    ...(availablePaths ? items.filter((item) => availablePaths.includes(item.href)) : items),
  ];
}

export function Layout({
  site,
  title,
  children,
  currentPath = "/",
  cardsDetail = false,
  availablePaths,
}: {
  site: Site;
  title?: string;
  children: React.ReactNode;
  /** The request path, used only to highlight the active tab in the cards theme's bottom bar. */
  currentPath?: string;
  /** True on a single-post detail page in the cards theme — hides the normal header/tab bar for an immersive, edge-to-edge layout. */
  cardsDetail?: boolean;
  /** Nav paths (e.g. "/posts") that have at least one published post. When omitted, all category links are shown. */
  availablePaths?: string[];
}) {
  const pageTitle = title ? `${title} — ${site.title}` : site.title;
  const theme = site.theme;
  const hasAbout = Boolean(site.about && site.about.trim());
  // Not siteOrigin() from render.ts — that file imports Layout, so
  // importing back would be circular. Same computation, just the host
  // (no scheme) since this only needs it for the @handle@host string and
  // a relative activity+json link.
  const fediverseHost = `${site.subdomain}.${process.env.BASE_DOMAIN ?? "localhost:3000"}`;
  const fediverseHandle = `@${site.subdomain}@${fediverseHost}`;

  return (
    <html lang={resolveLocale(site.locale)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{pageTitle}</title>
        {site.tagline ? <meta name="description" content={site.tagline} /> : null}
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
        {site.federationEnabled ? (
          <link rel="alternate" type="application/activity+json" href={`/users/${site.subdomain}`} />
        ) : null}
        {theme === "cards" ? (
          // For the cards theme's quote letter-card, which sets its quote text
          // in a typewriter face rather than the site's system UI font.
          // Self-hosted (Apache-2.0, see server/public/fonts/LICENSE-special-elite.txt)
          // so rendering a page never calls out to Google's font CDN.
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @font-face {
                  font-family: "Special Elite";
                  font-style: normal;
                  font-weight: 400;
                  font-display: swap;
                  src: url(/static/fonts/special-elite-latin.woff2) format("woff2");
                  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
                }
                @font-face {
                  font-family: "Special Elite";
                  font-style: normal;
                  font-weight: 400;
                  font-display: swap;
                  src: url(/static/fonts/special-elite-latin-ext.woff2) format("woff2");
                  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
                }
              `,
            }}
          />
        ) : null}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                color-scheme: light dark;
                --fg: #1a1a1a; --bg: #fff; --muted: #595959; --border: #d8d8d8;
                --focus: #0b5fff;
              }
              @media (prefers-color-scheme: dark) {
                :root { --fg: #f0f0f0; --bg: #111; --muted: #b8b8b8; --border: #3a3a3a; --focus: #6ea8ff; }
              }
              * { box-sizing: border-box; }
              html, body { background: var(--bg); color: var(--fg); }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif;
                     max-width: 680px; margin: 0 auto; padding: 2rem 1.25rem; line-height: 1.55; }
              .skip-link { position: absolute; left: -9999px; top: 0; background: var(--bg); color: var(--fg);
                           padding: 0.75rem 1rem; border: 2px solid var(--focus); border-radius: 4px; z-index: 100; }
              .skip-link:focus { left: 1rem; top: 1rem; }
              .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
                         overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
              a { color: var(--focus); }
              a:focus-visible, button:focus-visible, input:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
              header.site-header { display: flex; justify-content: space-between; align-items: baseline;
                       flex-wrap: wrap; gap: 0.5rem 1.25rem; margin-bottom: 2rem; }
              header.site-header h1 { font-size: 1.1rem; margin: 0; }
              header.site-header h1 a { text-decoration: none; color: inherit; }
              .site-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem; min-width: 0; }
              .header-links { margin: 0; display: flex; align-items: center; gap: 0.35rem; }
              .rss-link { font-size: 0.7rem; color: var(--muted); text-decoration: none; }
              .rss-link:hover, .rss-link:focus-visible { color: var(--fg); }
              /* Resets a <button> down to plain text so CopyHandleButton
                 (see CopyButton.tsx) reads as just another word in the
                 "Follow RSS | Fediverse" line, not a form control — the
                 .rss-link class supplies the actual visible styling.
                 font-family only, not the "font" shorthand: that resets
                 every font sub-property including size, and being a plain
                 class it'd win over .rss-link's own font-size by source
                 order despite matching specificity. */
              .link-btn-reset { background: none; border: none; padding: 0; margin: 0; font-family: inherit; cursor: pointer; position: relative; }
              .header-link-divider { color: var(--border); }
              /* Overrides the general .copy-feedback below (see its own
                 comment) for this specific spot: .site-header-right is a
                 right-aligned flex column, so the inline max-width
                 expansion everywhere else pushed this row's right-anchored
                 content wider and visibly shifted the whole line left —
                 worst on narrow iOS widths, where there's no slack to
                 absorb it. Taking the feedback out of flow entirely
                 (absolute, anchored under the word that was clicked) and
                 fading it by opacity alone means it can never move
                 anything else on the page. */
              .link-btn-reset .copy-feedback {
                position: absolute; top: 100%; right: 0; margin-top: 0.3rem;
                max-width: none; white-space: nowrap; opacity: 0; pointer-events: none;
                transition: opacity 0.4s ease-in-out;
              }
              .link-btn-reset .copy-feedback--visible { max-width: none; opacity: 1; }
              nav { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.9rem; }
              nav a { text-decoration: none; color: var(--muted); }
              nav a:hover, nav a:focus-visible { color: var(--fg); }
              .card { margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid var(--border); }
              .card:last-child { border-bottom: none; }
              .card img { max-width: 100%; height: auto; border-radius: 6px; }
              .meta { font-size: 0.85rem; color: var(--muted); }
              /* EXIF strip on a photo's detail page. The system's monospace
                 stack resolves to San Francisco Mono on Apple's own platforms —
                 the same face its Camera/Photos apps use for exposure readouts —
                 while still falling back cleanly elsewhere, without this site
                 hosting a font of its own. */
              .exif {
                margin: 0.75rem 0 0; padding-top: 0.6rem; border-top: 1px solid var(--border);
                display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem;
                font-family: ui-monospace, "SF Mono", "SFMono-Regular", Menlo, Consolas, monospace;
                font-variant-numeric: tabular-nums;
              }
              .exif-row { margin: 0; }
              .exif-row dt {
                margin: 0 0 0.1rem; font-size: 0.66rem; font-weight: 600; letter-spacing: 0.08em;
                text-transform: uppercase; color: var(--muted);
              }
              .exif-row dd { margin: 0; font-size: 0.82rem; color: var(--fg); letter-spacing: 0.01em; }
              .book, .music { display: flex; gap: 1rem; flex-wrap: wrap; }
              .book img { width: 90px; max-width: 100%; height: auto; border-radius: 4px; flex-shrink: 0; }
              .music img.artwork {
                width: 90px; max-width: 100%; aspect-ratio: 1 / 1; object-fit: cover;
                border-radius: 4px; flex-shrink: 0;
              }
              .music-links { display: flex; gap: 0.75rem; flex-wrap: wrap; }
              .quote-text { margin: 0 0 0.75rem; padding-left: 1rem; border-left: 3px solid var(--border); }
              .quote-text p { margin: 0 0 0.5rem; font-size: 1.15rem; font-style: italic; line-height: 1.4; }
              .quote-text footer { font-size: 0.9rem; color: var(--muted); }
              .quote-text cite { font-style: normal; }
              a.title-link { text-decoration: none; color: inherit; }
              a.title-link:hover { text-decoration: underline; }
              /* Icon buttons next to a post's date (copy link) or a quote's
                 date line (copy quote) — see CopyButton.tsx. color: inherit
                 rather than a fixed token so it automatically matches
                 whatever context it's placed in, classic .meta's muted gray
                 or the cards theme's various per-context date colors
                 (including light-on-black on the photo detail page).
                 copy-feedback stays collapsed to zero width until the copy
                 actually lands, then reveals its text as a subtle inline
                 expansion rather than a popup/toast. */
              .copy-btn {
                display: inline-flex; align-items: center; gap: 0.35rem; vertical-align: middle;
                background: none; border: none; padding: 0; margin-left: 0.5rem; cursor: pointer;
                color: inherit; opacity: 0.7; font: inherit; font-size: 0.85em; line-height: 1;
              }
              .copy-btn--leading { margin-left: 0; margin-right: 0.5rem; }
              .copy-btn:hover, .copy-btn:focus-visible { opacity: 1; }
              .copy-btn svg { display: block; flex-shrink: 0; }
              .copy-feedback {
                max-width: 0; overflow: hidden; white-space: nowrap; opacity: 0;
                transition: opacity 0.2s ease, max-width 0.2s ease;
              }
              .copy-feedback--visible { max-width: 8em; opacity: 1; }
              .body-content p, .about-content p { margin: 0 0 1rem; }
              .body-content h2 { font-size: 1.3rem; margin: 1.75rem 0 0.75rem; line-height: 1.3; }
              .body-content h3 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; line-height: 1.3; }
              .body-content h2:first-child, .body-content h3:first-child { margin-top: 0; }
              .body-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 0 0 1rem; display: block; }
              .release-entry { margin: 0 0 1.75rem; }
              .release-entry:last-child { margin-bottom: 0; }
              .release-date { font-size: 1rem; margin: 0 0 0.5rem; }
              .release-entry ul { margin: 0; padding-left: 1.25rem; }
              .release-entry li { margin: 0 0 0.4rem; }
              .release-entry li:last-child { margin-bottom: 0; }
              .about-product p, .about-product li { margin: 0 0 0.75rem; }
              .about-product h2 { font-size: 1.2rem; margin: 2rem 0 0.75rem; line-height: 1.3; }
              .about-product h2:first-of-type { margin-top: 2.25rem; }
              .about-product ol, .about-product > ul { padding-left: 1.25rem; }
              .faq-entry { margin: 0 0 1.5rem; }
              .faq-entry:last-child { margin-bottom: 0; }
              .faq-entry h3 { font-size: 1rem; margin: 0 0 0.4rem; line-height: 1.3; }
              .faq-entry ul { margin: 0; padding-left: 1.25rem; }
              .faq-entry li { margin: 0 0 0.6rem; }
              .faq-entry li:last-child { margin-bottom: 0; }
              footer.site-footer {
                margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border);
                font-size: 0.9rem;
              }
              footer.site-footer a { color: var(--muted); text-decoration: none; }
              footer.site-footer a:hover, footer.site-footer a:focus-visible { color: var(--fg); }
              @media (max-width: 400px) {
                .book, .music { flex-direction: column; }
                .book img { width: 140px; }
                .music img.artwork { width: 140px; }
              }
            `,
          }}
        />
        {theme === "cards" ? <style dangerouslySetInnerHTML={{ __html: cardsStyles }} /> : null}
      </head>
      <body
        className={theme === "cards" ? "theme-cards" : undefined}
        data-theme={theme}
        data-cards-detail={theme === "cards" && cardsDetail ? "true" : undefined}
      >
        <a className="skip-link" href="#main-content">
          {t(site.locale, "skipToContent")}
        </a>
        <header className="site-header">
          <h1>
            <a href="/">{site.title}</a>
          </h1>
          <div className="site-header-right">
            <p className="header-links">
              <a className="rss-link" href="/feed.xml">
                {t(site.locale, "followRss")}
              </a>
              {site.federationEnabled ? (
                <>
                  <span className="header-link-divider" aria-hidden="true">
                    |
                  </span>
                  <CopyHandleButton
                    handle={fediverseHandle}
                    label={t(site.locale, "fediverseLabel")}
                    locale={site.locale}
                  />
                </>
              ) : null}
            </p>
            <nav aria-label={t(site.locale, "primaryNavigation")}>
              {navItems(site, availablePaths).map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main id="main-content">{children}</main>
        {hasAbout && !(theme === "cards" && cardsDetail) ? (
          <footer className="site-footer">
            <a href="/about">{t(site.locale, "about")}</a>
          </footer>
        ) : null}
        {theme === "cards" && !cardsDetail ? (
          <CardsTabBar locale={site.locale} currentPath={currentPath} availablePaths={availablePaths} />
        ) : null}
        {theme === "cards" ? <script dangerouslySetInnerHTML={{ __html: cardsScript }} /> : null}
        <script dangerouslySetInnerHTML={{ __html: amazonRegionScript }} />
        <script dangerouslySetInnerHTML={{ __html: copyButtonScript }} />
      </body>
    </html>
  );
}
