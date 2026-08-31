import React from "react";
import type { Site } from "./types.js";
import { resolveLocale, t } from "../i18n.js";
import { cardsStyles, cardsScript, CardsCategoryFilter } from "../themes/cards.js";
import { cabinetStyles, CabinetNavigation } from "../themes/cabinet.js";
import { cabinetScript } from "../themes/cabinet-script.js";
import { copyButtonScript, CopyHandleButton } from "./CopyButton.js";
import { absoluteSiteUrl, siteOrigin } from "../site-url.js";
import type { ProfileLink } from "./types.js";
import { workPageEnabled } from "../../lib/work-page.js";
import { SiteProfile } from "./SiteProfile.js";

export interface PageMetadata {
  path?: string;
  description?: string;
  imageUrl?: string;
  type?: "website" | "article" | "profile";
  publishedAt?: Date | null;
  noIndex?: boolean;
}

const THEME_CHROME_COLORS: Record<Site["theme"], { light: string; dark: string }> = {
  classic: { light: "#ffffff", dark: "#111111" },
  cards: { light: "#ffffff", dark: "#111111" },
  washi: { light: "#f6efe1", dark: "#1c1a15" },
  prism: { light: "#f7f8ff", dark: "#101321" },
  ledger: { light: "#f8fafc", dark: "#0f1115" },
  cabinet: { light: "#f3f1ea", dark: "#11120f" },
};

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
    { href: "/links", label: t(site.locale, "links") },
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

function CategoryFilter({
  site,
  currentPath,
  availablePaths,
}: {
  site: Site;
  currentPath: string;
  /** Nav paths (e.g. "/posts") that have at least one published post. When omitted, all tabs are shown. */
  availablePaths?: string[];
}) {
  return (
    <details className="category-filter">
      <summary className="category-filter-trigger" aria-label={t(site.locale, "filterCategories")}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
          <path
            d="M7.5 8.5h9M9.5 12h5M11 15.5h2"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <span>{t(site.locale, "filterCategories")}</span>
      </summary>
      <nav className="category-filter-menu" aria-label={t(site.locale, "primaryNavigation")}>
        {navItems(site, availablePaths).map((item) => {
          const active = item.href === "/" ? currentPath === "/" : currentPath.startsWith(item.href);
          return (
            <a key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
              {item.label}
            </a>
          );
        })}
      </nav>
    </details>
  );
}

