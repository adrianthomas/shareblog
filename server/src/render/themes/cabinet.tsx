import React from "react";
import type { ContentType } from "../../db/schema.js";
import { t, type MessageKey } from "../i18n.js";
import type { CardsExifRow } from "./cards.js";

export interface CabinetImage {
  url: string;
  alt: string;
}

export interface CabinetFeedItemProps {
  href: string;
  type: ContentType;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  dateLabel: React.ReactNode;
  image?: CabinetImage;
  rating?: React.ReactNode;
  ratingLabel?: string;
  actionLabel?: React.ReactNode;
  richHtml?: string;
}

function CabinetRail({ dateLabel }: { dateLabel: React.ReactNode }) {
  return (
    <span className="cabinet-rail">
      <span className="cabinet-index" aria-hidden="true" />
      <span className="cabinet-rail-date">{dateLabel}</span>
      <span className="cabinet-socket" aria-hidden="true" />
      <span className="cabinet-wire" aria-hidden="true" />
    </span>
  );
}

function CabinetArtifact({
  type,
  eyebrow,
  title,
  subtitle,
  image,
  rating,
  ratingLabel,
  actionLabel,
  richHtml,
  overlayLink,
}: Omit<CabinetFeedItemProps, "href" | "dateLabel"> & { overlayLink?: React.ReactNode }) {
  return (
    <article className={`cabinet-artifact cabinet-artifact--${type}`}>
      {image ? (
        <div className="cabinet-artifact-media">
          <img src={image.url} alt={image.alt} loading="lazy" data-cabinet-shared />
          {type === "music" ? <span className="cabinet-groove" aria-hidden="true" /> : null}
        </div>
      ) : null}
      <div className="cabinet-artifact-copy">
        <p className="cabinet-kind">{eyebrow}</p>
        {richHtml ? (
          <div className="cabinet-thought-body body-content" dangerouslySetInnerHTML={{ __html: richHtml }} />
        ) : type === "quote" ? (
          <blockquote className="cabinet-title">
            <p>{title}</p>
            {subtitle ? (
              <footer className="cabinet-subtitle">
                — <cite>{subtitle}</cite>
              </footer>
            ) : null}
          </blockquote>
        ) : (
          <h2 className="cabinet-title">{title}</h2>
        )}
        {subtitle && type !== "quote" ? <p className="cabinet-subtitle">{subtitle}</p> : null}
        {rating ? (
          <p className="cabinet-rating" aria-label={ratingLabel}>
            {rating}
          </p>
        ) : null}
        {actionLabel ? <span className="cabinet-action">{actionLabel}</span> : null}
      </div>
      {overlayLink}
    </article>
  );
}

export function CabinetFeedItem(props: CabinetFeedItemProps) {
  return (
    <a
      className={`cabinet-item cabinet-item--${props.type}`}
      href={props.href}
      data-cabinet-card
      data-cabinet-type={props.type}
    >
      <CabinetRail dateLabel={props.dateLabel} />
      <CabinetArtifact {...props} />
    </a>
  );
}

export function CabinetThoughtFeedItem(props: CabinetFeedItemProps & { detailLabel: string }) {
  return (
    <div className="cabinet-item cabinet-item--thought" data-cabinet-type="thought">
      <CabinetRail dateLabel={props.dateLabel} />
      <CabinetArtifact
        {...props}
        overlayLink={
          <a
            className="cabinet-thought-permalink"
            href={props.href}
            data-cabinet-card
            data-cabinet-type="thought"
            aria-label={props.detailLabel}
          />
        }
      />
    </div>
  );
}

export function CabinetLinkFeedItem({
  href,
  externalHref,
  title,
  host,
  eyebrow,
  excerpt,
  commentHtml,
  dateLabel,
  detailLabel,
  actionLabel,
}: {
  href: string;
  externalHref: string;
  title: React.ReactNode;
  host?: React.ReactNode;
  eyebrow: React.ReactNode;
  excerpt?: React.ReactNode;
  commentHtml?: string;
  dateLabel: React.ReactNode;
  detailLabel: string;
  actionLabel: React.ReactNode;
}) {
  return (
    <article className="cabinet-item cabinet-item--link" data-cabinet-type="link">
      <CabinetRail dateLabel={dateLabel} />
      <div className="cabinet-artifact cabinet-artifact--link">
        <div className="cabinet-artifact-copy">
          <div className="cabinet-link-port">
            <p className="cabinet-kind">{eyebrow}</p>
            {host ? <p className="cabinet-link-host">{host}</p> : null}
          </div>
          <h2 className="cabinet-title">
            <a className="cabinet-outbound" href={externalHref} target="_blank" rel="noopener noreferrer">
              {title} <span aria-hidden="true">↗</span>
            </a>
          </h2>
          {excerpt ? <p className="cabinet-subtitle">{excerpt}</p> : null}
          {commentHtml ? (
            <div className="cabinet-link-comment body-content" dangerouslySetInnerHTML={{ __html: commentHtml }} />
          ) : null}
          <a
            className="cabinet-link-permalink"
            href={href}
            data-cabinet-card
            data-cabinet-type="link"
            aria-label={detailLabel}
          >
            <span>{actionLabel}</span>
            <span aria-hidden="true">&#8594;</span>
          </a>
        </div>
      </div>
    </article>
  );
}

export function CabinetClose({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <a className="cabinet-close" href={backHref} aria-label={backLabel}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span>{backLabel}</span>
    </a>
  );
}

