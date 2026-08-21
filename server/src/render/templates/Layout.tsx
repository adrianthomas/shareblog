import React from "react";
import type { Site } from "./types.js";
import { resolveLocale, t } from "../i18n.js";
import { cardsStyles, cardsScript, CardsTabBar } from "../themes/cards.js";

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

  return (
    <html lang={resolveLocale(site.locale)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{pageTitle}</title>
        {site.tagline ? <meta name="description" content={site.tagline} /> : null}
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
        {theme === "cards" ? (
          <>
            {/* For the cards theme's quote letter-card, which sets its quote text
                in a cursive hand rather than the site's system UI font. */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link
              rel="stylesheet"
              href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&display=swap"
            />
          </>
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
          <nav aria-label={t(site.locale, "primaryNavigation")}>
            {navItems(site, availablePaths).map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        </header>
        <main id="main-content">{children}</main>
        {theme === "cards" && !cardsDetail ? (
          <CardsTabBar locale={site.locale} currentPath={currentPath} availablePaths={availablePaths} />
        ) : null}
        {theme === "cards" ? <script dangerouslySetInnerHTML={{ __html: cardsScript }} /> : null}
        <script dangerouslySetInnerHTML={{ __html: amazonRegionScript }} />
      </body>
    </html>
  );
}