export function Layout({
  site,
  title,
  children,
  currentPath = "/",
  cardsDetail = false,
  availablePaths,
  metadata = {},
}: {
  site: Site;
  title?: string;
  children: React.ReactNode;
  /** The request path, used to highlight the active item in theme navigation. */
  currentPath?: string;
  /** True on a single-post detail page in an interactive theme — hides normal site chrome for the immersive detail surface. */
  cardsDetail?: boolean;
  /** Nav paths (e.g. "/posts") that have at least one published post. When omitted, all category links are shown. */
  availablePaths?: string[];
  metadata?: PageMetadata;
}) {
  const pageTitle = title ? `${title} — ${site.title}` : site.title;
  const theme = site.theme;
  const chromeColors = THEME_CHROME_COLORS[theme];
  const usesCardsInteraction = theme === "cards" || theme === "prism" || theme === "ledger";
  const usesCabinetInteraction = theme === "cabinet";
  const usesInteractiveDetail = usesCardsInteraction || usesCabinetInteraction;
  const usesCompactCategoryFilter = !usesInteractiveDetail;
  const hasWorkPage = workPageEnabled();
  // The canonical host is also the Fediverse identity host. The actor's
  // identifier remains the stable site subdomain, while a configured custom
  // domain replaces the deployment's default <subdomain>.<BASE_DOMAIN> host.
  const fediverseHost = new URL(siteOrigin(site)).host;
  const fediverseHandle = `@${site.subdomain}@${fediverseHost}`;
  const canonicalUrl = absoluteSiteUrl(site, metadata.path ?? currentPath);
  const description = metadata.description ?? site.tagline ?? site.introduction ?? undefined;
  const profileLinks = (site.profileLinks ?? []) as ProfileLink[];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${siteOrigin(site)}/#person`,
        name: site.profileName?.trim() || site.title,
        url: siteOrigin(site),
        ...(description ? { description } : {}),
        ...(site.profileImageUrl ? { image: site.profileImageUrl } : {}),
        ...(site.location ? { homeLocation: site.location } : {}),
        ...(profileLinks.length ? { sameAs: profileLinks.map((link) => link.url) } : {}),
      },
      {
        "@type": metadata.type === "article" ? "BlogPosting" : "WebSite",
        "@id": `${canonicalUrl}#content`,
        url: canonicalUrl,
        name: pageTitle,
        author: { "@id": `${siteOrigin(site)}/#person` },
        ...(description ? { description } : {}),
        ...(metadata.imageUrl ? { image: metadata.imageUrl } : {}),
        ...(metadata.publishedAt ? { datePublished: metadata.publishedAt.toISOString() } : {}),
      },
    ],
  };

  return (
    <html lang={resolveLocale(site.locale)} data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content={chromeColors.light} media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content={chromeColors.dark} media="(prefers-color-scheme: dark)" />
        <title>{pageTitle}</title>
        {description ? <meta name="description" content={description} /> : null}
        <link rel="canonical" href={canonicalUrl} />
        {metadata.noIndex ? <meta name="robots" content="noindex,follow" /> : null}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:type" content={metadata.type ?? "website"} />
        <meta property="og:url" content={canonicalUrl} />
        {description ? <meta property="og:description" content={description} /> : null}
        {metadata.imageUrl ? <meta property="og:image" content={metadata.imageUrl} /> : null}
        <meta name="twitter:card" content={metadata.imageUrl ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={pageTitle} />
        {description ? <meta name="twitter:description" content={description} /> : null}
        {metadata.imageUrl ? <meta name="twitter:image" content={metadata.imageUrl} /> : null}
        {site.profileImageUrl ? <link rel="icon" href={site.profileImageUrl} /> : null}
        {site.profileImageUrl ? <link rel="apple-touch-icon" href={site.profileImageUrl} /> : null}
        {profileLinks.filter((link) => link.relMe).map((link) => (
          <link key={link.url} rel="me" href={link.url} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
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
        {theme === "washi" ? (
          // For the washi theme's headings — a mincho (Japanese serif) face
          // whose brush-influenced strokes carry the paper-and-ink feel into
          // Latin text too. Self-hosted (SIL OFL, see
          // server/public/fonts/LICENSE-shippori-mincho.txt) so rendering a
          // page never calls out to Google's font CDN. Only the latin/
          // latin-ext subsets are pulled in — body copy here is English, not
          // Japanese, so the full CJK glyph set would just be dead weight.
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @font-face {
                  font-family: "Shippori Mincho";
                  font-style: normal;
                  font-weight: 400;
                  font-display: swap;
                  src: url(/static/fonts/shippori-mincho-latin-400.woff2) format("woff2");
                  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
                }
                @font-face {
                  font-family: "Shippori Mincho";
                  font-style: normal;
                  font-weight: 400;
                  font-display: swap;
                  src: url(/static/fonts/shippori-mincho-latin-ext-400.woff2) format("woff2");
                  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
                }
                @font-face {
                  font-family: "Shippori Mincho";
                  font-style: normal;
                  font-weight: 600;
                  font-display: swap;
                  src: url(/static/fonts/shippori-mincho-latin-600.woff2) format("woff2");
                  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
                }
                @font-face {
                  font-family: "Shippori Mincho";
                  font-style: normal;
                  font-weight: 600;
                  font-display: swap;
                  src: url(/static/fonts/shippori-mincho-latin-ext-600.woff2) format("woff2");
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
                --fg: #1d1d1f; --bg: #fff; --muted: #65656b; --border: #d2d2d7;
                --focus: #06c;
              }
              @media (prefers-color-scheme: dark) {
                :root { --fg: #f5f5f7; --bg: #111113; --muted: #a1a1a6; --border: #3a3a3c; --focus: #2997ff; }
              }
              * { box-sizing: border-box; }
              html, body { background-color: var(--bg); color: var(--fg); }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif;
                     max-width: 700px; margin: 0 auto; padding: 2.25rem 1.5rem;
                     font-size: 1.0625rem; line-height: 1.62; letter-spacing: -0.006em;
                     -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
              button, input, summary { font: inherit; }
              h1, h2, h3 { letter-spacing: -0.025em; text-wrap: balance; }
              p { text-wrap: pretty; }
              .skip-link { position: absolute; left: -9999px; top: 0; background: var(--bg); color: var(--fg);
                           padding: 0.75rem 1rem; border: 2px solid var(--focus); border-radius: 10px; z-index: 1200; }
              .skip-link:focus { left: 1rem; top: 1rem; }
              .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
                         overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
              a { color: var(--focus); text-decoration-thickness: 0.075em; text-underline-offset: 0.16em; }
              a:focus-visible, button:focus-visible, input:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
              header.site-header { display: flex; justify-content: space-between; align-items: flex-start;
                       flex-wrap: wrap; gap: 0.75rem 1.5rem; margin-bottom: 2.75rem; }
              header.site-header h1 { font-size: 1.28rem; line-height: 1.12; font-weight: 680; margin: 0; letter-spacing: -0.032em; }
              header.site-header h1 a { text-decoration: none; color: inherit; }
              .site-header-left { display: flex; flex-direction: column; align-items: flex-start; gap: 0.8rem; min-width: 0; }
              .site-identity { display: flex; flex-direction: column; gap: 0.28rem; min-width: 0; }
              .site-tagline { max-width: 34rem; margin: 0; color: var(--muted); font-size: 0.88rem; line-height: 1.4; letter-spacing: -0.005em; }
              .site-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem; min-width: 0; }
              .header-links { margin: -0.7rem 0 0; display: flex; align-items: center; gap: 0.4rem; min-height: 2.75rem; }
              .rss-link { display: inline-flex; align-items: center; min-height: 2.75rem; font-size: 0.76rem; color: var(--muted); text-decoration: none; }
              .rss-link:hover, .rss-link:focus-visible { color: var(--fg); }
              /* Resets a <button> down to plain text so CopyHandleButton
                 (see CopyButton.tsx) reads as just another word in the
                 "Follow RSS | Fediverse" line, not a form control — the
                 .rss-link class supplies the actual visible styling.
                 font-family only, not the "font" shorthand: that resets
                 every font sub-property including size, and being a plain
                 class it'd win over .rss-link's own font-size by source
                 order despite matching specificity. */
              .link-btn-reset { display: inline-flex; align-items: center; min-height: 2.75rem; background: none; border: none; padding: 0; margin: 0; font-family: inherit; cursor: pointer; position: relative; }
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
              .category-filter { position: relative; align-self: flex-start; }
              .category-filter-trigger {
                display: inline-flex; align-items: center; gap: 0.42rem;
                min-height: 2.75rem; border-radius: 999px; padding: 0.45rem 0.85rem;
                color: var(--muted); background: color-mix(in srgb, var(--bg) 96%, var(--fg));
                border: 1px solid var(--border); cursor: pointer; list-style: none;
                font-size: 0.82rem; font-weight: 560; line-height: 1;
                -webkit-tap-highlight-color: transparent; touch-action: manipulation;
              }
              .category-filter-trigger::-webkit-details-marker { display: none; }
              .category-filter-trigger:hover { color: var(--fg); }
              .category-filter-trigger:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
              .category-filter-menu {
                position: absolute; top: calc(100% + 0.45rem); left: 0; z-index: 40;
                display: grid; gap: 0.1rem; min-width: 12rem; padding: 0.4rem;
                border: 1px solid color-mix(in srgb, var(--border) 84%, transparent); border-radius: 12px;
                background: color-mix(in srgb, var(--bg) 94%, transparent);
                box-shadow: 0 2px 6px rgba(0,0,0,0.08), 0 18px 42px rgba(0,0,0,0.13);
                backdrop-filter: blur(22px) saturate(1.2); -webkit-backdrop-filter: blur(22px) saturate(1.2);
              }
              .category-filter-menu a {
                display: flex; align-items: center; min-height: 2.75rem;
                padding: 0.5rem 0.7rem; border-radius: 9px;
                color: var(--muted); text-decoration: none; font-size: 0.9rem; touch-action: manipulation;
              }
              .category-filter-menu a:hover,
              .category-filter-menu a:focus-visible { color: var(--fg); background: color-mix(in srgb, var(--focus) 10%, transparent); }
              .category-filter-menu a[aria-current="page"] {
                color: var(--focus); font-weight: 700; background: color-mix(in srgb, var(--focus) 12%, transparent);
              }
              .card { margin-bottom: 2.75rem; padding-bottom: 2.75rem; border-bottom: 1px solid var(--border); }
              .card:last-child { border-bottom: none; }
              .card img { max-width: 100%; height: auto; border-radius: 10px; }
              .card h2 { margin: 0 0 0.7rem; font-size: clamp(1.4rem, 3vw, 1.65rem); line-height: 1.18; }
              .card > .body-content:first-child { font-size: 1.1rem; line-height: 1.68; }
              .card > a:first-child + p, .card > img:first-child + p { margin: 0.9rem 0 0.2rem; }
              .article-card-cover {
                display: block; margin-bottom: 0.85rem;
              }
              .article-card-cover img {
                display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover;
              }
              .article-excerpt {
                margin: 0.7rem 0 0.85rem; color: var(--muted); line-height: 1.55;
              }
              .article-detail-cover {
                display: block; width: 100%; max-height: 420px; object-fit: cover;
                margin: 0 0 1.5rem; border-radius: 12px;
              }
              .meta { font-size: 0.8rem; color: var(--muted); letter-spacing: 0; font-variant-numeric: tabular-nums; }
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
              .book, .music { display: flex; align-items: flex-start; gap: 1.25rem; flex-wrap: nowrap; }
              .book img { width: 90px; max-width: 100%; height: auto; border-radius: 4px; flex-shrink: 0; }
              .music img.artwork {
                width: 90px; max-width: 100%; aspect-ratio: 1 / 1; object-fit: cover;
                border-radius: 4px; flex-shrink: 0;
              }
              .music-links { display: flex; gap: 0.75rem; flex-wrap: wrap; }
              .music-links a {
                display: inline-flex; align-items: center; gap: 0.42rem; min-height: 2.75rem;
              }
              .music-link-icon {
                display: inline-flex; align-items: center; justify-content: center;
                width: 1.45rem; height: 1.45rem; border-radius: 999px;
                color: var(--bg); background: var(--focus);
                font-family: ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                font-size: 0.68rem; font-weight: 800; line-height: 1;
                box-shadow: 0 1px 2px rgba(0,0,0,0.14), 0 6px 14px color-mix(in srgb, var(--focus) 24%, transparent);
                flex-shrink: 0;
              }
              .music-link-icon { padding-left: 1px; }
              .link-card {
                position: relative;
                padding: 1.05rem 1.15rem 1.15rem;
                border: 1px solid var(--border);
                border-radius: 12px;
                background:
                  linear-gradient(90deg, color-mix(in srgb, var(--focus) 10%, transparent), transparent 35%),
                  color-mix(in srgb, var(--bg) 96%, var(--fg));
              }
              .link-topline {
                display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem;
                margin-bottom: 0.4rem;
              }
              .link-topline .meta { margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
              .link-host {
                margin: 0; min-width: 0; color: var(--muted); font-size: 0.8rem;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
              }
              .link-card h2 { margin-top: 0; margin-bottom: 0.6rem; line-height: 1.25; }
              .link-title-link .external-arrow { margin-left: 0.35rem; }
              .external-arrow { display: inline-block; font-size: 0.82em; color: var(--focus); vertical-align: 0.08em; }
              .link-excerpt { color: var(--muted); margin-bottom: 0.7rem; line-height: 1.45; }
              .link-comment {
                margin-top: 0.75rem; padding-left: 0.85rem; border-left: 3px solid var(--focus);
              }
              .link-comment p:last-child { margin-bottom: 0; }
              .link-actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin: 1rem 0 0; }
              .open-link-button {
                display: inline-flex; align-items: center; gap: 0.35rem;
                border: 1px solid color-mix(in srgb, var(--focus) 38%, var(--border)); border-radius: 999px;
                min-height: 2.75rem; padding: 0.55rem 0.85rem; text-decoration: none;
                color: var(--focus); font-size: 0.9rem; font-weight: 650;
                background: color-mix(in srgb, var(--focus) 8%, transparent);
              }
              .open-link-button:hover, .open-link-button:focus-visible {
                border-color: var(--focus); background: color-mix(in srgb, var(--focus) 14%, transparent);
              }
              .quote-text { margin: 0 0 1rem; padding-left: 1.15rem; border-left: 2px solid var(--border); }
              .quote-text p { margin: 0 0 0.65rem; font-size: 1.22rem; font-style: italic; line-height: 1.48; letter-spacing: -0.014em; }
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
              .article-detail > h1 { margin: 0 0 0.7rem; font-size: clamp(2.1rem, 7vw, 3.2rem); line-height: 1.03; }
              .article-detail > .meta { margin-bottom: 1.75rem; }
              .body-content, .about-content { max-width: 65ch; }
              .body-content p, .about-content p { margin: 0 0 1.15rem; }
              .body-content ul, .body-content ol {
                margin: 0 0 1.15rem;
                padding-left: 1.45rem;
              }
              .body-content li {
                margin: 0.25rem 0;
                padding-left: 0.15rem;
              }
              .body-content h2 { font-size: 1.45rem; margin: 2.15rem 0 0.75rem; line-height: 1.2; }
              .body-content h3 { font-size: 1.18rem; margin: 1.7rem 0 0.55rem; line-height: 1.25; }
              .body-content h4, .body-content h5, .body-content h6 {
                font-size: 1rem; margin: 1.35rem 0 0.45rem; line-height: 1.3;
              }
              .body-content h2:first-child, .body-content h3:first-child,
              .body-content h4:first-child, .body-content h5:first-child,
              .body-content h6:first-child { margin-top: 0; }
              .body-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 0 0 1rem; display: block; }
              .body-content blockquote { margin: 1.5rem 0; padding-left: 1rem; border-left: 3px solid var(--border); color: var(--muted); }
              .body-content blockquote p:last-child { margin-bottom: 0; }
              .body-content pre { max-width: 100%; overflow-x: auto; margin: 1.5rem 0; padding: 1rem; border: 1px solid var(--border); border-radius: 8px; background: color-mix(in srgb, var(--bg) 94%, var(--fg)); }
              .body-content code { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 0.88em; }
              .body-content hr { margin: 2rem 0; border: 0; border-top: 1px solid var(--border); }
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
              .site-profile {
                display: flex; gap: 1rem; align-items: flex-start; margin: 0 0 2.5rem;
                padding: 1.1rem 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
              }
              .site-profile > img { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; flex: none; }
              .site-profile-details { min-width: 0; flex: 1; }
              .site-profile p, .site-footer-profile p { margin: 0; }
              .site-profile-name { font-size: 1rem; font-weight: 720; color: var(--fg); }
              .site-profile-location { margin-top: 0.15rem !important; color: var(--muted); font-size: 0.82rem; }
              .site-profile-introduction { max-width: 60ch; margin-top: 0.75rem !important; }
              .site-profile-link-groups { display: flex; flex-wrap: wrap; gap: 1rem 2.5rem; margin-top: 0.85rem; }
              .site-profile-links { display: flex; flex-wrap: wrap; gap: 0.35rem 0.85rem; font-size: 0.9rem; }
              .site-profile-links > span { width: 100%; color: var(--muted); font-size: 0.7rem; font-weight: 650; letter-spacing: 0.06em; text-transform: uppercase; }
              .site-profile-links a { color: inherit; }
              .site-contact-links a { font-weight: 650; }
              .pagination { display: flex; justify-content: space-between; gap: 1rem; margin: 2.5rem 0 0; }
              .pagination a { color: inherit; }
              .search-form { display: flex; gap: 0.5rem; margin: 0 0 2rem; }
              .search-form input { min-width: 0; flex: 1; padding: 0.7rem 0.8rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--fg); font: inherit; }
              .search-form button { padding: 0.7rem 1rem; border: 1px solid var(--border); border-radius: 8px; background: var(--fg); color: var(--bg); font: inherit; cursor: pointer; }
              .archive-list { list-style: none; margin: 0; padding: 0; }
              .archive-list > li { margin: 0 0 1.6rem; }
              .archive-list h2 { font-size: 1.1rem; margin: 0 0 0.6rem; }
              .archive-months { display: flex; flex-wrap: wrap; gap: 0.45rem 1rem; margin: 0; padding: 0; list-style: none; }
              .archive-months a { color: inherit; }
              footer.site-footer {
                margin-top: 3.5rem; padding-top: 1.5rem; padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
                border-top: 1px solid var(--border); font-size: 0.82rem;
              }
              .site-footer-profile { display: grid; grid-template-columns: minmax(9rem, 0.7fr) minmax(0, 1.3fr); gap: 1.5rem; margin-bottom: 1.5rem; }
              .site-footer-profile .site-profile-link-groups { margin-top: 0; justify-content: flex-end; }
              .site-footer-profile .site-profile-links { justify-content: flex-end; }
              .site-footer-nav { padding-top: 1rem; border-top: 1px solid color-mix(in srgb, var(--border) 70%, transparent); }
              footer.site-footer a { color: var(--muted); text-decoration: none; }
              footer.site-footer a:hover, footer.site-footer a:focus-visible { color: var(--fg); }
              body[data-page="/my-work"] { max-width: 1080px; }
              .work-page { --work-accent: #ff5c35; --work-lime: #d7ff4f; --work-ink: #151515; }
              .work-hero {
                min-height: min(70vh, 650px); display: grid; grid-template-columns: minmax(0, 1fr) 190px;
                gap: clamp(2rem, 7vw, 6rem); align-items: center; padding: clamp(2rem, 6vw, 5.5rem) 0 5rem;
                border-bottom: 1px solid var(--border);
              }
              .work-eyebrow { margin: 0 0 1rem; font-size: 0.72rem; font-weight: 760; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
              .work-hero h2 { max-width: 850px; margin: 0; font-size: clamp(3.2rem, 8.8vw, 7.5rem); line-height: 0.87; letter-spacing: -0.07em; }
              .work-lede { max-width: 610px; margin: 2rem 0 0; font-size: clamp(1.08rem, 2vw, 1.35rem); line-height: 1.48; color: var(--muted); }
              .work-sticker {
                aspect-ratio: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;
                border-radius: 50%; background: var(--work-lime); color: var(--work-ink); transform: rotate(7deg);
                box-shadow: 0.55rem 0.7rem 0 var(--work-accent); font-size: 0.72rem; font-weight: 850; letter-spacing: 0.09em; line-height: 1.5;
              }
              .work-sticker i { margin-top: 0.3rem; font-size: 1.7rem; font-style: normal; line-height: 1; }
              .work-timeline { position: relative; }
              .work-chapter { display: grid; grid-template-columns: 64px minmax(220px, 0.85fr) minmax(320px, 1.15fr); gap: clamp(1.5rem, 5vw, 4.5rem); min-height: 520px; padding: 5rem 0; border-bottom: 1px solid var(--border); align-items: center; }
              .work-rail { align-self: stretch; position: relative; display: flex; justify-content: center; }
              .work-rail::before { content: ""; position: absolute; top: -5rem; bottom: -5rem; width: 1px; background: var(--border); }
              .work-rail span { position: sticky; top: 2rem; z-index: 1; align-self: flex-start; display: grid; place-items: center; width: 46px; height: 46px; border: 1px solid var(--border); border-radius: 50%; background: var(--bg); font: 750 0.72rem/1 ui-monospace, monospace; }
              .work-label { margin: 0 0 0.55rem !important; color: var(--work-accent); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; }
              .work-chapter-copy h3 { margin: 0 0 1rem; font-size: clamp(2.2rem, 5vw, 4.5rem); line-height: 0.95; letter-spacing: -0.055em; }
              .work-chapter-copy > p:not(.work-label):not(.work-note-line) { max-width: 34rem; font-size: 1.08rem; line-height: 1.55; }
              .work-note-line { margin: 1.7rem 0 0; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.76rem; line-height: 1.45; }
              .work-visual { min-height: 360px; display: grid; place-items: center; overflow: hidden; border-radius: 28px; background: #ebe7df; color: var(--work-ink); }
              .work-board { position: relative; width: 82%; height: 75%; background: #d8d2c8; border-radius: 12px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
              .work-note { position: absolute; width: 38%; aspect-ratio: 1.08; display: grid; place-items: center; padding: 1rem; background: #fff277; box-shadow: 0 9px 18px rgba(0,0,0,.12); font: 700 0.8rem/1.2 ui-monospace, monospace; text-align: center; }
              .work-note--one { left: 9%; top: 12%; transform: rotate(-5deg); }.work-note--two { right: 9%; top: 18%; background: #ff9db0; transform: rotate(4deg); }.work-note--three { left: 31%; bottom: 10%; background: #d7ff4f; transform: rotate(-1deg); }
              .work-thread { position: absolute; left: 25%; right: 26%; top: 49%; height: 2px; background: var(--work-accent); transform: rotate(16deg); }
              .work-phone { position: relative; width: 190px; height: 360px; overflow: hidden; border: 8px solid #111; border-radius: 35px; background: #f8f4ee; padding: 3.25rem 1.15rem 1rem; box-shadow: 0 25px 38px rgba(0,0,0,.2); }
              .work-phone-island { position: absolute; top: 11px; left: 50%; width: 72px; height: 19px; border-radius: 999px; background: #111; transform: translateX(-50%); }.work-phone-kicker { display: block; margin-bottom: .2rem; color: #777; font-size: .55rem; letter-spacing: .15em; }.work-phone strong { display: block; font-size: 1.15rem; line-height: 1.05; }.work-phone-card { display: block; height: 67px; margin-top: 1rem; border-radius: 13px; }.work-phone-card--pink { background: #ff9db0; transform: rotate(-2deg); }.work-phone-card--yellow { margin-top: .55rem; background: #d7ff4f; transform: rotate(1deg); }.work-phone-pill { position: absolute; left: 1.15rem; right: 1.15rem; bottom: 1rem; padding: .55rem; border-radius: 999px; background: #111; color: white; font-size: .65rem; text-align: center; }
              .work-visual--phone { background: #9fc4ff; }
              .work-system { width: 82%; padding: 1.6rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; border-radius: 16px; background: #fff; box-shadow: 0 22px 38px rgba(0,0,0,.14); }.work-system-title { grid-column: 1/-1; margin-bottom: .5rem; font-weight: 800; }.work-swatch { aspect-ratio: 1.5; border-radius: 9px; }.work-swatch--a { background: #151515; }.work-swatch--b { background: #ff5c35; }.work-swatch--c { background: #d7ff4f; }.work-system-button { grid-column: span 1; padding: .55rem; border-radius: 999px; background: #151515; color: #fff; text-align: center; font-size: .65rem; font-weight: 750; }.work-system-input { grid-column: span 2; padding: .55rem .7rem; border: 1px solid #bbb; border-radius: 8px; color: #777; font-size: .65rem; }
              .work-visual--system { background: #ffc5d0; }
              .work-launch { position: relative; width: 270px; height: 270px; display: grid; place-items: center; }.work-orbit { position: absolute; inset: 6%; border: 1px solid rgba(255,255,255,.7); border-radius: 50%; }.work-orbit--two { inset: 22%; border-style: dashed; }.work-launch-mark { display: grid; place-items: center; width: 96px; height: 96px; border-radius: 26px; background: var(--work-lime); color: #111; font-size: 3.5rem; box-shadow: 13px 14px 0 rgba(0,0,0,.22); transform: rotate(-8deg); }.work-launch-copy { position: absolute; bottom: 0; color: white; font: 750 .7rem/1 ui-monospace, monospace; letter-spacing: .08em; }.work-visual--launch { background: #ff5c35; }
              .work-indie { position: relative; width: 82%; height: 72%; }.work-indie-window { position: absolute; display: flex; gap: 5px; padding: 13px; border: 2px solid #151515; border-radius: 12px; background: #fff; box-shadow: 10px 11px 0 #151515; }.work-indie-window i { width: 7px; height: 7px; border-radius: 50%; background: #ff5c35; }.work-indie-window--back { inset: 0 14% 22% 0; transform: rotate(-5deg); background: #d7ff4f; }.work-indie-window--front { inset: 20% 0 0 18%; transform: rotate(3deg); }.work-indie-window b { position: absolute; inset: 48% 0 auto; text-align: center; font-size: 1.15rem; }.work-indie-spark { position: absolute; right: -2%; top: -11%; font-size: 4rem; color: #ff5c35; }.work-visual--indie { background: #c7b8ff; }
              .work-outro { position: relative; padding: clamp(5rem, 12vw, 10rem) 0; }.work-outro > p { margin: 0 0 1rem; color: var(--muted); }.work-outro h2 { max-width: 820px; margin: 0 0 2.5rem; font-size: clamp(3rem, 8vw, 7rem); line-height: .9; letter-spacing: -.065em; }.work-contact-link, .contact-primary { display: inline-flex; align-items: center; gap: 1.25rem; padding: .9rem 1.15rem; border: 2px solid currentColor; border-radius: 999px; color: var(--fg); font-weight: 780; text-decoration: none; transition: transform .18s ease, box-shadow .18s ease; }.work-contact-link:hover, .contact-primary:hover { transform: translate(-3px,-3px); box-shadow: 6px 7px 0 var(--work-accent, #ff5c35); }.work-signoff { display: block; margin-top: 4rem; color: var(--muted); font-size: .78rem; }
              body[data-page="/contact"] { max-width: 850px; }.contact-page { min-height: 65vh; padding: clamp(3rem, 9vw, 7.5rem) 0; }.contact-page h2 { max-width: 760px; margin: 0; font-size: clamp(3.1rem, 9vw, 6.6rem); line-height: .9; letter-spacing: -.065em; }.contact-lede { max-width: 610px; margin: 2rem 0; color: var(--muted); font-size: 1.18rem; }.contact-actions { display: flex; flex-wrap: wrap; gap: .8rem; margin: .5rem 0 3rem; }.contact-primary { --work-accent: #ff5c35; }.contact-links { display: flex; flex-wrap: wrap; gap: .65rem 1.15rem; padding-top: 1.5rem; border-top: 1px solid var(--border); font-size: .86rem; }.contact-links span { width: 100%; color: var(--muted); }.contact-links a { color: var(--fg); }.contact-quiet { padding: 1rem; border: 1px dashed var(--border); color: var(--muted); }.contact-back { display: inline-block; margin-top: 5rem; color: var(--muted); font-size: .82rem; }
              @media (max-width: 760px) { .work-hero { grid-template-columns: 1fr; min-height: auto; }.work-sticker { width: 125px; }.work-chapter { grid-template-columns: 44px 1fr; min-height: 0; padding: 3.5rem 0; }.work-visual { grid-column: 2; min-height: 320px; }.work-rail span { width: 38px; height: 38px; }.work-rail::before { top: -3.5rem; bottom: -3.5rem; } }
              @media (max-width: 480px) { .work-hero h2 { font-size: clamp(3rem, 16vw, 5rem); }.work-chapter { grid-template-columns: 32px minmax(0,1fr); gap: 1rem; }.work-rail span { width: 30px; height: 30px; font-size: .6rem; }.work-visual { min-height: 280px; border-radius: 20px; }.work-phone { transform: scale(.82); }.work-outro h2 { font-size: 3.4rem; } }
              @media (max-width: 400px) {
                .book, .music { flex-direction: column; }
                .book img { width: 140px; }
                .music img.artwork { width: 140px; }
              }
              @media (max-width: 560px) {
                body { padding: 1.5rem 1.2rem 2rem; }
                header.site-header { gap: 0.55rem 1rem; margin-bottom: 2.25rem; }
                .site-header-left { width: 100%; }
                .site-header-right { align-items: flex-start; }
                .header-links { margin-top: -0.35rem; }
                .site-footer-profile { grid-template-columns: 1fr; }
                .site-footer-profile .site-profile-link-groups { justify-content: flex-start; }
                .site-footer-profile .site-profile-links { justify-content: flex-start; }
              }
              @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
              }
            `,
          }}
        />
        {usesCardsInteraction ? <style dangerouslySetInnerHTML={{ __html: cardsStyles }} /> : null}
        {usesCabinetInteraction ? <style dangerouslySetInnerHTML={{ __html: cabinetStyles }} /> : null}
        {theme === "washi" ? (
          // Washi keeps the classic templates but gives list pages their own
          // feed wrapper in render.ts, so it can be more composed than classic
          // without taking on the cards theme's JS overlay/detail machinery.
          <style
            dangerouslySetInnerHTML={{
              __html: `
                html[data-theme="washi"] {
                  --fg: #302b25; --bg: #f4eee3; --muted: #716757; --border: #d8c9ad; --focus: #9f402b;
                  --washi-paper: #fffaf1;
                  --washi-paper-warm: #faf1e2;
                  --washi-ink-soft: rgba(47, 42, 35, 0.12);
                  --washi-shadow: 0 1px 2px rgba(45, 31, 13, 0.07), 0 10px 28px rgba(45, 31, 13, 0.09);
                  --washi-shadow-hover: 0 2px 4px rgba(45, 31, 13, 0.09), 0 16px 36px rgba(45, 31, 13, 0.13);
                }
                @media (prefers-color-scheme: dark) {
                  html[data-theme="washi"] {
                    --fg: #e8e1d2; --bg: #1c1a15; --muted: #a89b83; --border: #3c362b; --focus: #dd8f6f;
                    --washi-paper: #272218;
                    --washi-paper-warm: #211d15;
                    --washi-ink-soft: rgba(232, 225, 210, 0.12);
                    --washi-shadow: 0 1px 2px rgba(0, 0, 0, 0.2), 0 14px 34px rgba(0, 0, 0, 0.24);
                    --washi-shadow-hover: 0 2px 5px rgba(0, 0, 0, 0.26), 0 20px 42px rgba(0, 0, 0, 0.3);
                  }
                }
                html[data-theme="washi"] body {
                  background-color: var(--bg);
                  background-image:
                    radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--focus) 6%, transparent), transparent 22rem),
                    linear-gradient(115deg, color-mix(in srgb, var(--washi-paper) 44%, transparent), transparent 42%),
                    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.035 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
                  background-repeat: repeat;
                  line-height: 1.65;
                  max-width: none;
                  padding: 0;
                }
                html[data-theme="washi"] main,
                html[data-theme="washi"] footer.site-footer {
                  width: min(100%, 1080px);
                  margin-left: auto;
                  margin-right: auto;
                  padding-left: 1.25rem;
                  padding-right: 1.25rem;
                }
                html[data-theme="washi"] header.site-header {
                  position: sticky;
                  top: 0;
                  z-index: 20;
                  width: 100%;
                  align-items: center;
                  margin-bottom: 2.25rem;
                  padding-left: max(1.25rem, calc((100vw - 1080px) / 2 + 1.25rem));
                  padding-right: max(1.25rem, calc((100vw - 1080px) / 2 + 1.25rem));
                  padding-top: 1.1rem;
                  padding-bottom: 0.9rem;
                  background: color-mix(in srgb, var(--bg) 92%, transparent);
                  backdrop-filter: blur(20px) saturate(1.08);
                  -webkit-backdrop-filter: blur(20px) saturate(1.08);
                  border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
                }
                html[data-theme="washi"] header.site-header h1 {
                  font-family: "Shippori Mincho", "Hiragino Mincho ProN", serif;
                  font-weight: 600; font-size: 1.42rem; letter-spacing: 0.015em;
                }
                html[data-theme="washi"] header.site-header h1 a {
                  display: inline-flex;
                  align-items: center;
                  gap: 0.58rem;
                }
                html[data-theme="washi"] header.site-header h1 a::before {
                  content: "";
                  width: 0.72rem;
                  height: 0.72rem;
                  border-radius: 2px;
                  background: var(--focus);
                  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15);
                  transform: rotate(-3deg);
                }
                html[data-theme="washi"] .site-tagline { max-width: 28rem; font-size: 0.82rem; }
                html[data-theme="washi"] .site-header-right {
                  gap: 0.55rem;
                }
                html[data-theme="washi"] nav {
                  gap: 0.25rem;
                  justify-content: flex-end;
                }
                html[data-theme="washi"] nav a {
                  border-radius: 999px;
                  padding: 0.34rem 0.72rem;
                  color: var(--muted);
                  transition: background 0.18s ease, color 0.18s ease;
                }
                html[data-theme="washi"] nav a:hover,
                html[data-theme="washi"] nav a:focus-visible {
                  background: color-mix(in srgb, var(--focus) 12%, transparent);
                  color: var(--fg);
                }
                html[data-theme="washi"] .category-filter-trigger {
                  background: color-mix(in srgb, var(--washi-paper) 92%, var(--bg));
                  border-color: color-mix(in srgb, var(--border) 78%, transparent);
                  box-shadow: 0 1px 2px rgba(45, 31, 13, 0.06);
                }
                html[data-theme="washi"] .category-filter-menu {
                  border-color: color-mix(in srgb, var(--border) 78%, transparent);
                  border-radius: 10px 6px 12px 5px;
                  background:
                    linear-gradient(150deg, color-mix(in srgb, var(--washi-paper) 96%, var(--bg)), var(--washi-paper-warm)),
                    var(--washi-paper);
                  box-shadow: var(--washi-shadow);
                }
                html[data-theme="washi"] .category-filter-menu a {
                  border-radius: 8px 4px 9px 4px;
                }
                html[data-theme="washi"] .header-links {
                  font-size: 0.8rem;
                }
                html[data-theme="washi"] .rss-link {
                  color: var(--muted);
                }
                html[data-theme="washi"] main {
                  padding-bottom: 1rem;
                }
                html[data-theme="washi"] .washi-feed {
                  display: grid;
                  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                  gap: 1.35rem;
                  align-items: start;
                }
                html[data-theme="washi"] .washi-feed > .card {
                  position: relative;
                  margin: 0;
                  padding: 1.3rem;
                  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
                  border-bottom-color: color-mix(in srgb, var(--border) 72%, transparent);
                  border-radius: 12px 7px 14px 6px;
                  background:
                    linear-gradient(150deg, color-mix(in srgb, var(--washi-paper) 96%, var(--bg)), var(--washi-paper-warm)),
                    var(--washi-paper);
                  box-shadow: var(--washi-shadow);
                  overflow: hidden;
                  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
                }
                html[data-theme="washi"] .washi-feed > .card::before {
                  content: "";
                  position: absolute;
                  inset: 0;
                  pointer-events: none;
                  background:
                    repeating-linear-gradient(90deg, transparent 0, transparent 18px, var(--washi-ink-soft) 19px, transparent 20px),
                    repeating-linear-gradient(0deg, transparent 0, transparent 22px, rgba(255, 255, 255, 0.1) 23px, transparent 24px);
                  opacity: 0.11;
                  mix-blend-mode: multiply;
                }
                @media (prefers-color-scheme: dark) {
                  html[data-theme="washi"] .washi-feed > .card::before { mix-blend-mode: screen; opacity: 0.08; }
                }
                @media (hover: hover) and (pointer: fine) {
                  html[data-theme="washi"] .washi-feed > .card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--washi-shadow-hover);
                    border-color: color-mix(in srgb, var(--focus) 24%, var(--border));
                  }
                }
                html[data-theme="washi"] .washi-feed > .card > * {
                  position: relative;
                  z-index: 1;
                }
                html[data-theme="washi"] h1,
                html[data-theme="washi"] h2,
                html[data-theme="washi"] h3 {
                  text-wrap: balance;
                }
                html[data-theme="washi"] .body-content h2,
                html[data-theme="washi"] .body-content h3,
                html[data-theme="washi"] article > h1,
                html[data-theme="washi"] article > h2,
                html[data-theme="washi"] .card h2,
                html[data-theme="washi"] .about-product h2,
                html[data-theme="washi"] .faq-entry h3,
                html[data-theme="washi"] .release-date {
                  font-family: "Shippori Mincho", "Hiragino Mincho ProN", serif;
                  font-weight: 600; letter-spacing: 0.02em;
                }
                html[data-theme="washi"] .card h2,
                html[data-theme="washi"] article > h1 {
                  margin-top: 0;
                  line-height: 1.22;
                }
                html[data-theme="washi"] .card h2 {
                  font-size: 1.32rem;
                }
                html[data-theme="washi"] article > h1 {
                  font-size: clamp(1.9rem, 4vw, 2.75rem);
                  max-width: 760px;
                }
                html[data-theme="washi"] .meta {
                  color: var(--muted);
                  font-size: 0.76rem;
                  letter-spacing: 0.025em;
                }
                html[data-theme="washi"] .washi-feed > .card > .body-content:first-child {
                  font-family: "Shippori Mincho", "Hiragino Mincho ProN", serif;
                  font-size: 1.08rem; line-height: 1.72; letter-spacing: 0.005em;
                }
                html[data-theme="washi"] a.title-link:hover {
                  text-decoration-thickness: 0.08em;
                  text-underline-offset: 0.18em;
                }
                html[data-theme="washi"] .quote-text {
                  position: relative;
                  margin: 0 0 1rem;
                  padding: 1.45rem 1.35rem 1.1rem;
                  border: 1px solid var(--border);
                  border-left: 3px solid var(--focus);
                  border-radius: 4px;
                  background:
                    repeating-linear-gradient(to bottom, transparent 0, transparent 1.75rem, color-mix(in srgb, var(--border) 35%, transparent) calc(1.75rem + 1px), transparent calc(1.75rem + 2px)),
                    color-mix(in srgb, var(--washi-paper) 92%, var(--bg));
                  box-shadow: 0 8px 20px rgba(45, 31, 13, 0.08);
                }
                html[data-theme="washi"] .quote-text p {
                  font-family: "Shippori Mincho", "Hiragino Mincho ProN", serif;
                  font-weight: 400; letter-spacing: 0.01em;
                  font-size: 1.22rem;
                }
                html[data-theme="washi"] .book,
                html[data-theme="washi"] .music {
                  gap: 1.2rem;
                  align-items: flex-start;
                }
                html[data-theme="washi"] .book img {
                  width: 116px;
                }
                html[data-theme="washi"] .music img.artwork {
                  width: 112px;
                }
                html[data-theme="washi"] .washi-feed .book,
                html[data-theme="washi"] .washi-feed .music { gap: 1rem; }
                html[data-theme="washi"] .washi-feed .book img,
                html[data-theme="washi"] .washi-feed .music img.artwork { width: 96px; }
                html[data-theme="washi"] .music-links a,
                html[data-theme="washi"] .meta a {
                  display: inline-flex;
                  align-items: center;
                  min-height: 1.85rem;
                  margin-bottom: 0.25rem;
                  border-radius: 999px;
                  padding: 0.18rem 0.58rem;
                  background: color-mix(in srgb, var(--focus) 10%, transparent);
                  text-decoration: none;
                }
                html[data-theme="washi"] .meta a:hover,
                html[data-theme="washi"] .meta a:focus-visible,
                html[data-theme="washi"] .music-links a:hover,
                html[data-theme="washi"] .music-links a:focus-visible {
                  background: color-mix(in srgb, var(--focus) 18%, transparent);
                }
                html[data-theme="washi"] .card img,
                html[data-theme="washi"] .body-content img,
                html[data-theme="washi"] .article-detail-cover,
                html[data-theme="washi"] .book img,
                html[data-theme="washi"] .music img.artwork {
                  border-radius: 4px 2px 5px 2px;
                  outline: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
                  outline-offset: -1px;
                  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12), 0 10px 24px rgba(45, 31, 13, 0.14);
                }
                html[data-theme="washi"] .washi-feed > .card:not(.book):not(.music) > a:first-child img,
                html[data-theme="washi"] .washi-feed > .card:not(.book):not(.music) > img:first-child {
                  display: block;
                  width: calc(100% + 2.6rem);
                  max-width: none;
                  margin: -1.3rem -1.3rem 1.05rem;
                  aspect-ratio: 4 / 3;
                  object-fit: cover;
                  border-radius: 9px 5px 0 0;
                  outline: 0;
                  box-shadow: none;
                }
                html[data-theme="washi"] .exif {
                  border-top-style: dashed;
                }
                html[data-theme="washi"] footer.site-footer {
                  margin-top: 3.25rem;
                  padding-top: 1.25rem;
                  padding-bottom: 2rem;
                }
                @media (max-width: 720px) {
                  html[data-theme="washi"] header.site-header {
                    position: static;
                    align-items: flex-start;
                    padding-left: 1.25rem;
                    padding-right: 1.25rem;
                  }
                  html[data-theme="washi"] .site-header-right {
                    align-items: flex-start;
                  }
                  html[data-theme="washi"] nav {
                    justify-content: flex-start;
                  }
                  html[data-theme="washi"] .washi-feed {
                    grid-template-columns: 1fr;
                  }
                }
                @media (max-width: 400px) {
                  html[data-theme="washi"] .book img,
                  html[data-theme="washi"] .music img.artwork {
                    width: min(68vw, 180px);
                  }
                }
              `,
            }}
          />
        ) : null}
        {theme === "prism" ? (
          // Prism is an original bright/rounded restyle of the cards theme:
          // same animated feed/detail interaction, with brighter surfaces,
          // saturated accents, and friendly system typography.
          <style
            dangerouslySetInnerHTML={{
              __html: `
                html[data-theme="prism"] {
                  color-scheme: light;
                  --fg: #17181d; --bg: #f7f8fc; --muted: #626878; --border: #dfe3ed; --focus: #5151d8;
                  --prism-pink: #d92c78;
                  --prism-cyan: #0789aa;
                  --prism-yellow: #e5b63f;
                  --prism-surface: #ffffff;
                  --prism-surface-soft: #f1f3fa;
                  --prism-shadow: 0 1px 2px rgba(38, 45, 64, 0.07), 0 10px 28px rgba(38, 45, 64, 0.09);
                  --prism-shadow-hover: 0 2px 4px rgba(38, 45, 64, 0.09), 0 16px 36px rgba(38, 45, 64, 0.13);
                }
                @media (prefers-color-scheme: dark) {
                  html[data-theme="prism"] {
                    color-scheme: dark;
                    --fg: #f4f7ff; --bg: #101321; --muted: #a9b1c7; --border: #2c3348; --focus: #8d8dff;
                    --prism-pink: #ff5aa5;
                    --prism-cyan: #4bd8ff;
                    --prism-yellow: #ffd86b;
                    --prism-surface: #181d2f;
                    --prism-surface-soft: #202842;
                    --prism-shadow: 0 1px 2px rgba(0, 0, 0, 0.22), 0 16px 38px rgba(0, 0, 0, 0.26);
                    --prism-shadow-hover: 0 2px 4px rgba(0, 0, 0, 0.28), 0 22px 48px rgba(0, 0, 0, 0.32);
                  }
                }
                html[data-theme="prism"] body {
                  max-width: none;
                  margin: 0;
                  padding: 0;
                  font-family: ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif;
                  background-color: var(--bg);
                  background-image:
                    linear-gradient(180deg, color-mix(in srgb, var(--focus) 5%, transparent), transparent 22rem),
                    radial-gradient(circle at 88% 8%, color-mix(in srgb, var(--prism-pink) 9%, transparent), transparent 19rem),
                    radial-gradient(circle at 12% 28%, color-mix(in srgb, var(--prism-cyan) 7%, transparent), transparent 20rem);
                  line-height: 1.6;
                }
                html[data-theme="prism"] header.site-header,
                html[data-theme="prism"] main,
                html[data-theme="prism"] footer.site-footer {
                  width: min(100%, 1120px);
                  margin-left: auto;
                  margin-right: auto;
                  padding-left: 1.25rem;
                  padding-right: 1.25rem;
                }
                html[data-theme="prism"] header.site-header {
                  align-items: center;
                  margin-bottom: 2.4rem;
                  padding-top: 1.1rem;
                  padding-bottom: 1rem;
                }
                html[data-theme="prism"] header.site-header h1 {
                  font-size: 1.48rem;
                  font-weight: 740;
                  letter-spacing: -0.025em;
                }
                html[data-theme="prism"] header.site-header h1 a {
                  position: relative;
                  display: inline-flex;
                  align-items: center;
                  color: var(--focus);
                }
                html[data-theme="prism"] header.site-header h1 a::after {
                  content: "";
                  position: absolute;
                  left: 0;
                  width: 2.8rem;
                  bottom: -0.3rem;
                  height: 0.14rem;
                  border-radius: 999px;
                  background: linear-gradient(90deg, var(--focus), var(--prism-pink), var(--prism-yellow));
                }
                html[data-theme="prism"] .site-tagline { max-width: 30rem; font-size: 0.84rem; }
                html[data-theme="prism"] .site-header-right {
                  gap: 0.55rem;
                }
                html[data-theme="prism"] .header-links {
                  font-size: 0.8rem;
                }
                html[data-theme="prism"] nav {
                  gap: 0.35rem;
                  justify-content: flex-end;
                }
                html[data-theme="prism"] nav a,
                html[data-theme="prism"] .rss-link,
                html[data-theme="prism"] .link-btn-reset {
                  border-radius: 999px;
                }
                html[data-theme="prism"] nav a {
                  padding: 0.34rem 0.72rem;
                  background: color-mix(in srgb, var(--prism-surface) 74%, transparent);
                  color: var(--muted);
                  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border) 72%, transparent);
                  transition: transform 0.16s ease, color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
                }
                html[data-theme="prism"] nav a:hover,
                html[data-theme="prism"] nav a:focus-visible {
                  transform: translateY(-1px);
                  background: var(--prism-surface);
                  color: var(--fg);
                  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--focus) 30%, var(--border)), 0 6px 16px rgba(66, 66, 250, 0.12);
                }
                html[data-theme="prism"] main {
                  padding-bottom: 1rem;
                }
                body.theme-prism main {
                  max-width: 1120px;
                  margin: 0 auto;
                  padding: 1.25rem 1.25rem 2rem;
                }
                body.theme-prism header.site-header {
                  max-width: 1120px;
                  margin: 0 auto;
                  padding: 1.1rem 1.25rem 0;
                }
                body.theme-prism footer.site-footer {
                  max-width: 1120px;
                  margin: 0 auto;
                  padding: 1.5rem 1.25rem 2rem;
                  border-top: 1px solid var(--border);
                }
                body.theme-prism .cards-feed {
                  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
                  gap: 1.2rem;
                }
                body.theme-prism .cards-item {
                  border-radius: 18px;
                  background: var(--prism-surface);
                  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
                  background: linear-gradient(180deg, var(--prism-surface), color-mix(in srgb, var(--prism-surface-soft) 34%, var(--prism-surface)));
                  box-shadow: var(--prism-shadow);
                  -webkit-tap-highlight-color: transparent;
                  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
                }
                body.theme-prism .cards-item::before {
                  content: "";
                  position: absolute;
                  inset: 0 0 auto;
                  z-index: 3;
                  height: 0.2rem;
                  background: linear-gradient(90deg, var(--focus), var(--prism-pink), var(--prism-cyan));
                }
                @media (hover: hover) and (pointer: fine) {
                  body.theme-prism .cards-item:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--prism-shadow-hover);
                    border-color: color-mix(in srgb, var(--focus) 26%, var(--border));
                  }
                }
                html[data-theme="prism"] h1,
                html[data-theme="prism"] h2,
                html[data-theme="prism"] h3 {
                  font-weight: 740;
                  letter-spacing: -0.018em;
                  text-wrap: balance;
                }
                html[data-theme="prism"] article > h1 {
                  margin: 0 0 0.65rem;
                  max-width: 760px;
                  font-size: clamp(2rem, 4vw, 3rem);
                  line-height: 1.08;
                }
                html[data-theme="prism"] .card h2 {
                  margin-top: 0.25rem;
                  font-size: 1.35rem;
                  line-height: 1.22;
                }
                body.theme-prism .cards-feed .cards-hero {
                  aspect-ratio: 16 / 10;
                }
                body.theme-prism .cards-item[data-cards-type="music"] .cards-hero {
                  display: grid;
                  grid-template-columns: minmax(7.25rem, 34%) minmax(0, 1fr);
                  min-height: 9.25rem;
                  aspect-ratio: auto;
                  background:
                    linear-gradient(135deg, color-mix(in srgb, var(--prism-pink) 10%, transparent), transparent 52%),
                    linear-gradient(180deg, var(--prism-surface), color-mix(in srgb, var(--prism-surface-soft) 46%, var(--prism-surface)));
                }
                body.theme-prism .cards-item[data-cards-type="music"] .cards-hero img {
                  position: static;
                  width: 100%;
                  height: 100%;
                  min-height: 9.25rem;
                  aspect-ratio: 1 / 1;
                  object-fit: cover;
                  border-right: 1px solid color-mix(in srgb, var(--prism-pink) 22%, var(--border));
                  box-shadow: 8px 0 24px rgba(230, 0, 103, 0.1);
                }
                body.theme-prism .cards-item[data-cards-type="music"] .cards-scrim {
                  display: none;
                }
                body.theme-prism .cards-item[data-cards-type="music"] .cards-caption {
                  position: static;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  min-width: 0;
                  padding: 1rem 1.1rem;
                  color: var(--fg);
                }
                body.theme-prism .cards-item[data-cards-type="music"] .cards-eyebrow {
                  width: fit-content;
                  margin-bottom: 0.42rem;
                  border-radius: 999px;
                  padding: 0.26rem 0.62rem;
                  background: color-mix(in srgb, var(--prism-pink) 12%, var(--prism-surface));
                  color: var(--prism-pink);
                  text-shadow: none;
                }
                body.theme-prism .cards-item[data-cards-type="music"] .cards-eyebrow::before {
                  content: "▶";
                  margin-right: 0.36rem;
                  font-size: 0.72em;
                }
                body.theme-prism .cards-item[data-cards-type="music"] .cards-title {
                  color: var(--fg);
                  text-shadow: none;
                  font-size: 1.32rem;
                  line-height: 1.12;
                  -webkit-line-clamp: 2;
                }
                body.theme-prism .cards-item[data-cards-type="music"] .cards-subtitle {
                  color: var(--muted);
                  text-shadow: none;
                  font-weight: 620;
                  -webkit-line-clamp: 2;
                }
                body.theme-prism .cards-item[data-cards-type="book"] .cards-hero {
                  grid-template-columns: minmax(7.25rem, 34%) minmax(0, 1fr);
                  gap: 0;
                  height: 10.25rem;
                  min-height: 10.25rem;
                  aspect-ratio: auto;
                  padding: 0;
                  background: linear-gradient(180deg, var(--prism-surface), color-mix(in srgb, var(--prism-surface-soft) 46%, var(--prism-surface)));
                }
                body.theme-prism .cards-item[data-cards-type="book"] .cards-hero::before {
                  width: 34%;
                  background: linear-gradient(135deg, color-mix(in srgb, var(--prism-yellow) 30%, var(--prism-surface)), color-mix(in srgb, var(--prism-pink) 10%, var(--prism-surface)));
                  opacity: 1;
                }
                body.theme-prism .cards-item[data-cards-type="book"] .cards-hero img {
                  width: auto;
                  max-width: min(5.15rem, calc(100% - 1.7rem));
                  height: auto;
                  max-height: calc(100% - 1.15rem);
                  border-radius: 4px 8px 8px 4px;
                  box-shadow:
                    -0.42rem 0 0 color-mix(in srgb, var(--prism-pink) 34%, transparent),
                    0 1px 2px rgba(38, 45, 64, 0.14),
                    0 16px 34px rgba(66, 66, 250, 0.16);
                }
                body.theme-prism .cards-item[data-cards-type="book"] .cards-eyebrow {
                  border-radius: 999px;
                  background: color-mix(in srgb, var(--prism-yellow) 24%, var(--prism-surface));
                  color: color-mix(in srgb, #7a4b00 74%, var(--fg));
                  font-weight: 760;
                }
                body.theme-prism .cards-item[data-cards-type="book"] .cards-eyebrow::before {
                  content: "";
                  display: inline-block;
                  width: 0.42rem;
                  height: 0.82rem;
                  margin-right: 0.36rem;
                  border-radius: 1px 3px 3px 1px;
                  background: currentColor;
                  vertical-align: -0.12em;
                }
                body.theme-prism .cards-item[data-cards-type="book"] .cards-title {
                  color: var(--fg);
                  font-family: inherit;
                  font-size: 1.24rem;
                  line-height: 1.14;
                  font-weight: 740;
                  -webkit-line-clamp: 2;
                  text-shadow: none;
                }
                body.theme-prism .cards-item[data-cards-type="book"] .cards-subtitle {
                  color: var(--muted);
                  text-shadow: none;
                }
                body.theme-prism .cards-item[data-cards-type="book"] .cards-rating {
                  color: color-mix(in srgb, var(--prism-yellow) 64%, #a16207);
                }
                body.theme-prism .cards-scrim {
                  background: linear-gradient(to top, rgba(10, 12, 16, 0.78) 0%, rgba(10, 12, 16, 0.34) 48%, rgba(10, 12, 16, 0) 76%);
                }
                body.theme-prism .cards-caption {
                  padding: 1.1rem 1.25rem 1.2rem;
                }
                body.theme-prism .cards-eyebrow,
                body.theme-prism .cards-photo-eyebrow,
                body.theme-prism .cards-book-eyebrow,
                body.theme-prism .cards-music-eyebrow {
                  color: color-mix(in srgb, var(--prism-yellow) 82%, white);
                  font-weight: 730;
                }
                body.theme-prism .cards-title,
                body.theme-prism .cards-photo-title,
                body.theme-prism .cards-book-title,
                body.theme-prism .cards-music-title {
                  font-weight: 760;
                  letter-spacing: -0.018em;
                }
                body.theme-prism .cards-text-card {
                  padding: 1.5rem 1.35rem 1.25rem;
                  background: transparent;
                }
                body.theme-prism .cards-text-badge {
                  background: color-mix(in srgb, var(--cards-accent) 14%, var(--prism-surface));
                  color: color-mix(in srgb, var(--cards-accent) 86%, var(--fg));
                  font-weight: 730;
                }
                body.theme-prism .cards-text-title {
                  font-size: 1.22rem;
                  font-weight: 680;
                  line-height: 1.42;
                }
                body.theme-prism .cards-text-subtitle,
                body.theme-prism .cards-text-date,
                body.theme-prism .cards-photo-subtitle,
                body.theme-prism .cards-photo-date,
                body.theme-prism .cards-book-author,
                body.theme-prism .cards-book-date,
                body.theme-prism .cards-music-artist,
                body.theme-prism .cards-music-date {
                  color: var(--muted);
                }
                body.theme-prism .cards-quote-card {
                  background:
                    linear-gradient(135deg, color-mix(in srgb, var(--prism-pink) 10%, transparent), transparent 45%),
                    var(--prism-surface);
                  border: 1px solid color-mix(in srgb, var(--prism-pink) 26%, var(--border));
                  border-left: 0;
                  border-radius: 16px;
                  box-shadow: inset 0.22rem 0 0 var(--prism-pink), 0 8px 22px color-mix(in srgb, var(--prism-pink) 7%, transparent);
                  transform: none;
                }
                body.theme-prism .cards-item--quote:hover .cards-quote-card {
                  transform: translateY(-2px);
                }
                body.theme-prism .cards-quote-badge {
                  background: color-mix(in srgb, var(--prism-pink) 12%, var(--prism-surface));
                  color: var(--prism-pink);
                  font-family: ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif;
                  font-weight: 730;
                }
                body.theme-prism .cards-quote-text,
                body.theme-prism .cards-quote-author {
                  font-family: ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif;
                  color: var(--fg);
                  text-transform: none;
                  letter-spacing: 0;
                }
                body.theme-prism .cards-quote-text {
                  font-size: 1.16rem;
                  font-weight: 650;
                  line-height: 1.48;
                }
                body.theme-prism .cards-quote-author,
                body.theme-prism .cards-quote-date {
                  color: var(--muted);
                }
                body.theme-prism .cards-detail-header:not(.cards-detail-header--text):not(.cards-detail-header--photo) {
                  border-radius: 20px;
                }
                body.theme-prism .cards-detail-header--text .cards-text-card,
                body.theme-prism .cards-detail-header--quote .cards-quote-card {
                  border-radius: 18px;
                  box-shadow: var(--prism-shadow);
                }
                body.theme-prism .cards-book-cover,
                body.theme-prism .cards-music-artwork,
                body.theme-prism .cards-photo-card:not(.cards-photo-card--full) .cards-photo-image {
                  border-radius: 12px;
                }
                body.theme-prism .cards-filter-trigger,
                body.theme-prism .cards-filter-menu {
                  background: color-mix(in srgb, var(--prism-surface) 84%, transparent);
                }
                body.theme-prism .cards-filter-menu a {
                  background: transparent;
                  box-shadow: none;
                  transform: none;
                }
                body.theme-prism .cards-filter-menu a:hover,
                body.theme-prism .cards-filter-menu a:focus-visible {
                  background: color-mix(in srgb, var(--focus) 10%, var(--prism-surface));
                  box-shadow: none;
                  transform: none;
                }
                body.theme-prism .cards-filter-menu a[aria-current="page"] {
                  color: var(--prism-pink);
                  background: color-mix(in srgb, var(--prism-pink) 12%, var(--prism-surface));
                }
                html[data-theme="prism"] .body-content h2 {
                  margin-top: 2rem;
                  font-size: 1.45rem;
                }
                html[data-theme="prism"] .body-content h3 {
                  font-size: 1.16rem;
                }
                html[data-theme="prism"] a {
                  color: var(--focus);
                  text-decoration-thickness: 0.09em;
                  text-underline-offset: 0.18em;
                }
                html[data-theme="prism"] a.title-link {
                  color: inherit;
                }
                html[data-theme="prism"] a.title-link:hover {
                  color: var(--focus);
                  text-decoration-color: var(--prism-pink);
                }
                html[data-theme="prism"] .meta {
                  color: var(--muted);
                  font-size: 0.84rem;
                }
                html[data-theme="prism"] .quote-text {
                  margin: 0 0 1rem;
                  padding: 1.35rem;
                  border: 1px solid color-mix(in srgb, var(--prism-pink) 26%, var(--border));
                  border-left: 0;
                  border-radius: 16px;
                  background:
                    linear-gradient(135deg, color-mix(in srgb, var(--prism-pink) 10%, transparent), transparent 45%),
                    var(--prism-surface);
                  box-shadow: inset 0.22rem 0 0 var(--prism-pink), 0 8px 22px color-mix(in srgb, var(--prism-pink) 7%, transparent);
                }
                html[data-theme="prism"] .quote-text p {
                  font-size: 1.17rem;
                  font-style: normal;
                  font-weight: 650;
                  line-height: 1.48;
                }
                html[data-theme="prism"] .quote-text footer {
                  color: var(--muted);
                }
                html[data-theme="prism"] .book,
                html[data-theme="prism"] .music {
                  gap: 1.15rem;
                  align-items: flex-start;
                }
                html[data-theme="prism"] .book img {
                  width: 112px;
                }
                html[data-theme="prism"] .music img.artwork {
                  width: 112px;
                }
                html[data-theme="prism"] .card img,
                html[data-theme="prism"] .body-content img,
                html[data-theme="prism"] .book img,
                html[data-theme="prism"] .music img.artwork {
                  border-radius: 12px;
                  box-shadow: 0 1px 2px rgba(38, 45, 64, 0.12), 0 10px 24px rgba(38, 45, 64, 0.14);
                }
                html[data-theme="prism"] .music-links,
                html[data-theme="prism"] .meta {
                  gap: 0.45rem;
                }
                html[data-theme="prism"] .music-links a,
                html[data-theme="prism"] .meta a {
                  display: inline-flex;
                  align-items: center;
                  min-height: 2.75rem;
                  margin-right: 0.2rem;
                  margin-bottom: 0.25rem;
                  border-radius: 999px;
                  padding: 0.42rem 0.72rem;
                  background: color-mix(in srgb, var(--focus) 10%, var(--prism-surface));
                  text-decoration: none;
                  font-weight: 650;
                }
                html[data-theme="prism"] .music-link-icon {
                  color: white;
                  background: var(--prism-pink);
                  box-shadow: 0 1px 2px rgba(66, 66, 250, 0.14), 0 8px 18px rgba(230, 0, 103, 0.22);
                }
                html[data-theme="prism"] .meta a:hover,
                html[data-theme="prism"] .meta a:focus-visible,
                html[data-theme="prism"] .music-links a:hover,
                html[data-theme="prism"] .music-links a:focus-visible {
                  background: color-mix(in srgb, var(--prism-pink) 12%, var(--prism-surface));
                  color: var(--fg);
                }
                html[data-theme="prism"] .exif {
                  border-top-color: color-mix(in srgb, var(--focus) 24%, var(--border));
                }
                html[data-theme="prism"] .exif-row dt {
                  color: color-mix(in srgb, var(--focus) 70%, var(--muted));
                }
                html[data-theme="prism"] footer.site-footer {
                  margin-top: 3.25rem;
                  padding-top: 1.25rem;
                  padding-bottom: 2rem;
                }
                @media (max-width: 720px) {
                  html[data-theme="prism"] header.site-header {
                    align-items: flex-start;
                  }
                  html[data-theme="prism"] .site-header-right {
                    align-items: flex-start;
                  }
                  html[data-theme="prism"] nav {
                    justify-content: flex-start;
                  }
                  body.theme-prism .cards-feed {
                    grid-template-columns: 1fr;
                  }
                  body.theme-prism .cards-item[data-cards-type="music"] .cards-hero {
                    grid-template-columns: 7rem minmax(0, 1fr);
                    min-height: 7rem;
                  }
                  body.theme-prism .cards-item[data-cards-type="music"] .cards-hero img {
                    min-height: 7rem;
                  }
                  body.theme-prism .cards-item[data-cards-type="music"] .cards-title {
                    font-size: 1.18rem;
                  }
                  body.theme-prism .cards-item[data-cards-type="book"] .cards-hero {
                    grid-template-columns: 7rem minmax(0, 1fr);
                    height: 8.75rem;
                    min-height: 8.75rem;
                    padding: 0;
                  }
                  body.theme-prism .cards-item[data-cards-type="book"] .cards-hero::before {
                    width: 7rem;
                  }
                  body.theme-prism .cards-item[data-cards-type="book"] .cards-hero img {
                    width: auto;
                    max-width: min(4.65rem, calc(100% - 1.45rem));
                    height: auto;
                    max-height: calc(100% - 1.05rem);
                  }
                  body.theme-prism .cards-item[data-cards-type="book"] .cards-title {
                    font-size: 1.04rem;
                    line-height: 1.08;
                  }
                }
                @media (max-width: 400px) {
                  html[data-theme="prism"] .book img,
                  html[data-theme="prism"] .music img.artwork {
                    width: min(68vw, 170px);
                  }
                }
              `,
            }}
          />
        ) : null}
        {theme === "ledger" ? (
          // Ledger reuses the cards renderer but tones it into a composed
          // index: rows with clear type labels, separators, and a push-style
          // detail transition instead of expanding-card motion.
          <style
            dangerouslySetInnerHTML={{
              __html: `
                html[data-theme="ledger"] {
                  --fg: #1d1d1f; --bg: #f5f5f7; --muted: #6e6e73; --border: #d2d2d7; --focus: #06c;
                  --ledger-surface: #ffffff;
                  --ledger-raised: #ececf0;
                  --ledger-separator: #e1e1e6;
                  --ledger-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 26px rgba(15, 23, 42, 0.06);
                }
                @media (prefers-color-scheme: dark) {
                  html[data-theme="ledger"] {
                    --fg: #f5f5f7; --bg: #101012; --muted: #a1a1a6; --border: #3a3a3c; --focus: #2997ff;
                    --ledger-surface: #1c1c1e;
                    --ledger-raised: #2c2c2e;
                    --ledger-separator: #38383a;
                    --ledger-shadow: 0 1px 2px rgba(0, 0, 0, 0.26), 0 14px 34px rgba(0, 0, 0, 0.28);
                  }
                }
                html[data-theme="ledger"] body {
                  max-width: none;
                  margin: 0;
                  padding: 0;
                  background:
                    linear-gradient(180deg, color-mix(in srgb, var(--ledger-raised) 42%, var(--bg)), var(--bg) 16rem),
                    var(--bg);
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif;
                  line-height: 1.55;
                }
                body.theme-ledger main,
                body.theme-ledger footer.site-footer {
                  max-width: 880px;
                }
                body.theme-ledger header.site-header {
                  position: sticky;
                  top: 0;
                  z-index: 50;
                  width: 100%; max-width: none;
                  padding-top: max(0.75rem, env(safe-area-inset-top));
                  padding-right: max(1.25rem, calc((100vw - 880px) / 2 + 1.25rem));
                  padding-bottom: 0.75rem;
                  padding-left: max(1.25rem, calc((100vw - 880px) / 2 + 1.25rem));
                  margin-bottom: 0;
                  align-items: center;
                  background: color-mix(in srgb, var(--bg) 88%, transparent);
                  border-bottom: 1px solid color-mix(in srgb, var(--ledger-separator) 82%, transparent);
                  backdrop-filter: blur(18px) saturate(1.15);
                  -webkit-backdrop-filter: blur(18px) saturate(1.15);
                }
                body.theme-ledger header.site-header h1 {
                  font-size: 1.16rem;
                  font-weight: 680;
                  letter-spacing: -0.025em;
                }
                body.theme-ledger .site-tagline { display: none; }
                body.theme-ledger .site-header-left {
                  flex-direction: row;
                  align-items: center;
                  gap: 0.8rem;
                }
                body.theme-ledger .header-links {
                  font-size: 0.76rem;
                  margin: 0;
                }
                body.theme-ledger main {
                  padding-top: 1.35rem;
                }
                body.theme-ledger .cards-feed {
                  display: grid;
                  grid-template-columns: 1fr;
                  gap: 0;
                  border: 1px solid var(--ledger-separator);
                  border-radius: 14px;
                  background: var(--ledger-surface);
                  box-shadow: var(--ledger-shadow);
                  overflow: hidden;
                }
                body.theme-ledger .cards-item {
                  display: block;
                  border-radius: 0;
                  background: var(--ledger-surface);
                  box-shadow: none;
                  border: 0;
                  border-bottom: 1px solid var(--ledger-separator);
                  min-height: 7rem;
                  transition: background 0.16s ease;
                }
                body.theme-ledger .cards-item:last-child {
                  border-bottom: 0;
                }
                body.theme-ledger .cards-item:hover {
                  transform: none;
                  box-shadow: none;
                  background: color-mix(in srgb, var(--focus) 5%, var(--ledger-surface));
                }
                body.theme-ledger .cards-item:focus-visible {
                  outline: 2px solid var(--focus);
                  outline-offset: -2px;
                }
                body.theme-ledger .cards-hero {
                  display: grid;
                  grid-template-columns: 7.4rem minmax(0, 1fr);
                  align-items: stretch;
                  min-height: 6.8rem;
                  aspect-ratio: auto;
                  background: var(--ledger-surface);
                }
                body.theme-ledger .cards-hero img {
                  position: static;
                  width: 7.4rem;
                  height: 100%;
                  min-height: 6.8rem;
                  object-fit: cover;
                  border-right: 1px solid var(--ledger-separator);
                }
                body.theme-ledger .cards-scrim {
                  display: none;
                }
                body.theme-ledger .cards-caption {
                  position: static;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  min-width: 0;
                  padding: 1rem 2.65rem 1rem 1.15rem;
                  color: var(--fg);
                }
                body.theme-ledger .cards-eyebrow,
                body.theme-ledger .cards-photo-eyebrow,
                body.theme-ledger .cards-book-eyebrow,
                body.theme-ledger .cards-music-eyebrow,
                body.theme-ledger .cards-link-eyebrow {
                  width: fit-content;
                  margin: 0 0 0.35rem;
                  padding: 0;
                  border-radius: 0;
                  background: transparent;
                  color: color-mix(in srgb, var(--focus) 78%, var(--fg));
                  font-family: ui-monospace, "SF Mono", "SFMono-Regular", Menlo, monospace;
                  font-size: 0.64rem;
                  font-weight: 650;
                  letter-spacing: 0.07em;
                  text-transform: uppercase;
                  text-shadow: none;
                }
                body.theme-ledger .cards-title,
                body.theme-ledger .cards-photo-title,
                body.theme-ledger .cards-book-title,
                body.theme-ledger .cards-music-title,
                body.theme-ledger .cards-link-title {
                  color: var(--fg);
                  font-size: 1.06rem;
                  line-height: 1.3;
                  font-weight: 650;
                  letter-spacing: -0.012em;
                  text-shadow: none;
                }
                body.theme-ledger .cards-subtitle,
                body.theme-ledger .cards-photo-subtitle,
                body.theme-ledger .cards-book-author,
                body.theme-ledger .cards-music-artist,
                body.theme-ledger .cards-link-excerpt {
                  margin-top: 0.35rem;
                  color: var(--muted);
                  font-size: 0.9rem;
                  line-height: 1.42;
                  text-shadow: none;
                }
                body.theme-ledger .cards-caption-action,
                body.theme-ledger .cards-text-action {
                  display: none;
                }
                body.theme-ledger .cards-text-card,
                body.theme-ledger .cards-link-card {
                  min-height: 7rem;
                  padding: 1rem 2.75rem 1rem 1.15rem;
                  background: transparent;
                  border: 0;
                  border-radius: 0;
                  box-shadow: none;
                }
                body.theme-ledger .cards-feed > .cards-link-card {
                  border-bottom: 1px solid var(--ledger-separator);
                }
                body.theme-ledger .cards-feed > .cards-link-card:last-child {
                  border-bottom: 0;
                }
                body.theme-ledger .cards-link-card::before {
                  display: none;
                }
                body.theme-ledger .cards-text-badge,
                body.theme-ledger .cards-quote-badge {
                  border-radius: 0;
                  padding: 0;
                  background: transparent;
                  font-family: ui-monospace, "SF Mono", "SFMono-Regular", Menlo, monospace;
                  font-size: 0.64rem;
                  font-weight: 650;
                  letter-spacing: 0.07em;
                }
                body.theme-ledger .cards-text-title,
                body.theme-ledger .cards-quote-text {
                  font-family: inherit;
                  color: var(--fg);
                  font-size: 1.03rem;
                  line-height: 1.42;
                  font-weight: 560;
                  letter-spacing: -0.01em;
                  text-transform: none;
                }
                body.theme-ledger .cards-text-subtitle,
                body.theme-ledger .cards-text-date,
                body.theme-ledger .cards-quote-author,
                body.theme-ledger .cards-quote-date,
                body.theme-ledger .cards-link-date {
                  color: var(--muted);
                }
                body.theme-ledger .cards-quote-card {
                  padding: 1rem 2.75rem 1rem 1.15rem;
                  background: transparent;
                  border-radius: 0;
                  box-shadow: none;
                  transform: none;
                }
                body.theme-ledger .cards-item--quote {
                  background: var(--ledger-surface);
                  border-radius: 0;
                  overflow: hidden;
                }
                body.theme-ledger .cards-item--quote:hover .cards-quote-card {
                  transform: none;
                  box-shadow: none;
                }
                body.theme-ledger .cards-quote-author {
                  text-align: left;
                  font-family: inherit;
                  font-size: 0.86rem;
                  text-transform: none;
                }
                body.theme-ledger .cards-quote-author::before {
                  content: "";
                }
                body.theme-ledger .cards-quote-date {
                  margin-top: 0.75rem;
                  padding-top: 0;
                  border-top: 0;
                  text-align: left;
                }
                body.theme-ledger .cards-item::after {
                  content: "";
                  position: absolute; top: 50%; right: 1.2rem;
                  width: 0.45rem; height: 0.45rem;
                  border-top: 1.5px solid color-mix(in srgb, var(--muted) 68%, transparent);
                  border-right: 1.5px solid color-mix(in srgb, var(--muted) 68%, transparent);
                  transform: translateY(-50%) rotate(45deg);
                  pointer-events: none;
                }
                body.theme-ledger .cards-filter-trigger {
                  width: 44px;
                  height: 44px;
                  border-radius: 10px;
                  background: var(--ledger-surface);
                  box-shadow: none;
                }
                body.theme-ledger .cards-filter-menu {
                  border-radius: 12px;
                  background: var(--ledger-surface);
                  box-shadow: var(--ledger-shadow);
                }
                body.theme-ledger .cards-filter-menu a {
                  border-radius: 9px;
                }
                body.theme-ledger .cards-panel {
                  box-shadow: -18px 0 38px rgba(15, 23, 42, 0.16);
                  will-change: transform;
                }
                body.theme-ledger .cards-overlay-backdrop {
                  background: rgba(15, 23, 42, 0.12);
                  backdrop-filter: none;
                  -webkit-backdrop-filter: none;
                  transition: opacity 0.28s ease;
                }
                body.theme-ledger .cards-panel-scroll main {
                  max-width: 760px;
                  margin: 0 auto;
                }
                body.theme-ledger .cards-close {
                  top: max(0.75rem, env(safe-area-inset-top));
                  left: max(0.85rem, env(safe-area-inset-left));
                  right: auto;
                  width: auto;
                  min-height: 44px;
                  padding: 0 0.9rem 0 0.65rem;
                  gap: 0.18rem;
                  border-radius: 999px;
                  background: color-mix(in srgb, var(--ledger-surface) 92%, transparent);
                  color: var(--focus);
                  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
                  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
                }
                body.theme-ledger .cards-close-icon--x {
                  display: none;
                }
                body.theme-ledger .cards-close-icon--back {
                  display: block;
                }
                body.theme-ledger .cards-close-label {
                  display: inline;
                  font-size: 0.94rem;
                  font-weight: 620;
                }
                body.theme-ledger .cards-detail-header:not(.cards-detail-header--photo),
                body.theme-ledger .cards-book-header,
                body.theme-ledger .cards-music-header,
                body.theme-ledger .cards-article-detail,
                body.theme-ledger .cards-link-card--full {
                  margin-top: 0;
                  padding-top: max(4.4rem, calc(env(safe-area-inset-top) + 3.4rem));
                }
                body.theme-ledger .cards-detail-header:not(.cards-detail-header--text):not(.cards-detail-header--photo) {
                  width: auto;
                  max-width: 760px;
                  margin-left: auto;
                  margin-right: auto;
                  border-radius: 0;
                  box-shadow: none;
                }
                body.theme-ledger .cards-detail-hero {
                  min-height: 0;
                  aspect-ratio: 16 / 9;
                  border-radius: 14px;
                  overflow: hidden;
                }
                body.theme-ledger .cards-detail-header .cards-caption {
                  position: absolute;
                  color: #fff;
                }
                body.theme-ledger .cards-detail-header .cards-eyebrow,
                body.theme-ledger .cards-detail-header .cards-title,
                body.theme-ledger .cards-detail-header .cards-subtitle,
                body.theme-ledger .cards-detail-header .cards-date {
                  color: #fff;
                  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.44);
                }
                body.theme-ledger .cards-detail-header .cards-title,
                body.theme-ledger .cards-article-title {
                  font-size: clamp(1.65rem, 4vw, 2.45rem);
                  line-height: 1.08;
                }
                body.theme-ledger .cards-detail-header--text {
                  max-width: 760px;
                }
                body.theme-ledger .cards-detail-header--text .cards-text-card,
                body.theme-ledger .cards-detail-header--quote .cards-quote-card {
                  border: 1px solid var(--ledger-separator);
                  border-radius: 14px;
                  background: var(--ledger-surface);
                  box-shadow: var(--ledger-shadow);
                }
                body.theme-ledger .cards-book-cover,
                body.theme-ledger .cards-music-artwork,
                body.theme-ledger .cards-article-body img,
                body.theme-ledger .cards-body img {
                  border-radius: 12px;
                  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.1), 0 10px 24px rgba(15, 23, 42, 0.12);
                }
                body.theme-ledger .cards-body,
                body.theme-ledger .cards-article-detail {
                  max-width: 760px;
                }
                body.theme-ledger .cards-article-header {
                  border-bottom-color: var(--ledger-separator);
                }
                body.theme-ledger footer.site-footer {
                  border-top-color: var(--ledger-separator);
                }
                @media (max-width: 560px) {
                  body.theme-ledger header.site-header {
                    align-items: flex-start;
                  }
                  body.theme-ledger .site-header-left {
                    width: 100%;
                    justify-content: space-between;
                  }
                  body.theme-ledger .site-header-right {
                    align-items: flex-start;
                  }
                  body.theme-ledger .cards-feed {
                    border-left: 0;
                    border-right: 0;
                    border-radius: 0;
                    margin-left: -1.25rem;
                    margin-right: -1.25rem;
                  }
                  body.theme-ledger .cards-hero {
                    grid-template-columns: 5.8rem minmax(0, 1fr);
                  }
                  body.theme-ledger .cards-hero img {
                    width: 5.8rem;
                  }
                  body.theme-ledger .cards-item[data-cards-type="photo"] .cards-hero {
                    grid-template-columns: 7rem minmax(0, 1fr);
                    min-height: 7rem;
                  }
                  body.theme-ledger .cards-item[data-cards-type="photo"] .cards-hero img {
                    width: 7rem;
                    min-height: 7rem;
                  }
                  body.theme-ledger .cards-caption,
                  body.theme-ledger .cards-text-card,
                  body.theme-ledger .cards-quote-card,
                  body.theme-ledger .cards-link-card {
                    padding: 0.9rem 1rem;
                  }
                }
              `,
            }}
          />
        ) : null}
      </head>
      <body
        className={
          theme === "cards"
            ? "theme-cards"
            : theme === "washi"
              ? "theme-washi"
              : theme === "prism"
                ? "theme-cards theme-prism"
                : theme === "ledger"
                  ? "theme-cards theme-ledger"
                  : theme === "cabinet"
                    ? "theme-cabinet"
                  : undefined
        }
        data-theme={theme}
        data-cards-detail={usesCardsInteraction && cardsDetail ? "true" : undefined}
        data-cabinet-detail={usesCabinetInteraction && cardsDetail ? "true" : undefined}
        data-page={currentPath}
      >
        <a className="skip-link" href="#main-content">
          {t(site.locale, "skipToContent")}
        </a>
        <header className="site-header">
          <div className="site-header-left">
            <div className="site-identity">
              <h1>
                <a href="/">{site.title}</a>
              </h1>
              {site.tagline ? <p className="site-tagline">{site.tagline}</p> : null}
            </div>
            {usesCabinetInteraction && !cardsDetail ? (
              <CabinetNavigation locale={site.locale} currentPath={currentPath} availablePaths={availablePaths} />
            ) : usesCardsInteraction && !cardsDetail ? (
              <CardsCategoryFilter locale={site.locale} currentPath={currentPath} availablePaths={availablePaths} />
            ) : usesCompactCategoryFilter ? (
              <CategoryFilter site={site} currentPath={currentPath} availablePaths={availablePaths} />
            ) : null}
          </div>
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
            {usesInteractiveDetail && !cardsDetail ? null : usesCompactCategoryFilter ? null : (
              <nav aria-label={t(site.locale, "primaryNavigation")}>
                {navItems(site, availablePaths).map((item) => (
                  <a key={item.href} href={item.href}>
                    {item.label}
                  </a>
                ))}
              </nav>
            )}
          </div>
        </header>
        {usesCabinetInteraction ? (
          <div className="cabinet-reading-progress" aria-hidden="true">
            <span />
          </div>
        ) : null}
        <main id="main-content">{children}</main>
        {!(usesInteractiveDetail && cardsDetail) ? (
          <footer className="site-footer">
            <SiteProfile site={site} />
            <div className="site-footer-nav">
              <a href="/archive">{t(site.locale, "archive")}</a>
              {" · "}<a href="/search">{t(site.locale, "search")}</a>
              {" · "}<a href="/about">{t(site.locale, "about")}</a>
              {hasWorkPage ? <>{" · "}<a href="/my-work">My work</a>{" · "}<a href="/contact">Contact</a></> : null}
            </div>
          </footer>
        ) : null}
        {usesCardsInteraction ? <script dangerouslySetInnerHTML={{ __html: cardsScript }} /> : null}
        {usesCabinetInteraction ? <script dangerouslySetInnerHTML={{ __html: cabinetScript }} /> : null}
        <script dangerouslySetInnerHTML={{ __html: amazonRegionScript }} />
        <script dangerouslySetInnerHTML={{ __html: copyButtonScript }} />
      </body>
    </html>
  );
}
