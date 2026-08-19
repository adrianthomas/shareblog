import React from "react";
import type { Site } from "./types.js";
import { resolveLocale, t } from "../i18n.js";

function navItems(site: Site) {
  return [
    { href: "/", label: t(site.locale, "home") },
    { href: "/posts", label: t(site.locale, "posts") },
    { href: "/articles", label: t(site.locale, "articles") },
    { href: "/books", label: t(site.locale, "books") },
    { href: "/music", label: t(site.locale, "music") },
    { href: "/photos", label: t(site.locale, "photos") },
  ];
}

export function Layout({
  site,
  title,
  children,
}: {
  site: Site;
  title?: string;
  children: React.ReactNode;
}) {
  const pageTitle = title ? `${title} — ${site.title}` : site.title;

  return (
    <html lang={resolveLocale(site.locale)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{pageTitle}</title>
        {site.tagline ? <meta name="description" content={site.tagline} /> : null}
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
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
              a { color: var(--focus); }
              a:focus-visible, button:focus-visible, input:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
              header { display: flex; justify-content: space-between; align-items: baseline;
                       flex-wrap: wrap; gap: 0.5rem 1.25rem; margin-bottom: 2rem; }
              header h1 { font-size: 1.1rem; margin: 0; }
              header h1 a { text-decoration: none; color: inherit; }
              nav { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.9rem; }
              nav a { text-decoration: none; color: var(--muted); }
              nav a:hover, nav a:focus-visible { color: var(--fg); }
              .card { margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid var(--border); }
              .card:last-child { border-bottom: none; }
              .card img { max-width: 100%; height: auto; border-radius: 6px; }
              .meta { font-size: 0.85rem; color: var(--muted); }
              .book, .music { display: flex; gap: 1rem; flex-wrap: wrap; }
              .book img, .music img { width: 90px; max-width: 100%; height: auto; border-radius: 4px; flex-shrink: 0; }
              a.title-link { text-decoration: none; color: inherit; }
              a.title-link:hover { text-decoration: underline; }
              @media (max-width: 400px) {
                .book, .music { flex-direction: column; }
                .book img, .music img { width: 140px; }
              }
            `,
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          {t(site.locale, "skipToContent")}
        </a>
        <header>
          <h1>
            <a href="/">{site.title}</a>
          </h1>
          <nav aria-label={t(site.locale, "primaryNavigation")}>
            {navItems(site).map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        </header>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