export interface CabinetDetailHeaderProps {
  type: ContentType;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  dateLabel: React.ReactNode;
  backHref: string;
  backLabel: string;
  image?: CabinetImage;
  rating?: React.ReactNode;
  ratingLabel?: string;
  richHtml?: string;
  exif?: CardsExifRow[];
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function CabinetDetailHeader({
  type,
  eyebrow,
  title,
  subtitle,
  dateLabel,
  backHref,
  backLabel,
  image,
  rating,
  ratingLabel,
  richHtml,
  exif,
  action,
  children,
}: CabinetDetailHeaderProps) {
  return (
    <>
      <CabinetClose backHref={backHref} backLabel={backLabel} />
      <article className={`cabinet-detail cabinet-detail--${type}`} data-cabinet-detail={type}>
        <div className="cabinet-detail-register" aria-hidden="true">
          <span className="cabinet-detail-socket" />
          <span className="cabinet-detail-rule" />
        </div>
        <header className="cabinet-detail-header">
          {image ? (
            <div className="cabinet-detail-media">
              <img src={image.url} alt={image.alt} data-cabinet-shared />
              {type === "music" ? <span className="cabinet-groove" aria-hidden="true" /> : null}
            </div>
          ) : null}
          <div className="cabinet-detail-copy">
            <p className="cabinet-kind">{eyebrow}</p>
            {richHtml ? (
              <>
                <h1 className="sr-only">{title}</h1>
                <div className="cabinet-detail-rich body-content" dangerouslySetInnerHTML={{ __html: richHtml }} />
              </>
            ) : type === "quote" ? (
              <>
                <h1 className="sr-only">
                  {title} {subtitle ? <>— {subtitle}</> : null}
                </h1>
                <blockquote className="cabinet-detail-title">
                  <p>{title}</p>
                  {subtitle ? (
                    <footer className="cabinet-detail-subtitle">
                      — <cite>{subtitle}</cite>
                    </footer>
                  ) : null}
                </blockquote>
              </>
            ) : (
              <h1 className="cabinet-detail-title">{title}</h1>
            )}
            {subtitle && type !== "quote" ? <p className="cabinet-detail-subtitle">{subtitle}</p> : null}
            {rating ? (
              <p className="cabinet-rating" aria-label={ratingLabel}>
                {rating}
              </p>
            ) : null}
            <p className="cabinet-detail-date">{dateLabel}</p>
            {action ? <div className="cabinet-detail-action">{action}</div> : null}
          </div>
        </header>
        {exif && exif.length > 0 ? (
          <dl className="cabinet-exif">
            {exif.map((row) => (
              <div className="cabinet-exif-row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {children}
      </article>
    </>
  );
}

const CABINET_PATHS: Array<{ href: string; key: MessageKey }> = [
  { href: "/", key: "home" },
  { href: "/posts", key: "posts" },
  { href: "/articles", key: "articles" },
  { href: "/links", key: "links" },
  { href: "/books", key: "books" },
  { href: "/music", key: "music" },
  { href: "/photos", key: "photos" },
  { href: "/quotes", key: "quotes" },
];

export function CabinetNavigation({
  locale,
  currentPath,
  availablePaths,
}: {
  locale: string;
  currentPath: string;
  availablePaths?: string[];
}) {
  const paths = availablePaths
    ? CABINET_PATHS.filter((item) => item.href === "/" || availablePaths.includes(item.href))
    : CABINET_PATHS;
  return (
    <nav className="cabinet-nav" aria-label={t(locale, "primaryNavigation")}>
      {paths.map((item) => {
        const index = CABINET_PATHS.indexOf(item);
        const active = item.href === "/" ? currentPath === "/" : currentPath.startsWith(item.href);
        return (
          <a key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            <span aria-hidden="true">{String(index).padStart(2, "0")}</span>
            {t(locale, item.key)}
          </a>
        );
      })}
    </nav>
  );
}

// Cabinet intentionally reuses the already-vendored Shippori Mincho files
// under its own family name. It keeps the theme deterministic and fully
// self-hosted while using the same licensed assets in a much more modern,
// editorial role than Washi's paper-and-ink treatment.
export const cabinetStyles = `
  @font-face {
    font-family: "Cabinet Serif";
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url(/static/fonts/shippori-mincho-latin-400.woff2) format("woff2");
  }
  @font-face {
    font-family: "Cabinet Serif";
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url(/static/fonts/shippori-mincho-latin-600.woff2) format("woff2");
  }

  html[data-theme="cabinet"] {
    --fg: #181814;
    --bg: #f3f1ea;
    --muted: #6d6b64;
    --border: #cfccc1;
    --focus: #194ee6;
    --cabinet-paper: #fcfbf7;
    --cabinet-ink: #181814;
    --cabinet-graphite: #6d6b64;
    --cabinet-rule: #cfccc1;
    --cabinet-signal: #ef5338;
    --cabinet-thought: #ee6c4d;
    --cabinet-thought-label: #b94832;
    --cabinet-photo: #335cdb;
    --cabinet-book: #b17618;
    --cabinet-book-label: #965e10;
    --cabinet-music: #7257c8;
    --cabinet-article: #5d7452;
    --cabinet-quote: #ad4768;
    --cabinet-link: #247a73;
    --cabinet-shadow: 0 1px 0 rgba(24, 24, 20, 0.08), 0 22px 55px rgba(24, 24, 20, 0.08);
  }
  @media (prefers-color-scheme: dark) {
    html[data-theme="cabinet"] {
      --fg: #eeece4;
      --bg: #11120f;
      --muted: #a7a49a;
      --border: #373830;
      --focus: #8fb0ff;
      --cabinet-paper: #1b1c18;
      --cabinet-ink: #eeece4;
      --cabinet-graphite: #a7a49a;
      --cabinet-rule: #373830;
      --cabinet-signal: #ff7258;
      --cabinet-thought: #ff8066;
      --cabinet-thought-label: #ff8066;
      --cabinet-photo: #7394ff;
      --cabinet-book: #d9a84a;
      --cabinet-book-label: #d9a84a;
      --cabinet-music: #aa93ff;
      --cabinet-article: #96ad8a;
      --cabinet-quote: #e17b9b;
      --cabinet-link: #66b7ae;
      --cabinet-shadow: 0 1px 0 rgba(0, 0, 0, 0.35), 0 24px 65px rgba(0, 0, 0, 0.28);
    }
  }

  html[data-theme="cabinet"] { scroll-behavior: smooth; }
  body.theme-cabinet {
    width: 100%; max-width: none; min-height: 100vh; margin: 0; padding: 0;
    overflow-x: clip; background-color: var(--bg); color: var(--fg);
    background-image:
      linear-gradient(to right, color-mix(in srgb, var(--cabinet-rule) 32%, transparent) 1px, transparent 1px),
      radial-gradient(circle at 82% 8%, color-mix(in srgb, var(--cabinet-signal) 7%, transparent), transparent 28rem);
    background-size: min(8.333vw, 8rem) 100%, auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif;
  }
  body.theme-cabinet::before {
    content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
    background: linear-gradient(115deg, color-mix(in srgb, var(--cabinet-paper) 48%, transparent), transparent 42%);
  }

  body.theme-cabinet header.site-header {
    position: relative; width: min(100%, 1560px); max-width: none;
    display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1.5rem 3rem;
    margin: 0 auto; padding: max(2rem, env(safe-area-inset-top)) clamp(1.25rem, 4vw, 4rem) 2.5rem;
    border-bottom: 1px solid var(--cabinet-rule);
  }
  body.theme-cabinet .site-header-left { display: contents; }
  body.theme-cabinet .site-identity { grid-column: 1 / -1; gap: 0.75rem; padding-top: clamp(1rem, 5vw, 4.5rem); }
  body.theme-cabinet header.site-header h1 {
    margin: 0; max-width: 100%; font-family: "Cabinet Serif", Georgia, serif;
    font-size: clamp(4.2rem, 12vw, 11rem); font-weight: 600; line-height: 0.78;
    letter-spacing: -0.075em; text-wrap: balance; overflow-wrap: anywhere;
  }
  body.theme-cabinet header.site-header h1 a {
    display: inline-block; color: var(--fg); text-decoration: none;
    transition: color 180ms ease, letter-spacing 450ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @media (hover: hover) {
    body.theme-cabinet header.site-header h1 a:hover { color: var(--cabinet-signal); letter-spacing: -0.068em; }
  }
  body.theme-cabinet .site-tagline {
    max-width: 34rem; margin: 0 0 0 clamp(0.2rem, 8vw, 7.5rem); padding-left: 1rem;
    border-left: 2px solid var(--cabinet-signal); color: var(--cabinet-graphite);
    font-family: "Cabinet Serif", Georgia, serif; font-size: clamp(1rem, 1.6vw, 1.25rem); line-height: 1.5;
  }
  body.theme-cabinet .site-header-right { grid-column: 2; grid-row: 2; align-self: end; align-items: flex-end; }
  body.theme-cabinet .header-links { margin: 0; }
  body.theme-cabinet .rss-link {
    color: var(--cabinet-graphite); font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.68rem; letter-spacing: 0.06em; text-transform: uppercase;
  }
  body.theme-cabinet .header-link-divider { color: var(--cabinet-signal); }
  body.theme-cabinet .cabinet-nav {
    grid-column: 1; grid-row: 2; display: flex; flex-wrap: nowrap; gap: 0; min-width: 0; overflow-x: auto;
    scrollbar-width: none; overscroll-behavior-inline: contain;
    border-top: 1px solid var(--cabinet-rule); border-bottom: 1px solid var(--cabinet-rule);
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  }
  body.theme-cabinet .cabinet-nav::-webkit-scrollbar { display: none; }
  body.theme-cabinet .cabinet-nav a {
    position: relative; flex: 0 0 auto; min-height: 44px; padding: 0.7rem 1rem 0.65rem;
    display: inline-flex; align-items: baseline; gap: 0.45rem;
    border-right: 1px solid var(--cabinet-rule); color: var(--cabinet-graphite);
    font-size: 0.72rem; line-height: 1; letter-spacing: 0.03em; text-decoration: none;
    transition: color 160ms ease, background-color 160ms ease;
  }
  body.theme-cabinet .cabinet-nav a > span { font-size: 0.56rem; color: var(--cabinet-signal); }
  body.theme-cabinet .cabinet-nav a:hover,
  body.theme-cabinet .cabinet-nav a:focus-visible { color: var(--fg); background: color-mix(in srgb, var(--cabinet-signal) 7%, transparent); }
  body.theme-cabinet .cabinet-nav a[aria-current="page"] { color: var(--fg); background: var(--cabinet-paper); }
  body.theme-cabinet .cabinet-nav a[aria-current="page"]::after {
    content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; background: var(--cabinet-signal);
  }

  body.theme-cabinet main {
    width: min(100%, 1560px); max-width: none; min-height: 45vh;
    margin: 0 auto; padding: clamp(2rem, 5vw, 5rem) clamp(1.25rem, 4vw, 4rem) 6rem;
  }
  body.theme-cabinet footer.site-footer {
    width: min(100%, 1560px); margin: 0 auto; padding: 2rem clamp(1.25rem, 4vw, 4rem) max(2rem, env(safe-area-inset-bottom));
    border-color: var(--cabinet-rule); font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase;
  }

  .cabinet-feed {
    position: relative; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr));
    column-gap: clamp(1rem, 2.6vw, 2.75rem); row-gap: clamp(3.5rem, 8vw, 8rem);
    counter-reset: cabinet-item; align-items: start;
  }
  .cabinet-feed::before {
    content: ""; position: absolute; top: 0; bottom: 0; left: clamp(4.9rem, 7.25vw, 7.25rem);
    width: 1px; background: var(--cabinet-rule); pointer-events: none;
  }
  .cabinet-item {
    --cabinet-type: var(--cabinet-signal); position: relative; min-width: 0;
    display: grid; grid-template-columns: clamp(5rem, 7.5vw, 7.5rem) minmax(0, 1fr);
    grid-column: 1 / -1; counter-increment: cabinet-item; color: var(--fg); text-decoration: none;
    isolation: isolate; -webkit-tap-highlight-color: transparent;
  }
  .cabinet-item--thought { --cabinet-type: var(--cabinet-thought); --cabinet-type-label: var(--cabinet-thought-label); }
  .cabinet-item--photo { --cabinet-type: var(--cabinet-photo); }
  .cabinet-item--book { --cabinet-type: var(--cabinet-book); --cabinet-type-label: var(--cabinet-book-label); }
  .cabinet-item--music { --cabinet-type: var(--cabinet-music); }
  .cabinet-item--article { --cabinet-type: var(--cabinet-article); }
  .cabinet-item--quote { --cabinet-type: var(--cabinet-quote); }
  .cabinet-item--link { --cabinet-type: var(--cabinet-link); }
  .cabinet-rail {
    position: relative; min-height: 4rem; padding: 0 1rem 0 0;
    display: flex; flex-direction: column; align-items: flex-end; gap: 0.45rem;
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums; color: var(--cabinet-graphite);
  }
  .cabinet-index::before {
    content: counter(cabinet-item, decimal-leading-zero); font-size: 0.68rem; letter-spacing: 0.08em; color: var(--cabinet-type);
  }
  .cabinet-rail-date { max-width: 6.4rem; font-size: 0.58rem; line-height: 1.35; text-align: right; }
  .cabinet-socket {
    position: absolute; top: 0.2rem; right: -0.37rem; width: 0.72rem; height: 0.72rem;
    border: 2px solid var(--bg); border-radius: 50%; background: var(--cabinet-type);
    box-shadow: 0 0 0 1px var(--cabinet-rule), 0 0 0 0 color-mix(in srgb, var(--cabinet-type) 28%, transparent);
    transition: box-shadow 180ms ease, transform 180ms ease;
  }
  .cabinet-wire {
    position: absolute; top: 0.54rem; right: -1px; width: clamp(1rem, 2.6vw, 2.75rem); height: 1px;
    background: var(--cabinet-type); transform: translateX(100%) scaleX(0.42); transform-origin: left;
    transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .cabinet-item:hover .cabinet-wire,
  .cabinet-item:focus-within .cabinet-wire,
  .cabinet-item--opening .cabinet-wire { transform: translateX(100%) scaleX(1); }
  .cabinet-item--opening .cabinet-socket {
    transform: scale(1.25); box-shadow: 0 0 0 1px var(--cabinet-rule), 0 0 0 8px color-mix(in srgb, var(--cabinet-type) 22%, transparent);
  }

  .cabinet-artifact {
    position: relative; min-width: 0; margin-left: clamp(1rem, 2.6vw, 2.75rem);
    overflow: hidden; border: 1px solid var(--cabinet-rule); background: var(--cabinet-paper);
    box-shadow: var(--cabinet-shadow); transform: translateZ(0);
    transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 320ms ease, border-color 180ms ease;
  }
  a.cabinet-item:focus-visible { outline: none; }
  a.cabinet-item:focus-visible .cabinet-artifact,
  .cabinet-item--thought:has(.cabinet-thought-permalink:focus-visible) .cabinet-artifact,
  .cabinet-item--link:has(.cabinet-link-permalink:focus-visible) .cabinet-artifact {
    outline: 3px solid var(--focus); outline-offset: 4px;
  }
  a.cabinet-item--suppress-focus-ring:focus-visible .cabinet-artifact { outline: none; }
  @media (hover: hover) {
    a.cabinet-item:hover .cabinet-artifact,
    .cabinet-item--link:hover .cabinet-artifact {
      transform: translateY(-6px); border-color: color-mix(in srgb, var(--cabinet-type) 58%, var(--cabinet-rule));
      box-shadow: 0 1px 0 rgba(24, 24, 20, 0.08), 0 32px 80px rgba(24, 24, 20, 0.14);
    }
  }
  .cabinet-artifact-media { position: relative; overflow: hidden; background: color-mix(in srgb, var(--cabinet-type) 8%, var(--cabinet-paper)); }
  .cabinet-artifact-media img { display: block; width: 100%; height: auto; object-fit: cover; }
  .cabinet-artifact-copy { position: relative; z-index: 2; padding: clamp(1.25rem, 2.4vw, 2.4rem); }
  .cabinet-kind {
    margin: 0 0 1.2rem; color: var(--cabinet-type-label, var(--cabinet-type));
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.63rem; font-weight: 650; line-height: 1; letter-spacing: 0.11em; text-transform: uppercase;
  }
  .cabinet-kind::before { content: "●"; margin-right: 0.55rem; font-size: 0.72em; }
  .cabinet-title {
    margin: 0; color: var(--cabinet-ink); font-family: "Cabinet Serif", Georgia, serif;
    font-size: clamp(1.8rem, 4.1vw, 4.6rem); font-weight: 600; line-height: 0.98; letter-spacing: -0.048em; text-wrap: balance; overflow-wrap: anywhere;
  }
  .cabinet-subtitle {
    max-width: 54ch; margin: 1.1rem 0 0; color: var(--cabinet-graphite);
    font-size: clamp(0.94rem, 1.4vw, 1.12rem); line-height: 1.5;
  }
  .cabinet-rating { margin: 1rem 0 0; color: var(--cabinet-type); font-size: 0.82rem; letter-spacing: 0.18em; }
  .cabinet-action {
    display: inline-flex; align-items: center; min-height: 44px; margin-top: 1rem;
    color: var(--cabinet-ink); font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.68rem; letter-spacing: 0.05em; text-transform: uppercase;
  }

  /* Thoughts are dispatches: confident sans type, an editorial insertion
     slash, and no fake sheet of paper around a thing born as text. */
  .cabinet-item--thought .cabinet-artifact { grid-column: auto; width: min(100%, 760px); border-width: 1px 0; background: transparent; box-shadow: none; }
  .cabinet-artifact--thought .cabinet-artifact-copy { padding-left: 0; padding-right: clamp(1rem, 4vw, 4rem); }
  .cabinet-artifact--thought .cabinet-kind { margin-bottom: 1.6rem; }
  .cabinet-thought-permalink { position: absolute; inset: 0; z-index: 3; }
  .cabinet-thought-body a { position: relative; z-index: 4; }
  .cabinet-artifact--thought .cabinet-title,
  .cabinet-thought-body {
    max-width: 28ch; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: clamp(1.65rem, 3.7vw, 3.65rem); font-weight: 650; line-height: 1.08; letter-spacing: -0.045em;
  }
  .cabinet-thought-body { max-width: 32ch; }
  .cabinet-thought-body p { margin: 0 0 0.7em; }
  .cabinet-thought-body p:last-child { margin-bottom: 0; }
  .cabinet-artifact--thought::after {
    content: "/"; position: absolute; right: 0.7rem; bottom: -0.18em;
    color: var(--cabinet-type); font-size: clamp(4rem, 8vw, 8rem); font-weight: 200; line-height: 1;
    opacity: 0.42; transition: opacity 180ms ease, transform 320ms ease;
  }
  .cabinet-item--thought:hover .cabinet-artifact::after { opacity: 1; transform: translateY(-0.05em); }

  /* Photos keep their own geometry. Caption copy is a mat beneath the
     image, never a scrim over it. */
  .cabinet-item--photo .cabinet-artifact { width: min(100%, 1120px); background: #0b0b0a; border-color: #0b0b0a; }
  .cabinet-artifact--photo { display: grid; grid-template-columns: minmax(0, 1fr) minmax(11rem, 0.28fr); align-items: end; }
  .cabinet-artifact--photo .cabinet-artifact-media { min-height: 22rem; background: #050505; }
  .cabinet-artifact--photo .cabinet-artifact-media img { width: 100%; height: 100%; min-height: 22rem; max-height: 72vh; object-fit: contain; }
  .cabinet-artifact--photo .cabinet-artifact-copy { color: #fff; background: #0b0b0a; }
  .cabinet-artifact--photo .cabinet-kind { color: #8eacff; }
  .cabinet-artifact--photo .cabinet-title { color: #fff; font-size: clamp(1.25rem, 2.2vw, 2.25rem); line-height: 1.12; letter-spacing: -0.025em; }
  .cabinet-artifact--photo .cabinet-subtitle { color: rgba(255, 255, 255, 0.65); }

  /* Books stay jackets, with a quiet catalogue card beside them. */
  .cabinet-item--book .cabinet-artifact { width: min(100%, 910px); }
  .cabinet-artifact--book { display: grid; grid-template-columns: minmax(12rem, 0.82fr) 1.18fr; background: color-mix(in srgb, var(--cabinet-book) 7%, var(--cabinet-paper)); }
  .cabinet-artifact--book .cabinet-artifact-media { min-height: 27rem; display: grid; place-items: center; padding: clamp(2rem, 5vw, 5rem); overflow: visible; }
  .cabinet-artifact--book .cabinet-artifact-media::before {
    content: ""; position: absolute; left: 17%; right: 13%; bottom: 9%; height: 10%;
    border-radius: 50%; background: rgba(24, 24, 20, 0.22); filter: blur(18px); transform: perspective(180px) rotateX(66deg);
  }
  .cabinet-artifact--book .cabinet-artifact-media img {
    position: relative; z-index: 1; width: auto; max-width: 100%; height: auto; max-height: 25rem; object-fit: contain;
    box-shadow: -0.45rem 0 0 color-mix(in srgb, #000 14%, transparent), 0.9rem 1.2rem 2.2rem rgba(24, 24, 20, 0.26);
  }
  .cabinet-artifact--book .cabinet-artifact-copy { align-self: center; }
  .cabinet-artifact--book .cabinet-title { font-size: clamp(2rem, 4vw, 4rem); }

  /* Music is a sleeve and an offset signal halo. Only the halo moves. */
  .cabinet-item--music .cabinet-artifact { width: min(100%, 880px); }
  .cabinet-artifact--music { display: grid; grid-template-columns: minmax(15rem, 1fr) minmax(13rem, 0.9fr); background: color-mix(in srgb, var(--cabinet-music) 8%, var(--cabinet-paper)); }
  .cabinet-artifact--music .cabinet-artifact-media { aspect-ratio: 1; overflow: visible; margin: clamp(1.25rem, 3vw, 2.5rem); }
  .cabinet-artifact--music .cabinet-artifact-media img { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: cover; box-shadow: 0 1.25rem 3rem rgba(24, 24, 20, 0.22); }
  .cabinet-groove {
    position: absolute; z-index: 1; width: 84%; aspect-ratio: 1; top: 8%; right: -16%; border-radius: 50%;
    background: repeating-radial-gradient(circle, #171719 0 2px, #27272b 3px 4px, #111113 5px 7px);
    box-shadow: 0 0 0 1px #050505, 0 1.2rem 2.4rem rgba(0, 0, 0, 0.28);
    transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .cabinet-groove::after {
    content: ""; position: absolute; inset: 42%; border-radius: 50%; background: var(--cabinet-music); box-shadow: 0 0 0 2px #111;
  }
  .cabinet-item--music:hover .cabinet-groove,
  .cabinet-item--music:focus-within .cabinet-groove { transform: rotate(8deg) translateX(3%); }
  .cabinet-artifact--music .cabinet-artifact-copy { align-self: end; padding-left: clamp(2rem, 4vw, 4rem); }
  .cabinet-artifact--music .cabinet-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: clamp(2rem, 4vw, 4rem); font-weight: 760; }

  /* Articles are the wide folios in the sequence. */
  .cabinet-item--article .cabinet-artifact { width: min(100%, 1240px); }
  .cabinet-artifact--article { display: grid; grid-template-columns: minmax(0, 1.14fr) minmax(18rem, 0.86fr); }
  .cabinet-artifact--article:not(:has(.cabinet-artifact-media)) { grid-template-columns: 1fr; }
  .cabinet-artifact--article .cabinet-artifact-media { min-height: 29rem; }
  .cabinet-artifact--article .cabinet-artifact-media img { width: 100%; height: 100%; min-height: 29rem; object-fit: cover; }
  .cabinet-artifact--article .cabinet-artifact-copy { align-self: stretch; display: flex; flex-direction: column; justify-content: flex-end; }
  .cabinet-artifact--article .cabinet-title { font-size: clamp(2.3rem, 5vw, 5.6rem); }
  .cabinet-artifact--article .cabinet-action { margin-top: auto; padding-top: 2.5rem; }

  /* Quotes are typographic broadsides, not faux handwritten notes. */
  .cabinet-item--quote .cabinet-artifact { width: min(100%, 860px); overflow: visible; background: color-mix(in srgb, var(--cabinet-quote) 5%, var(--cabinet-paper)); }
  .cabinet-artifact--quote .cabinet-artifact-copy { padding: clamp(2.6rem, 6vw, 6rem); }
  .cabinet-artifact--quote .cabinet-artifact-copy::before {
    content: "“"; position: absolute; left: -0.34em; top: -0.34em; z-index: -1;
    color: var(--cabinet-type); font-family: "Cabinet Serif", Georgia, serif; font-size: clamp(8rem, 18vw, 18rem); line-height: 1; opacity: 0.16;
  }
  .cabinet-artifact--quote .cabinet-title { max-width: 19ch; font-size: clamp(2.1rem, 5vw, 5.25rem); font-weight: 400; line-height: 1.05; }
  .cabinet-artifact--quote .cabinet-title p,
  .cabinet-detail--quote .cabinet-detail-title p { margin: 0; }
  .cabinet-artifact--quote cite,
  .cabinet-detail--quote cite { font-style: normal; }
  .cabinet-artifact--quote .cabinet-subtitle { margin-left: auto; max-width: 24ch; text-align: right; }

  /* Links expose the outbound destination and make the saved note a clear,
     secondary route instead of hiding two destinations beneath one card. */
  .cabinet-item--link .cabinet-artifact { width: min(100%, 820px); background: color-mix(in srgb, var(--cabinet-link) 5%, var(--cabinet-paper)); }
  .cabinet-link-permalink {
    position: relative; z-index: 3; display: inline-flex; align-items: center; gap: 0.65rem; min-height: 44px; margin-top: 1.15rem;
    color: var(--cabinet-ink); font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.68rem; letter-spacing: 0.05em; text-decoration: none; text-transform: uppercase;
  }
  .cabinet-link-permalink span:last-child { color: var(--cabinet-type); transition: transform 180ms ease; }
  .cabinet-link-permalink:hover span:last-child,
  .cabinet-link-permalink:focus-visible span:last-child { transform: translateX(0.3rem); }
  .cabinet-link-port { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
  .cabinet-link-host {
    margin: 0; color: var(--cabinet-type); font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.68rem; overflow-wrap: anywhere;
  }
  .cabinet-outbound { position: relative; z-index: 3; color: inherit; text-decoration: none; }
  .cabinet-outbound:hover, .cabinet-outbound:focus-visible { color: var(--cabinet-type); text-decoration: underline; }
  .cabinet-link-comment { position: relative; z-index: 2; margin-top: 1.25rem; padding-left: 1rem; border-left: 1px solid var(--cabinet-type); color: var(--cabinet-graphite); }

  /* Standalone details keep the rail metaphor but give every object the
     room its medium asks for. The same CSS is loaded before fetched
     overlay content is moved into the live page. */
  body.theme-cabinet[data-cabinet-detail="true"] header.site-header,
  body.theme-cabinet[data-cabinet-detail="true"] footer.site-footer { display: none; }
  body.theme-cabinet[data-cabinet-detail="true"] main { width: 100%; padding: 0; }
  .cabinet-close {
    position: fixed; top: max(1rem, env(safe-area-inset-top)); left: max(1rem, env(safe-area-inset-left)); z-index: 1105;
    display: inline-flex; align-items: center; gap: 0.55rem; min-width: 44px; min-height: 44px; padding: 0.55rem 0.8rem;
    border: 1px solid color-mix(in srgb, var(--cabinet-rule) 80%, transparent); border-radius: 999px;
    background: color-mix(in srgb, var(--cabinet-paper) 88%, transparent); color: var(--cabinet-ink); text-decoration: none;
    box-shadow: 0 10px 30px rgba(24, 24, 20, 0.14); backdrop-filter: blur(18px) saturate(1.2); -webkit-backdrop-filter: blur(18px) saturate(1.2);
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-size: 0.64rem; letter-spacing: 0.03em;
  }
  .cabinet-close:hover { border-color: var(--cabinet-signal); }
  .cabinet-detail {
    --cabinet-type: var(--cabinet-signal); position: relative; min-height: 100vh; min-height: 100dvh;
    padding: max(6.5rem, calc(env(safe-area-inset-top) + 5.5rem)) clamp(1.25rem, 5vw, 5rem) max(4rem, env(safe-area-inset-bottom));
    background: var(--bg);
  }
  .cabinet-detail--thought { --cabinet-type: var(--cabinet-thought); --cabinet-type-label: var(--cabinet-thought-label); }
  .cabinet-detail--photo { --cabinet-type: var(--cabinet-photo); }
  .cabinet-detail--book { --cabinet-type: var(--cabinet-book); --cabinet-type-label: var(--cabinet-book-label); }
  .cabinet-detail--music { --cabinet-type: var(--cabinet-music); }
  .cabinet-detail--article { --cabinet-type: var(--cabinet-article); }
  .cabinet-detail--quote { --cabinet-type: var(--cabinet-quote); }
  .cabinet-detail--link { --cabinet-type: var(--cabinet-link); }
  .cabinet-detail-register {
    position: absolute; left: clamp(1.45rem, 4vw, 4rem); top: 0; bottom: 0; width: 1px; background: var(--cabinet-rule);
  }
  .cabinet-detail-socket {
    position: sticky; display: block; top: 50vh; width: 0.8rem; height: 0.8rem; margin-left: -0.38rem;
    border: 2px solid var(--bg); border-radius: 50%; background: var(--cabinet-type); box-shadow: 0 0 0 1px var(--cabinet-rule);
  }
  .cabinet-detail-rule { position: sticky; display: block; top: calc(50vh + 0.38rem); width: clamp(2rem, 5vw, 5rem); height: 1px; background: var(--cabinet-type); }
  .cabinet-detail-header { width: min(100%, 1320px); margin: 0 auto; }
  .cabinet-detail-copy { min-width: 0; }
  .cabinet-detail-title {
    max-width: 18ch; margin: 0; color: var(--cabinet-ink); font-family: "Cabinet Serif", Georgia, serif;
    font-size: clamp(2.75rem, 6.6vw, 7rem); font-weight: 600; line-height: 0.94; letter-spacing: -0.055em; text-wrap: balance; overflow-wrap: anywhere;
  }
  .cabinet-detail-subtitle {
    max-width: 46ch; margin: 1.5rem 0 0; color: var(--cabinet-graphite);
    font-family: "Cabinet Serif", Georgia, serif; font-size: clamp(1.15rem, 2vw, 1.55rem); line-height: 1.48;
  }
  .cabinet-detail-date {
    display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.65rem; margin: 1.5rem 0 0; color: var(--cabinet-graphite);
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-size: 0.68rem; letter-spacing: 0.025em;
  }
  .cabinet-detail-action { margin-top: 1.5rem; }
  .cabinet-detail-action a,
  body.theme-cabinet .music-links a,
  body.theme-cabinet .open-link-button {
    display: inline-flex; align-items: center; justify-content: center; min-height: 44px; margin: 0.3rem 0.45rem 0.3rem 0; padding: 0.65rem 0.9rem;
    border: 1px solid var(--cabinet-rule); border-radius: 999px; color: var(--cabinet-ink); background: var(--cabinet-paper);
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-size: 0.68rem; text-decoration: none;
  }
  .cabinet-detail-action a:hover,
  body.theme-cabinet .music-links a:hover,
  body.theme-cabinet .open-link-button:hover { border-color: var(--cabinet-type); background: color-mix(in srgb, var(--cabinet-type) 8%, var(--cabinet-paper)); }
  .cabinet-detail-media { position: relative; }
  .cabinet-detail-media > img { display: block; width: 100%; height: auto; }
  .cabinet-detail-body {
    width: min(calc(100% - 2.5rem), 68ch); margin: 0 auto; padding: clamp(3rem, 7vw, 7rem) 0 max(5rem, env(safe-area-inset-bottom));
    font-family: "Cabinet Serif", Georgia, serif; font-size: clamp(1.08rem, 1.7vw, 1.28rem); line-height: 1.68;
  }
  .cabinet-detail-body--book { --cabinet-type: var(--cabinet-book); }
  .cabinet-detail-body--music { --cabinet-type: var(--cabinet-music); }
  .cabinet-detail-body--book,
  .cabinet-detail-body--music { padding-top: clamp(1.5rem, 3vw, 3rem); }
  .cabinet-article-body { --cabinet-type: var(--cabinet-article); }
  .cabinet-quote-comment { --cabinet-type: var(--cabinet-quote); }
  .cabinet-link-detail-body { --cabinet-type: var(--cabinet-link); }
  .cabinet-detail-body > p:first-child::first-letter,
  .cabinet-article-body > p:first-child::first-letter {
    float: left; margin: 0.08em 0.12em 0 0; color: var(--cabinet-type); font-size: 4.4em; font-weight: 600; line-height: 0.72;
  }
  .cabinet-detail-body h2 { margin: 2.6em 0 0.65em; font-size: 1.85em; line-height: 1.08; }
  .cabinet-detail-body h3 { margin: 2em 0 0.55em; font-size: 1.35em; line-height: 1.15; }
  .cabinet-detail-body img { width: min(92vw, 1080px); max-width: none; height: auto; margin: 2rem 50%; transform: translateX(-50%); }

  .cabinet-detail--thought { display: grid; place-items: center; background: color-mix(in srgb, var(--cabinet-thought) 7%, var(--bg)); }
  .cabinet-detail--thought .cabinet-detail-header { width: min(100%, 1040px); }
  .cabinet-detail--thought .cabinet-kind { margin-bottom: 2.5rem; }
  .cabinet-detail--thought .cabinet-detail-rich {
    max-width: 29ch; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: clamp(2rem, 5.8vw, 6.2rem); font-weight: 640; line-height: 1.03; letter-spacing: -0.055em;
  }
  .cabinet-detail--thought .cabinet-detail-rich p { margin: 0 0 0.7em; }

  .cabinet-detail--photo { min-height: 100vh; padding: max(5rem, calc(env(safe-area-inset-top) + 4rem)) 0 0; background: #050505; color: #fff; }
  .cabinet-detail--photo .cabinet-detail-register { display: none; }
  .cabinet-detail--photo .cabinet-detail-header { width: 100%; }
  .cabinet-detail--photo .cabinet-detail-media { min-height: calc(100vh - 16rem); min-height: calc(100dvh - 16rem); display: grid; place-items: center; }
  .cabinet-detail--photo .cabinet-detail-media > img { width: 100%; height: calc(100vh - 16rem); height: calc(100dvh - 16rem); object-fit: contain; }
  .cabinet-detail--photo .cabinet-detail-copy { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: baseline; gap: 1rem 2rem; padding: 1.25rem clamp(1.25rem, 4vw, 4rem) 1.5rem; }
  .cabinet-detail--photo .cabinet-kind { margin: 0; color: #8eacff; }
  .cabinet-detail--photo .cabinet-detail-title { max-width: none; color: #fff; font-size: clamp(1.15rem, 2.3vw, 2rem); line-height: 1.18; letter-spacing: -0.025em; }
  .cabinet-detail--photo .cabinet-detail-date { margin: 0; color: rgba(255,255,255,0.62); }
  .cabinet-exif {
    display: flex; flex-wrap: wrap; gap: 1rem clamp(1.5rem, 4vw, 4rem); margin: 0; padding: 1.1rem clamp(1.25rem, 4vw, 4rem) max(1.5rem, env(safe-area-inset-bottom));
    border-top: 1px solid rgba(255,255,255,0.16); background: #050505;
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-variant-numeric: tabular-nums;
  }
  .cabinet-exif-row dt { color: rgba(255,255,255,0.5); font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase; }
  .cabinet-exif-row dd { margin: 0.16rem 0 0; color: rgba(255,255,255,0.92); font-size: 0.75rem; }

  .cabinet-detail--book .cabinet-detail-header,
  .cabinet-detail--music .cabinet-detail-header { display: grid; grid-template-columns: minmax(16rem, 0.88fr) minmax(18rem, 1.12fr); gap: clamp(2.5rem, 8vw, 9rem); align-items: center; min-height: calc(100vh - 13rem); }
  .cabinet-detail--book,
  .cabinet-detail--music { min-height: 0; padding-bottom: max(2rem, env(safe-area-inset-bottom)); }
  .cabinet-detail--book .cabinet-detail-media { display: grid; place-items: center; position: sticky; top: 5rem; }
  .cabinet-detail--book .cabinet-detail-media > img { width: auto; max-width: 100%; max-height: min(68vh, 720px); object-fit: contain; box-shadow: -0.7rem 0 0 color-mix(in srgb, #000 14%, transparent), 1.3rem 1.7rem 3.8rem rgba(24,24,20,0.28); }
  .cabinet-detail--book .cabinet-detail-title { font-size: clamp(2.75rem, 5.8vw, 5.8rem); }
  .cabinet-detail--music { background: color-mix(in srgb, var(--cabinet-music) 6%, var(--bg)); }
  .cabinet-detail--music .cabinet-detail-media { aspect-ratio: 1; position: sticky; top: 5rem; isolation: isolate; }
  .cabinet-detail--music .cabinet-detail-media > img { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: cover; box-shadow: 1rem 1.3rem 3.5rem rgba(24,24,20,0.28); }
  .cabinet-detail--music .cabinet-groove { z-index: 1; right: -13%; }
  .cabinet-detail--music .cabinet-detail-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-weight: 760; }

  .cabinet-detail--article { padding-bottom: 0; }
  .cabinet-detail--article:not(:has(.cabinet-detail-media)) {
    min-height: 0; padding-bottom: clamp(3.5rem, 7vw, 7rem);
  }
  .cabinet-detail--article .cabinet-detail-header { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(20rem, 0.88fr); gap: clamp(2rem, 6vw, 7rem); align-items: end; }
  .cabinet-detail--article .cabinet-detail-media { grid-column: 1; min-height: 62vh; }
  .cabinet-detail--article .cabinet-detail-media > img { width: 100%; height: 62vh; object-fit: cover; }
  .cabinet-detail--article .cabinet-detail-copy { grid-column: 2; padding-bottom: 1.5rem; }
  .cabinet-detail--article:not(:has(.cabinet-detail-media)) .cabinet-detail-header { display: block; width: min(100%, 980px); }
  .cabinet-detail--article .cabinet-detail-title { font-size: clamp(2.75rem, 6.2vw, 6.5rem); }

  .cabinet-detail--quote { display: grid; place-items: center; overflow: hidden; background: color-mix(in srgb, var(--cabinet-quote) 6%, var(--bg)); }
  .cabinet-detail--quote::before {
    content: "“"; position: absolute; left: -0.17em; top: -0.28em; color: var(--cabinet-quote);
    font-family: "Cabinet Serif", Georgia, serif; font-size: min(72vw, 56rem); line-height: 1; opacity: 0.1;
  }
  .cabinet-detail--quote .cabinet-detail-header { width: min(100%, 1040px); position: relative; }
  .cabinet-detail--quote .cabinet-detail-title { max-width: 18ch; font-weight: 400; line-height: 1; }
  .cabinet-detail--quote .cabinet-detail-subtitle { margin-left: auto; text-align: right; }

  .cabinet-detail--link { display: grid; align-items: center; background: color-mix(in srgb, var(--cabinet-link) 5%, var(--bg)); }
  .cabinet-detail--link .cabinet-detail-header { width: min(100%, 1060px); }
  .cabinet-detail--link .cabinet-detail-title a { color: inherit; text-decoration-thickness: 0.06em; text-decoration-color: var(--cabinet-link); }

  body.theme-cabinet .cabinet-detail-body > .meta a {
    display: inline-flex; align-items: center; min-height: 44px; margin: 0.3rem 0.45rem 0.3rem 0 !important;
    padding: 0.65rem 0.9rem; border: 1px solid var(--cabinet-rule); border-radius: 999px;
    color: var(--cabinet-ink); background: var(--cabinet-paper);
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-size: 0.68rem; text-decoration: none;
  }
  body.theme-cabinet .cabinet-detail-body > .meta a:hover {
    border-color: var(--cabinet-type); background: color-mix(in srgb, var(--cabinet-type) 8%, var(--cabinet-paper));
  }

  .cabinet-reading-progress { position: fixed; inset: 0 auto 0 0; z-index: 1110; width: 3px; pointer-events: none; }
  .cabinet-reading-progress > span { display: block; width: 100%; height: 0; background: var(--cabinet-signal); transition: height 90ms linear; }

  html.cabinet-lock-scroll, html.cabinet-lock-scroll body { overflow: hidden; }
  .cabinet-backdrop {
    position: fixed; inset: 0; z-index: 1000; background: color-mix(in srgb, #090909 42%, transparent);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); opacity: 0; transition: opacity 260ms ease;
  }
  .cabinet-backdrop--visible { opacity: 1; }
  .cabinet-panel {
    position: fixed; inset: 0; z-index: 1001; width: 100vw; height: 100vh; height: 100dvh;
    overflow: hidden; background: var(--bg); will-change: clip-path, opacity, transform; contain: paint;
    backface-visibility: hidden; -webkit-backface-visibility: hidden;
  }
  .cabinet-panel-scroll { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
  .cabinet-panel-scroll:focus, .cabinet-panel-scroll h1:focus-visible { outline: none; }
  .cabinet-shared-clone { position: fixed; z-index: 1100; margin: 0; object-fit: cover; pointer-events: none; will-change: top, left, width, height, border-radius; }

  .about-content, .release-entry, .about-product { font-family: "Cabinet Serif", Georgia, serif; }
  body.theme-cabinet .about-content { max-width: 66ch; margin: 0 auto; font-size: 1.18rem; line-height: 1.7; }
  body.theme-cabinet .about-content::before { content: ""; display: block; width: 3rem; height: 0.35rem; margin-bottom: 2rem; background: var(--cabinet-signal); }

  @media (max-width: 1099px) {
    body.theme-cabinet header.site-header { grid-template-columns: 1fr; }
    body.theme-cabinet .site-header-right { grid-column: 1; grid-row: 3; align-items: flex-start; }
    body.theme-cabinet .cabinet-nav { grid-row: 2; }
    .cabinet-artifact--photo,
    .cabinet-artifact--article { grid-template-columns: 1fr; }
    .cabinet-artifact--photo .cabinet-artifact-copy { display: grid; grid-template-columns: auto 1fr; gap: 0 1.5rem; align-items: baseline; }
    .cabinet-artifact--photo .cabinet-kind { margin: 0; }
    .cabinet-artifact--photo .cabinet-title { grid-column: 2; }
    .cabinet-detail--article .cabinet-detail-header { grid-template-columns: 1fr; }
    .cabinet-detail--article .cabinet-detail-media,
    .cabinet-detail--article .cabinet-detail-copy { grid-column: 1; }
    .cabinet-detail--article .cabinet-detail-media { min-height: 45vh; }
    .cabinet-detail--article .cabinet-detail-media > img { height: 45vh; }
  }

  @media (min-width: 720px) and (max-width: 900px) {
    body.theme-cabinet .cabinet-nav a {
      gap: 0.3rem; padding-left: 0.62rem; padding-right: 0.62rem; font-size: 0.68rem;
    }
  }

  @media (max-width: 719px) {
    body.theme-cabinet { background-size: 25vw 100%, auto; }
    body.theme-cabinet header.site-header { padding-left: 1rem; padding-right: 1rem; padding-bottom: 1.5rem; }
    body.theme-cabinet header.site-header h1 { font-size: clamp(3.6rem, 21vw, 7rem); line-height: 0.83; }
    body.theme-cabinet .site-tagline { margin-left: 0; }
    body.theme-cabinet .cabinet-nav { flex-wrap: wrap; }
    body.theme-cabinet main { padding: 2.5rem 1rem 5rem; }
    .cabinet-feed { row-gap: 4rem; }
    .cabinet-feed::before { left: 0.35rem; }
    .cabinet-item { display: block; padding-left: 0; }
    .cabinet-rail {
      min-height: 1.8rem; margin: 0 0 0.8rem; padding: 0 0 0 1.3rem;
      flex-direction: row; align-items: baseline; justify-content: space-between;
    }
    .cabinet-rail-date { max-width: none; text-align: left; }
    .cabinet-socket { left: 0; right: auto; top: 0.18rem; width: 0.7rem; height: 0.7rem; }
    .cabinet-wire { left: 0.68rem; right: auto; top: 0.5rem; width: 1rem; transform: scaleX(0.5); }
    .cabinet-item:hover .cabinet-wire,
    .cabinet-item:focus-within .cabinet-wire,
    .cabinet-item--opening .cabinet-wire { transform: scaleX(1); }
    .cabinet-artifact { width: auto !important; margin-left: 1.25rem; }
    .cabinet-artifact-copy { padding: 1.25rem; }
    .cabinet-title { font-size: clamp(1.8rem, 10vw, 3.4rem); }
    .cabinet-artifact--photo { display: block; margin-left: 0; }
    .cabinet-artifact--photo .cabinet-artifact-media,
    .cabinet-artifact--photo .cabinet-artifact-media img { min-height: 0; max-height: none; }
    .cabinet-artifact--photo .cabinet-artifact-copy { display: block; }
    .cabinet-artifact--photo .cabinet-title { grid-column: auto; }
    .cabinet-artifact--book,
    .cabinet-artifact--music { grid-template-columns: minmax(8.5rem, 0.9fr) minmax(0, 1.1fr); }
    .cabinet-artifact--book .cabinet-artifact-media { min-height: 17rem; padding: 1.6rem; }
    .cabinet-artifact--book .cabinet-artifact-media img { max-height: 14rem; }
    .cabinet-artifact--music .cabinet-artifact-media { min-width: 0; margin: 1rem; }
    .cabinet-artifact--music .cabinet-artifact-copy { padding-left: 1.2rem; }
    .cabinet-artifact--article { display: block; }
    .cabinet-artifact--article .cabinet-artifact-media,
    .cabinet-artifact--article .cabinet-artifact-media img { min-height: 16rem; height: 16rem; }
    .cabinet-artifact--quote .cabinet-artifact-copy { padding: 2.5rem 1.5rem; }
    .cabinet-detail { padding-left: 1.25rem; padding-right: 1.25rem; }
    .cabinet-detail-register { display: none; }
    .cabinet-detail-title { font-size: clamp(2.4rem, 12vw, 4.4rem); }
    .cabinet-detail--photo { padding-left: 0; padding-right: 0; }
    .cabinet-detail--photo .cabinet-detail-media { min-height: calc(100dvh - 16rem); }
    .cabinet-detail--photo .cabinet-detail-media > img { height: calc(100dvh - 16rem); }
    .cabinet-detail--photo .cabinet-detail-copy { grid-template-columns: 1fr; gap: 0.65rem; }
    .cabinet-detail--photo .cabinet-detail-date { justify-self: start; }
    .cabinet-detail--book .cabinet-detail-header,
    .cabinet-detail--music .cabinet-detail-header { grid-template-columns: 1fr; gap: 3rem; min-height: 0; }
    .cabinet-detail--book .cabinet-detail-media,
    .cabinet-detail--music .cabinet-detail-media { position: relative; top: auto; width: min(78vw, 26rem); margin: 0 auto; }
    .cabinet-detail--book .cabinet-detail-media > img { max-height: 52vh; }
    .cabinet-detail--article .cabinet-detail-media { width: calc(100% + 2.5rem); margin-left: -1.25rem; }
    .cabinet-close span { display: none; }
    .cabinet-close { border-radius: 50%; padding: 0; justify-content: center; }
  }

  @media (max-width: 419px) {
    .cabinet-artifact--book,
    .cabinet-artifact--music { grid-template-columns: 1fr; }
    .cabinet-artifact--book .cabinet-artifact-media { min-height: 20rem; }
    .cabinet-artifact--music .cabinet-artifact-media { width: calc(100% - 2rem); }
  }

  @media (prefers-reduced-motion: reduce) {
    html[data-theme="cabinet"] { scroll-behavior: auto; }
    .cabinet-artifact, .cabinet-wire, .cabinet-socket, .cabinet-groove { transition: none !important; transform: none !important; }
    .cabinet-reading-progress > span { transition: none; }
  }

  @media (forced-colors: active) {
    .cabinet-artifact, .cabinet-close, .cabinet-nav a { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    .cabinet-socket, .cabinet-detail-socket, .cabinet-kind::before { forced-color-adjust: none; background: Highlight; color: Highlight; }
    .cabinet-wire, .cabinet-detail-rule, .cabinet-reading-progress > span { background: Highlight; }
    .cabinet-groove, body.theme-cabinet::before { display: none; }
  }
`;
