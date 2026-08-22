import React from "react";
import { t, type MessageKey } from "../i18n.js";
import type { ContentType } from "../../db/schema.js";

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// A fixed color identity per content type (rather than the old per-post
// hash) so the same type always reads as the same color across the whole
// site — Articles are always blue, Posts are always orange, etc. Only
// thought/article/book/music ever reach TextCard (photo and quote have
// their own dedicated treatments that don't use this), but every type gets
// an entry for completeness.
const TYPE_ACCENTS: Record<ContentType, string> = {
  thought: "#ea580c",
  article: "#2563eb",
  book: "#b45309",
  music: "#7c3aed",
  quote: "#8a6d3b",
  photo: "#64748b",
};

export interface CardsHero {
  imageUrl?: string;
  imageAlt: string;
  gradientSeed: string;
}

// One already-translated, already-formatted EXIF fact ("Aperture" /
// "ƒ/1.8"). Built entirely by the caller (see PhotoPost.tsx) — this
// component stays free of i18n lookups and camera-notation formatting, the
// same division of labor as `eyebrow`/`ratingLabel` elsewhere in this file.
export interface CardsExifRow {
  label: string;
  value: string;
}

export interface CardsItemData {
  href: string;
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Drives the badge color on the text-only card treatment (see TextCard) — unused by the photo/quote variants, which have their own dedicated looks. */
  type: ContentType;
  hero: CardsHero;
  /** "quote" renders the letter-card treatment (cursive type on paper), on both feed and detail; "photo" renders the caption-above/plain-image-below treatment on the *detail* page only — the feed card stays the full-bleed Hero every other cover-image type uses. Only meaningful when `hero.imageUrl` is unset for "quote", or set for "photo". */
  variant?: "quote" | "photo";
  /** Only shown on the detail page (see PhotoCard's `full`); ignored for any variant other than "photo". */
  exif?: CardsExifRow[];
}

// The caption (eyebrow/title/subtitle) is a child of the hero, absolutely
// positioned over the scrim — not a sibling block below it — so the text
// sits on top of the image the way the App Store's does, rather than
// flowing onto a plain page background where the light-on-dark styling
// would be unreadable.
function Hero({
  hero,
  className = "",
  caption,
}: {
  hero: CardsHero;
  className?: string;
  caption: React.ReactNode;
}) {
  return (
    <div className={`cards-hero ${className}`}>
      <img src={hero.imageUrl} alt={hero.imageAlt} loading="lazy" />
      <div className="cards-scrim" aria-hidden="true" />
      {caption}
    </div>
  );
}

function Caption({
  eyebrow,
  title,
  subtitle,
  dateLabel,
  titleTag: TitleTag = "h2",
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  dateLabel?: string;
  titleTag?: "h1" | "h2";
}) {
  return (
    <div className="cards-caption">
      <p className="cards-eyebrow">{eyebrow}</p>
      <TitleTag className="cards-title">{title}</TitleTag>
      {subtitle ? <p className="cards-subtitle">{subtitle}</p> : null}
      {dateLabel ? <p className="cards-date">{dateLabel}</p> : null}
    </div>
  );
}

// The card design for a post with no image (a Thought, a Quote, or an
// Article/Book/Music post that hasn't set a cover): rather than mimicking
// the photo card with a colored block standing in for the missing image —
// which forces the same low-contrast white-on-scrim treatment a photo
// needs, on a post where the text *is* the whole point — this sets real
// foreground-colored type on the card's own surface, with a small type
// badge (dot + label) standing in for the color identity a cover image
// would otherwise carry. The badge sits fully inside the card's own
// padding rather than as an edge-to-edge stripe, so it never has to track
// the card's own corner radius the way an edge-to-edge border did. `full`
// skips the feed card's line-clamp (used on the detail page, where the
// text should never be truncated).
function TextCard({
  eyebrow,
  title,
  subtitle,
  type,
  dateLabel,
  titleTag: TitleTag = "h2",
  full = false,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  type: ContentType;
  dateLabel?: string;
  titleTag?: "h1" | "h2";
  full?: boolean;
}) {
  const style = { "--cards-accent": TYPE_ACCENTS[type] } as React.CSSProperties;
  return (
    <div className={`cards-text-card${full ? " cards-text-card--full" : ""}`} style={style}>
      <p className="cards-text-badge">
        <span className="cards-text-badge-dot" aria-hidden="true" />
        {eyebrow}
      </p>
      <TitleTag className="cards-text-title">{title}</TitleTag>
      {subtitle ? <p className="cards-text-subtitle">{subtitle}</p> : null}
      {dateLabel ? <p className="cards-text-date">{dateLabel}</p> : null}
    </div>
  );
}

// A dedicated treatment for quotes: the generic TextCard (foreground type
// + accent stripe) read as "a card on top of a card" once nested inside the
// feed item's own rounded, shadowed surface. This leans into that instead —
// the card itself becomes a piece of writing paper (warm parchment tone,
// faint ruled lines, a per-post tilt so it reads as something set down
// rather than a UI rectangle), with the quote set in a cursive hand rather
// than the site's system UI font. The tilt/paper coloring is fixed
// regardless of light/dark mode, the same way a photo doesn't invert for
// dark mode — it's a physical object, not interface chrome.
function QuoteCard({
  title,
  subtitle,
  dateLabel,
  seed,
  titleTag: TitleTag = "h2",
  full = false,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  dateLabel?: string;
  seed: string;
  titleTag?: "h1" | "h2";
  full?: boolean;
}) {
  const tilt = ((hashSeed(seed) % 9) - 4) * 0.25;
  const style = { "--cards-quote-tilt": `${tilt}deg` } as React.CSSProperties;
  return (
    <div className={`cards-quote-card${full ? " cards-quote-card--full" : ""}`} style={style}>
      <TitleTag className="cards-quote-text">{title}</TitleTag>
      {subtitle ? <p className="cards-quote-author">{subtitle}</p> : null}
      {dateLabel ? <p className="cards-quote-date">{dateLabel}</p> : null}
    </div>
  );
}

// A dedicated treatment for photos: unlike every other card, the photo
// itself is the whole point rather than a backdrop for text, so it doesn't
// get the Hero's dark scrim + overlaid caption — that treatment exists to
// keep light-colored text legible over an arbitrary image, which just
// muddies the photo when the image *is* the content. Caption sits in normal
// flow above instead, and the image renders uncropped and unobscured below.
// The EXIF strip (only present once `full`, i.e. only on the detail page —
// a compact feed tile has no room for it) is set in the system's monospace
// stack, which resolves to San Francisco Mono on Apple's own platforms —
// the same face its Camera/Photos apps use for exposure readouts — while
// still falling back cleanly elsewhere, without hosting a font of our own.
function PhotoCard({
  eyebrow,
  title,
  subtitle,
  dateLabel,
  hero,
  exif,
  titleTag: TitleTag = "h2",
  full = false,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  dateLabel?: string;
  hero: CardsHero;
  exif?: CardsExifRow[];
  titleTag?: "h1" | "h2";
  full?: boolean;
}) {
  return (
    <div className={`cards-photo-card${full ? " cards-photo-card--full" : ""}`}>
      <div className="cards-photo-caption">
        <p className="cards-photo-eyebrow">{eyebrow}</p>
        <TitleTag className="cards-photo-title">{title}</TitleTag>
        {subtitle ? <p className="cards-photo-subtitle">{subtitle}</p> : null}
        {dateLabel ? <p className="cards-photo-date">{dateLabel}</p> : null}
      </div>
      <img className="cards-photo-image" src={hero.imageUrl} alt={hero.imageAlt} loading="lazy" />
      {full && exif && exif.length > 0 ? (
        <dl className="cards-photo-exif">
          {exif.map((row) => (
            <div className="cards-photo-exif-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function CloseButton({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <a className="cards-close" href={backHref} aria-label={backLabel}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    </a>
  );
}

// The feed-list rendering of a post: a full-bleed card that's also a plain
// <a> (works with JS disabled — it's a normal link to the detail page).
// `data-cards-card` is the hook the client script uses to intercept the
// click and animate into the detail view instead of a hard navigation.
export function CardsFeedItem({ href, eyebrow, title, subtitle, type, hero, variant }: CardsItemData) {
  return (
    <a
      className={`cards-item${variant === "quote" ? " cards-item--quote" : ""}`}
      href={href}
      data-cards-card
      data-cards-variant={variant}
    >
      {hero.imageUrl ? (
        <Hero hero={hero} caption={<Caption eyebrow={eyebrow} title={title} subtitle={subtitle} />} />
      ) : variant === "quote" ? (
        <QuoteCard title={title} subtitle={subtitle} seed={hero.gradientSeed} />
      ) : (
        <TextCard eyebrow={eyebrow} title={title} subtitle={subtitle} type={type} />
      )}
    </a>
  );
}

// The top-of-page header on a detail page in the cards theme: same visual
// language as the feed card (full-bleed hero + overlaid caption) but
// stretched taller and immersive, plus the persistent close control. A
// text-only post skips the immersive full-bleed treatment entirely — a
// forced ~72vh block of nothing but an accent color behind a couple of
// sentences reads as empty space, not "immersive" — and lands directly in
// a normal readable column instead, at full, unclamped length. The close
// control is a real link (not a script-built button) so it works
// identically whether the page was reached by a hard navigation or by the
// client script's animated overlay — the script just intercepts its click
// to animate the close instead of letting it navigate.
export function CardsDetailHeader({
  eyebrow,
  title,
  subtitle,
  type,
  dateLabel,
  hero,
  backHref,
  backLabel,
  variant,
  exif,
}: CardsItemData & { dateLabel: string; backHref: string; backLabel: string }) {
  if (variant === "photo") {
    return (
      <>
        <CloseButton backHref={backHref} backLabel={backLabel} />
        <header className="cards-detail-header cards-detail-header--photo">
          <PhotoCard
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            dateLabel={dateLabel}
            hero={hero}
            exif={exif}
            titleTag="h1"
            full
          />
        </header>
      </>
    );
  }
  if (!hero.imageUrl) {
    const headerClass = `cards-detail-header cards-detail-header--text${variant === "quote" ? " cards-detail-header--quote" : ""}`;
    return (
      <>
        <CloseButton backHref={backHref} backLabel={backLabel} />
        <header className={headerClass}>
          {variant === "quote" ? (
            <QuoteCard title={title} subtitle={subtitle} dateLabel={dateLabel} seed={hero.gradientSeed} titleTag="h1" full />
          ) : (
            <TextCard
              eyebrow={eyebrow}
              title={title}
              subtitle={subtitle}
              dateLabel={dateLabel}
              type={type}
              titleTag="h1"
              full
            />
          )}
        </header>
      </>
    );
  }
  return (
    <>
      <CloseButton backHref={backHref} backLabel={backLabel} />
      <header className="cards-detail-header">
        <Hero
          hero={hero}
          className="cards-detail-hero"
          caption={<Caption eyebrow={eyebrow} title={title} subtitle={subtitle} dateLabel={dateLabel} titleTag="h1" />}
        />
      </header>
    </>
  );
}

// A book's cover has a real, fixed shape — a paperback, not a landscape
// photo — so it can't share the generic Hero's 4:3 crop or scrim-overlaid
// caption without either cropping most of the cover away (on the desktop
// breakpoint) or fighting the cover art's own typography with white text
// on top of it. This keeps the cover intact at its own portrait aspect
// ratio, with title/author/rating set as real page text next to it —
// beside it once there's room, stacked below it on a narrow viewport —
// the same way a bookstore shelf card places the blurb next to the
// jacket photo rather than printing it across the cover.
export function CardsBookDetailHeader({
  eyebrow,
  title,
  author,
  stars,
  ratingLabel,
  dateLabel,
  coverUrl,
  coverAlt,
  backHref,
  backLabel,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  author?: React.ReactNode;
  stars?: string | null;
  ratingLabel?: string;
  dateLabel?: string;
  coverUrl: string;
  coverAlt: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <>
      <CloseButton backHref={backHref} backLabel={backLabel} />
      <header className="cards-book-header">
        <img className="cards-book-cover" src={coverUrl} alt={coverAlt} loading="lazy" />
        <div className="cards-book-meta">
          <p className="cards-book-eyebrow">{eyebrow}</p>
          <h1 className="cards-book-title">{title}</h1>
          {author ? <p className="cards-book-author">{author}</p> : null}
          {stars ? (
            <p className="cards-book-rating">
              <span aria-hidden="true">{stars}</span>
              {ratingLabel ? <span className="sr-only">{ratingLabel}</span> : null}
            </p>
          ) : null}
          {dateLabel ? <p className="cards-book-date">{dateLabel}</p> : null}
        </div>
      </header>
    </>
  );
}

const TAB_PATHS: Array<{ href: string; key: MessageKey }> = [
  { href: "/", key: "home" },
  { href: "/posts", key: "posts" },
  { href: "/articles", key: "articles" },
  { href: "/books", key: "books" },
  { href: "/music", key: "music" },
  { href: "/photos", key: "photos" },
  { href: "/quotes", key: "quotes" },
];

// A bottom tab bar stands in for the App Store's Today/Games/Apps row —
// it's the one piece of the reference chrome that's a bottom bar rather
// than a top one, and it reads as much more native to the full-bleed card
// feed than squeezing the classic top nav row above it would.
export function CardsTabBar({
  locale,
  currentPath,
  availablePaths,
}: {
  locale: string;
  currentPath: string;
  /** Nav paths (e.g. "/posts") that have at least one published post. When omitted, all tabs are shown. */
  availablePaths?: string[];
}) {
  const tabs = availablePaths
    ? TAB_PATHS.filter((tab) => tab.href === "/" || availablePaths.includes(tab.href))
    : TAB_PATHS;
  return (
    <nav className="cards-tabbar" aria-label={t(locale, "primaryNavigation")}>
      {tabs.map((tab) => {
        const active = tab.href === "/" ? currentPath === "/" : currentPath.startsWith(tab.href);
        return (
          <a key={tab.href} href={tab.href} aria-current={active ? "page" : undefined}>
            {t(locale, tab.key)}
          </a>
        );
      })}
    </nav>
  );
}

export const cardsStyles = `
  body.theme-cards { max-width: none; padding: 0; }
  body.theme-cards main { max-width: 1120px; margin: 0 auto; padding: 1.25rem 1.25rem 6rem; }
  body.theme-cards header.site-header { max-width: 1120px; margin: 0 auto; padding: 1.25rem 1.25rem 0; }
  /* Sits right after main's own 6rem bottom padding (above), which already
     clears the fixed tab bar for whatever content precedes the footer, so
     the footer only needs its own clearance below its own content. */
  body.theme-cards footer.site-footer {
    max-width: 1120px; margin: 0 auto; padding: 1.5rem 1.25rem 6rem; border-top: 1px solid var(--border);
  }
  body.theme-cards .about-content { max-width: 640px; margin: 0 auto; }
  /* The bottom tab bar is the only nav in this theme — the classic text-link
     row would just repeat it at the top of every page. */
  body.theme-cards header.site-header nav { display: none; }
  body.theme-cards[data-cards-detail="true"] header.site-header,
  body.theme-cards[data-cards-detail="true"] .cards-tabbar { display: none; }

  /* align-items: start (rather than the grid default of stretch) lets a
     short text card size to its own content instead of being stretched to
     match a taller photo card sharing its row — a compact card for a short
     thought reads as intentional, a short thought stretched to fill 400px
     of near-empty card reads as broken. */
  .cards-feed { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; align-items: start; }

  .cards-item {
    position: relative; display: block; border-radius: 20px; overflow: hidden;
    text-decoration: none; color: inherit; background: var(--bg);
    box-shadow: 0 1px 3px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.12);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .cards-item:hover { transform: translateY(-2px); box-shadow: 0 2px 6px rgba(0,0,0,0.18), 0 14px 32px rgba(0,0,0,0.16); }
  .cards-item:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }

  .cards-hero {
    position: relative; aspect-ratio: 4 / 3; background-size: cover; background-position: center;
  }
  .cards-hero img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cards-scrim { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 75%); }
  .cards-caption { position: absolute; left: 0; right: 0; bottom: 0; z-index: 1; padding: 1.1rem 1.25rem 1.25rem; color: #fff; }
  .cards-eyebrow {
    margin: 0 0 0.25rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: rgba(255,255,255,0.88); text-shadow: 0 1px 2px rgba(0,0,0,0.4);
  }
  .cards-title {
    margin: 0; font-size: 1.4rem; line-height: 1.2; font-weight: 800;
    text-shadow: 0 1px 3px rgba(0,0,0,0.45);
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  }
  .cards-subtitle {
    margin: 0.4rem 0 0; font-size: 0.95rem; color: rgba(255,255,255,0.9); text-shadow: 0 1px 2px rgba(0,0,0,0.4);
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .cards-date { margin: 0.6rem 0 0; font-size: 0.85rem; color: rgba(255,255,255,0.75); }

  /* Detail header: the same hero+caption language, stretched taller and
     bled to the edges of the viewport regardless of main's centered
     max-width, to read as immersive rather than "a big card in a column." */
  .cards-detail-header { position: relative; width: 100vw; margin-left: calc(50% - 50vw); }
  .cards-detail-hero { aspect-ratio: auto; min-height: min(72vh, 640px); border-radius: 0; }
  /* No line-clamp here: this heading is the entire content of its own
     page, with nothing below it restoring the truncated part (unlike a
     feed card's title, which is a summary of a page you can still open) —
     silently hiding part of it would leave no way to read the rest. */
  .cards-detail-header .cards-title { font-size: clamp(1.6rem, 4vw, 2.4rem); }
  .cards-detail-header .cards-caption { max-width: 1120px; margin: 0 auto; padding-left: max(1.25rem, env(safe-area-inset-left)); padding-right: max(1.25rem, env(safe-area-inset-right)); padding-bottom: 1.75rem; }

  /* On a wide viewport, a cover-image detail header bled to the full
     100vw browser width reads as a thin, oversized banner rather than
     "immersive" — that framing only works when the viewport itself is
     narrow enough to already feel edge-to-edge, i.e. mobile. From tablet
     width up, drop the full-bleed treatment and present the same
     hero+caption as a large centered card instead, closer to how the App
     Store itself renders an expanded card on a bigger screen. */
  @media (min-width: 720px) {
    .cards-detail-header:not(.cards-detail-header--text):not(.cards-detail-header--photo) {
      width: auto; max-width: 640px;
      margin: max(2.5rem, calc(env(safe-area-inset-top) + 1.5rem)) auto 0;
      border-radius: 24px; overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.12);
    }
    .cards-detail-header:not(.cards-detail-header--text):not(.cards-detail-header--photo) .cards-detail-hero {
      min-height: 0; aspect-ratio: 4 / 3;
    }
  }

  /* Text-only card (no cover image): real foreground-colored type on the
     card's own surface instead of white text forced onto a colored block
     standing in for a missing photo. A small type badge (dot + label)
     carries the color identity a cover image would otherwise give the
     card. It sits fully inside the card's own padding rather than as an
     edge-to-edge stripe, so — unlike the old border-top treatment — it
     never has to track the card's own corner radius, on the feed or the
     detail page. */
  .cards-text-card {
    position: relative; padding: 1.5rem 1.375rem 1.25rem; background: var(--bg);
  }
  .cards-text-badge {
    display: inline-flex; align-items: center; gap: 0.4em;
    margin: 0 0 0.75rem; padding: 0.28em 0.7em 0.28em 0.55em; border-radius: 999px;
    background: color-mix(in srgb, var(--cards-accent) 16%, var(--bg));
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em;
    text-transform: uppercase; color: var(--cards-accent);
  }
  .cards-text-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--cards-accent); flex-shrink: 0; }
  .cards-text-title {
    margin: 0; font-size: 1.2rem; line-height: 1.45; font-weight: 600; color: var(--fg);
    display: -webkit-box; -webkit-line-clamp: 8; -webkit-box-orient: vertical; overflow: hidden;
  }
  .cards-text-subtitle { margin: 0.6rem 0 0; font-size: 0.9rem; color: var(--muted); }
  .cards-text-date { margin: 0.75rem 0 0; font-size: 0.8rem; color: var(--muted); }

  /* The detail page's version of the same card: unclamped (see the note
     on .cards-detail-header .cards-title above — this is the whole page's
     content, nothing below it can recover a truncated line), and set in a
     normal readable column rather than the full-bleed immersive header a
     cover image gets, since a forced ~72vh block of nothing but an accent
     color behind a couple of sentences reads as empty space, not immersive. */
  .cards-detail-header--text {
    width: auto; max-width: 680px; margin: 0 auto;
    padding: max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem)) 1.25rem 0;
  }
  .cards-detail-header--text .cards-text-card { padding: 1.75rem 1.75rem 1.5rem; border-radius: 16px; }
  .cards-detail-header--text .cards-text-card--full .cards-text-title { -webkit-line-clamp: unset; }
  .cards-detail-header--text .cards-text-title { font-size: clamp(1.3rem, 3.2vw, 1.75rem); }

  /* Book detail header: a cover has its own fixed portrait shape, unlike
     a photo — forcing it into the generic hero's 4:3 landscape crop (the
     desktop rule above) or overlaying title/author on top of the cover
     art the way a photo caption does would both fight the cover rather
     than showcase it. Cover and metadata stack narrow-viewport (where
     there isn't width for both side by side and to still read the cover
     at a reasonable size) and sit side by side from the same tablet
     breakpoint the other detail headers switch at. */
  .cards-book-header {
    display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
    max-width: 680px; margin: 0 auto; text-align: center;
    padding: max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem)) 1.25rem 0;
  }
  .cards-book-cover {
    width: min(55vw, 220px); aspect-ratio: 2 / 3; object-fit: cover;
    border-radius: 4px; flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2), 0 12px 28px rgba(0,0,0,0.25);
  }
  .cards-book-meta { min-width: 0; }
  .cards-book-eyebrow {
    margin: 0 0 0.3rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--muted);
  }
  .cards-book-title { margin: 0; font-size: clamp(1.3rem, 3.2vw, 1.75rem); line-height: 1.25; }
  .cards-book-author { margin: 0.4rem 0 0; font-size: 1rem; color: var(--muted); }
  .cards-book-rating { margin: 0.6rem 0 0; font-size: 1.15rem; letter-spacing: 0.05em; color: #c9971f; }
  .cards-book-date { margin: 0.6rem 0 0; font-size: 0.8rem; color: var(--muted); }
  @media (min-width: 720px) {
    .cards-book-header { flex-direction: row; align-items: flex-start; text-align: left; gap: 2rem; }
    .cards-book-cover { width: 220px; }
  }

  /* Quote card: a piece of writing paper rather than a UI rectangle. The
     outer .cards-item link normally supplies its own rounded, shadowed
     surface, which made the text card read as "a card on top of a card" —
     here the paper card carries its own shadow and tilt instead, so the
     link wrapping it is stripped back to nothing. Paper tone and tilt are
     fixed regardless of light/dark mode, same as a photo not inverting for
     dark mode: it's a physical object sitting on the page, not chrome. */
  .cards-item--quote { background: transparent; box-shadow: none; border-radius: 0; overflow: visible; }
  .cards-item--quote:hover { box-shadow: none; }
  /* The outer link's outline draws on its own unrotated box, which no
     longer matches the visible (rotated) paper surface, so the focus
     ring is moved onto .cards-quote-card itself instead — see the note
     above on why the paper is a child div rather than the link's own
     surface. */
  .cards-item--quote:focus-visible { outline: none; }
  .cards-item--quote:focus-visible .cards-quote-card { outline: 3px solid var(--focus); outline-offset: 3px; }
  .cards-quote-card {
    position: relative;
    background:
      repeating-linear-gradient(to bottom, transparent 0, transparent 1.85rem, rgba(61,50,34,0.07) 1.85rem, rgba(61,50,34,0.07) calc(1.85rem + 1px)),
      linear-gradient(160deg, #fffdf7, #f8f1e2 65%);
    padding: 2.1rem 1.75rem 1.5rem;
    border-radius: 5px;
    box-shadow: 0 1px 2px rgba(30,20,5,0.12), 0 12px 28px rgba(30,20,5,0.2);
    transform: rotate(var(--cards-quote-tilt, 0deg));
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .cards-item--quote:hover .cards-quote-card { transform: rotate(0deg) translateY(-2px); box-shadow: 0 2px 4px rgba(30,20,5,0.14), 0 18px 36px rgba(30,20,5,0.22); }
  /* A typewritten letter rather than a handwritten one — ink-struck,
     slightly irregular type from a manual machine, still a personal note
     but a different idea of "letter" than a script face gives. Special
     Elite is loaded for Latin text (see the font <link> in Layout.tsx); a
     script in another writing system falls through per-character to the
     next font that has the glyph (here, the monospace fallback), same as
     any other font stack, so a non-Latin quote still renders legibly
     rather than showing missing-glyph boxes. */
  .cards-quote-text {
    margin: 0; font-family: "Special Elite", "Courier New", monospace;
    font-size: 1.05rem; line-height: 1.65; color: #3a3122;
    display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden;
  }
  .cards-quote-card--full .cards-quote-text { -webkit-line-clamp: unset; }
  .cards-quote-author {
    margin: 0.9rem 0 0; text-align: right;
    font-family: "Special Elite", "Courier New", monospace;
    font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.06em; color: #6b5a3d;
  }
  .cards-quote-author::before { content: "— "; }
  .cards-quote-date {
    margin: 1.25rem 0 0; padding-top: 0.7rem; border-top: 1px dashed rgba(61,50,34,0.28);
    font-size: 0.78rem; color: #6b5a3d; text-align: right; letter-spacing: 0.02em;
  }
  .cards-detail-header--quote .cards-quote-card { padding: 2.5rem 2rem 1.75rem; border-radius: 8px; }
  .cards-detail-header--quote .cards-quote-text { font-size: clamp(1.15rem, 2.4vw, 1.5rem); }

  /* Photo card: the one card in this theme where the image itself is the
     whole point rather than a backdrop carrying overlaid text, so it skips
     the Hero's dark scrim entirely — caption sits in normal document flow
     above a plain, unobscured photo instead of fighting it for contrast. */
  .cards-photo-caption { padding: 1.1rem 1.25rem 0; }
  .cards-photo-eyebrow {
    margin: 0 0 0.25rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--muted);
  }
  .cards-photo-title {
    margin: 0; font-size: 1.15rem; line-height: 1.3; font-weight: 700; color: var(--fg);
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  }
  .cards-photo-subtitle {
    margin: 0.35rem 0 0; font-size: 0.9rem; color: var(--muted);
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .cards-photo-date { margin: 0.5rem 0 0; font-size: 0.8rem; color: var(--muted); }
  .cards-photo-card--full .cards-photo-title,
  .cards-photo-card--full .cards-photo-subtitle { -webkit-line-clamp: unset; }
  .cards-photo-card--full .cards-photo-title { font-size: clamp(1.4rem, 3.4vw, 1.9rem); }

  .cards-photo-image { display: block; width: 100%; height: auto; margin-top: 1rem; }
  /* The feed grid needs a predictable tile height, so the compact card
     still crops to the same 4:3 every other tile uses — just without a
     scrim, since no text rides on top of it here. The detail page has no
     such constraint and shows the photo at its own natural aspect ratio. */
  .cards-photo-card:not(.cards-photo-card--full) .cards-photo-image { aspect-ratio: 4 / 3; object-fit: cover; }
  /* Detail page: give the photo a fixed display frame instead of just
     however tall its own aspect ratio happens to make it, and let it show
     through object-fit: contain rather than cropping to that frame — the
     whole image at the largest size that fits, for any aspect ratio,
     landscape or portrait. No background needed on the image itself: the
     immersive black backdrop below (.cards-detail-header--photo) already
     shows through any letterbox gap, so the frame reads as part of the
     same black viewer rather than a separate boxed image sitting on it. */
  .cards-photo-card--full .cards-photo-image {
    height: min(70vh, 640px); width: 100%;
    object-fit: contain;
    border-radius: 12px;
  }

  /* EXIF strip: detail page only (see PhotoCard's \`full\` guard) — a compact
     feed tile has no room for it. Set in the system's monospace stack,
     which resolves to San Francisco Mono on Apple's own platforms (the same
     face its Camera/Photos apps use for exposure readouts) while still
     falling back cleanly elsewhere, without this site hosting a font of its
     own. Tabular figures and tracked-out uppercase labels read as a
     technical instrument readout rather than more page prose. */
  .cards-photo-exif {
    margin: 1.25rem 0 0; padding: 0.9rem 0 0; border-top: 1px solid var(--border);
    display: flex; flex-wrap: wrap; gap: 0.7rem 1.75rem;
    font-family: ui-monospace, "SF Mono", "SFMono-Regular", Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
  }
  .cards-photo-exif-row { margin: 0; }
  .cards-photo-exif-row dt {
    margin: 0 0 0.15rem; font-size: 0.66rem; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--muted);
  }
  .cards-photo-exif-row dd { margin: 0; font-size: 0.85rem; color: var(--fg); letter-spacing: 0.01em; }

  /* Detail page: an immersive black viewer rather than a card floating on
     the page's own background — the one detail page in this theme meant to
     feel like a fullscreen photo viewer (Photos.app, Lightroom) rather
     than a document. Bled to 100vw the same way the generic cover-image
     detail header is (see .cards-detail-header above) and held to at
     least one viewport tall so the black fills the screen immediately,
     not just whatever height the caption+photo+EXIF happen to need. Fixed
     black regardless of light/dark mode, same reasoning as the quote
     card's fixed paper tone: this is viewer chrome around the photo, not
     page content that should invert. */
  .cards-detail-header--photo { width: 100vw; margin-left: calc(50% - 50vw); background: #000; min-height: 100vh; }
  /* On a hard page load (no JS — see the client-side overlay below, which
     doesn't hit this since it never puts fetched content inside a <main>)
     \`main\`'s own fixed 6rem bottom padding (body.theme-cards main, above)
     would otherwise leave a trailing strip of the page's own background
     below the header, breaking the immersion right at the bottom edge. */
  body.theme-cards:has(.cards-detail-header--photo) main { padding-bottom: 0; }
  /* The actual content column, centered inside that black bleed — widens
     past this on desktop (see the media query below) since there the
     photo itself should be the large, dominant element rather than
     stopping at the same width a couple of sentences of body text gets. */
  .cards-photo-card--full {
    max-width: 640px; margin: 0 auto;
    padding: max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem)) 1.25rem 3rem;
  }
  .cards-detail-header--photo .cards-photo-caption { padding: 0; }
  /* Light-on-black overrides for the caption/EXIF text, matching the fixed
     black backdrop above — the theme's --fg/--muted/--border tokens are
     tuned for a page background that's light in light mode and dark in
     dark mode, not a backdrop that's always black regardless of mode. */
  .cards-photo-card--full .cards-photo-eyebrow { color: rgba(255,255,255,0.65); }
  .cards-photo-card--full .cards-photo-title { color: #fff; }
  .cards-photo-card--full .cards-photo-subtitle { color: rgba(255,255,255,0.82); }
  .cards-photo-card--full .cards-photo-date { color: rgba(255,255,255,0.6); }
  .cards-photo-card--full .cards-photo-exif { border-top-color: rgba(255,255,255,0.18); }
  .cards-photo-card--full .cards-photo-exif-row dt { color: rgba(255,255,255,0.55); }
  .cards-photo-card--full .cards-photo-exif-row dd { color: rgba(255,255,255,0.92); }
  @media (min-width: 720px) {
    .cards-photo-card--full { max-width: min(92vw, 1080px); }
    .cards-photo-card--full .cards-photo-image { height: min(78vh, 820px); }
  }

  /* Body content beneath a detail header — the "content beneath" the App
     Store's expanded card falls back to a normal readable text column
     rather than staying full-bleed, same as the classic theme's article body. */
  .cards-body { max-width: 680px; margin: 1.75rem auto 0; padding: 0 1.25rem; }
  .cards-body p { margin: 0 0 1rem; }

  .cards-close {
    position: fixed; top: max(1rem, env(safe-area-inset-top)); right: max(1rem, env(safe-area-inset-right));
    z-index: 1100; width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: rgba(20,20,20,0.55); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    color: #fff; text-decoration: none;
  }
  .cards-close:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }

  .cards-tabbar {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 900;
    display: flex; justify-content: space-around; gap: 0.25rem;
    padding: 0.6rem max(0.5rem, env(safe-area-inset-left)) max(0.6rem, env(safe-area-inset-bottom));
    background: color-mix(in srgb, var(--bg) 82%, transparent);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid var(--border);
  }
  .cards-tabbar a {
    font-size: 0.75rem; text-decoration: none; color: var(--muted); padding: 0.25rem 0.5rem; border-radius: 8px;
  }
  .cards-tabbar a[aria-current="page"] { color: var(--focus); font-weight: 700; }
  .cards-tabbar a:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }

  html.cards-lock-scroll, html.cards-lock-scroll body { overflow: hidden; }

  /* backdrop-filter itself is NOT transitioned (Safari doesn't interpolate
     it smoothly — it stays at its start value for most of the transition
     and then snaps to the end value near the end, instead of gradually
     blurring/unblurring). Keep the blur amount constant and fade the whole
     element via opacity instead, which fades the dim + blur together as
     one unit and animates reliably everywhere. */
  .cards-overlay-backdrop {
    position: fixed; inset: 0; z-index: 1000; background: rgba(10,10,10,0.4);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    opacity: 0; transition: opacity 0.32s ease;
  }
  .cards-overlay-backdrop--visible { opacity: 1; }

  /* Static full-viewport box, positioned/sized only via \`transform\` — never
     top/left/width/height — so the open/close animation runs on the
     compositor thread instead of forcing layout on every frame. */
  .cards-panel {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: var(--bg); z-index: 1001; overflow: hidden;
    transform-origin: 0 0; will-change: transform, border-radius;
  }
  .cards-panel-scroll { position: absolute; inset: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
  .cards-panel-scroll:focus { outline: none; }
  .cards-panel-scroll main { padding-bottom: 4rem; }
  /* The open-card script moves focus to the detail heading purely so a
     screen reader announces the new page (see the \`heading.focus()\` call
     below) — the heading has tabindex="-1", so it's never reachable by an
     actual keyboard Tab press, meaning any focus ring on it can only come
     from that scripted call, never a real keyboard user it would need to
     stay visible for. */
  .cards-panel-scroll h1:focus-visible { outline: none; }

  @media (prefers-reduced-motion: reduce) {
    .cards-item, .cards-item:hover { transition: none; transform: none; }
  }

  @media (max-width: 480px) {
    .cards-feed { grid-template-columns: 1fr; }
  }
`;

// Vanilla JS, no build step: this repo serves the site as server-rendered
// HTML with no bundler, so the enhancement ships as one inline <script>.
// Everything here is progressive enhancement over plain <a href> — with JS
// disabled or on failure, every interaction still works as a normal page
// navigation (see the `catch` in openCard and the real href on .cards-close).
export const cardsScript = `
(function () {
  if (!('animate' in Element.prototype) || !window.fetch || !window.history.pushState) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Standard Newton-Raphson cubic-bezier solver (the same algorithm
  // browsers use internally for CSS easing) so the eased curve can be
  // baked directly into WAAPI keyframe offsets/values below, sample by
  // sample, in lockstep with the border-radius correction — a single
  // \`easing\` option on .animate() can't express that per-sample math.
  function cubicBezier(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
    function b(p1, p2) { return 3 * p2 - 6 * p1; }
    function c(p1) { return 3 * p1; }
    function calc(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function slope(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
    return function (x) {
      var t = x;
      for (var i = 0; i < 8; i++) {
        var s = slope(t, x1, x2);
        if (Math.abs(s) < 1e-6) break;
        t -= (calc(t, x1, x2) - x) / s;
      }
      return calc(t, y1, y2);
    };
  }

  // Both open and close use the same plain deceleration (fast start,
  // gentle settle) — no overshoot. OPEN_EASING previously used a "back"
  // curve (cubicBezier(0.34, 1.56, 0.64, 1)) whose eased progress genuinely
  // exceeds 1 partway through, which — since sx/sy in buildFlipKeyframes
  // are computed directly from it with no clamp — made the panel scale
  // past 100vw/100vh at the peak and spring back down right at the end: a
  // real "boing" distinct from (and on top of) the content cross-fade,
  // and the reason open kept reading as a pop even after that was fixed.
  var OPEN_EASING = cubicBezier(0.22, 1, 0.36, 1);
  var CLOSE_EASING = cubicBezier(0.22, 1, 0.36, 1);
  var OPEN_MS = 480, CLOSE_MS = 420;
  var FLIP_STEPS = 30;
  var current = null;

  // A full-screen, non-uniform FLIP (translate + independent X/Y scale)
  // between two rects, animated purely via \`transform\` — never top/left/
  // width/height — so the browser runs it entirely on the compositor
  // thread instead of forcing layout on every frame. The one wrinkle a
  // pure transform introduces: scaling a box non-uniformly (a landscape
  // card growing into a portrait viewport, or back) turns a circular
  // border-radius into an ellipse, since the radius is painted in the
  // element's own local space before the transform stretches it. Correct
  // for that by pre-dividing the *target* radius by the scale at each
  // sampled keyframe (radius/scaleX horizontally, radius/scaleY
  // vertically) so the two cancel out and the corner reads as the
  // intended round radius throughout the animation, not just at its
  // start and end.
  function buildFlipKeyframes(fromRect, toRect, fromRadius, toRadius, easing, fadeOut) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var fromSX = fromRect.width / vw, fromSY = fromRect.height / vh;
    var toSX = toRect.width / vw, toSY = toRect.height / vh;
    var frames = [];
    for (var i = 0; i <= FLIP_STEPS; i++) {
      var t = i / FLIP_STEPS;
      var e = easing(t);
      var sx = fromSX + e * (toSX - fromSX);
      var sy = fromSY + e * (toSY - fromSY);
      var dx = fromRect.left + e * (toRect.left - fromRect.left);
      var dy = fromRect.top + e * (toRect.top - fromRect.top);
      var radius = Math.max(0, fromRadius + e * (toRadius - fromRadius));
      var frame = {
        offset: t,
        transform: 'translate(' + dx.toFixed(2) + 'px, ' + dy.toFixed(2) + 'px) scale(' + sx.toFixed(4) + ', ' + sy.toFixed(4) + ')',
        borderRadius: (radius / sx).toFixed(2) + 'px / ' + (radius / sy).toFixed(2) + 'px',
      };
      // Close only: fade the detail content out well before the shrink
      // gets small enough for the non-uniform scale's stretch (unavoidable
      // once the panel holds real body text, not just a single image) to
      // read as distortion rather than a smooth zoom. Driven by linear
      // time (t), not eased progress (e) — CLOSE_EASING front-loads almost
      // all of its motion into the first few percent, so keying the fade
      // to e made the content vanish in a single jarring frame instead of
      // fading smoothly across the animation.
      if (fadeOut) frame.opacity = String(Math.max(0, 1 - t * 1.6));
      frames.push(frame);
    }
    return frames;
  }

  function isDetailPage() { return document.body.dataset.cardsDetail === 'true'; }

  document.addEventListener('click', function (e) {
    if (isDetailPage() || current) return;
    var link = e.target.closest('[data-cards-card]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openCard(link);
  });

  window.addEventListener('popstate', function () {
    if (current) closeOverlay({ skipHistory: true });
  });

  // iOS Safari's compact bottom toolbar collapses and expands as you
  // scroll, and a plain \`position: fixed; bottom: 0\` element is meant to
  // track that automatically — but on-device this bar can visibly detach
  // and get left behind mid-page instead, landing wherever the layout
  // viewport's bottom happened to be rather than the *visual* viewport's
  // (confirmed on-device; a minimal fixed div with no other styling
  // reproduces it too, so it's not particular to this bar's own CSS).
  // The VisualViewport API reports the actual visible region directly, so
  // nudge the bar to match it with a transform instead of trusting native
  // fixed positioning alone to keep up with the toolbar's animation.
  var tabbarEl = document.querySelector('.cards-tabbar');
  if (tabbarEl && window.visualViewport) {
    var syncTabbar = function () {
      // The rubber-band bounce at the very top of the page (scrollY
      // clamped to 0, but the WKWebView's scroll view still overscrolls
      // past it) also perturbs the visual viewport's own geometry, which
      // this was reading as "the toolbar changed" — nudging the bar along
      // with the bounce instead of leaving it planted the way a plain
      // position: fixed element normally would. The toolbar itself never
      // actually collapses/expands while sitting at the top with nothing
      // left to scroll, so skip the correction there entirely; it only
      // matters once real scrolling has moved past scrollY 0.
      if (window.scrollY <= 0) {
        tabbarEl.style.transform = '';
        return;
      }
      var vv = window.visualViewport;
      var hiddenBelow = window.innerHeight - (vv.height + vv.offsetTop);
      tabbarEl.style.transform = hiddenBelow > 0.5 ? 'translateY(' + (-hiddenBelow).toFixed(2) + 'px)' : '';
    };
    window.visualViewport.addEventListener('resize', syncTabbar);
    window.visualViewport.addEventListener('scroll', syncTabbar);
    syncTabbar();
  }

  function openCard(link) {
    // Photos get their own shared-element transition (see openPhotoCard)
    // instead of this generic whole-panel FLIP — the whole point of that
    // one is that nothing here (a box growing from the card's rect,
    // holding a stretched approximation of the content) applies to it.
    if (link.dataset.cardsVariant === 'photo') { openPhotoCard(link); return; }

    var rect = link.getBoundingClientRect();
    var radius = parseFloat(getComputedStyle(link).borderRadius) || 0;
    var heroEl = link.querySelector('.cards-hero');
    var textEl = link.querySelector('.cards-text-card, .cards-quote-card');

    document.documentElement.classList.add('cards-lock-scroll');

    var backdrop = document.createElement('div');
    backdrop.className = 'cards-overlay-backdrop';
    document.body.appendChild(backdrop);

    var panel = document.createElement('div');
    panel.className = 'cards-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');

    var clone;
    if (heroEl) {
      clone = document.createElement('div');
      clone.className = 'cards-hero';
      clone.style.position = 'absolute';
      clone.style.inset = '0';
      var img = heroEl.querySelector('img');
      var cloneImg = document.createElement('img');
      cloneImg.src = img.currentSrc || img.src;
      cloneImg.alt = '';
      clone.appendChild(cloneImg);
    } else if (textEl) {
      // The text card's real content, not a placeholder — there's no
      // fetch needed to know what it says, so it can just be there from
      // the first frame. Pinned to the top/sides but not the bottom, so
      // it keeps its own natural (content-sized) height while growing
      // rather than being stretched to fill the panel.
      clone = textEl.cloneNode(true);
      clone.style.position = 'absolute';
      clone.style.top = '0'; clone.style.left = '0'; clone.style.right = '0';
    } else {
      clone = document.createElement('div');
    }
    panel.appendChild(clone);

    var fullscreen = { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    var frames = buildFlipKeyframes(rect, fullscreen, radius, 0, OPEN_EASING, false);
    // Paint at the card's own position/size before the first animation
    // frame runs, so there's no flash of a full-screen panel first.
    panel.style.transform = frames[0].transform;
    panel.style.borderRadius = frames[0].borderRadius;
    document.body.appendChild(panel);

    // The clone (see above) is necessarily an approximation of the real
    // detail page, so — same reasoning as CLOSE_EASING's fade, just in
    // reverse — fade it out well before the grow gets big enough for the
    // non-uniform scale's stretch to read as distortion, rather than
    // leaving it at full opacity for the whole zoom and only swapping it
    // for the real content in one visible pop once the fetch resolves.
    // Applied to the clone itself, not the panel — the panel's own
    // background stays solid throughout so the growing box never looks
    // like it's dissolving into the backdrop, only its (approximate)
    // content does. Reuses frames' own offsets so the fade always lines
    // up with the same linear timeline the transform/radius are sampled on.
    var cloneFrames = frames.map(function (f) {
      return { offset: f.offset, opacity: String(Math.max(0, 1 - f.offset * 1.6)) };
    });

    var main = document.getElementById('main-content');
    if (main) main.inert = true;
    var tabbar = document.querySelector('.cards-tabbar');
    if (tabbar) tabbar.inert = true;

    requestAnimationFrame(function () {
      backdrop.classList.add('cards-overlay-backdrop--visible');
      if (reduceMotion) {
        var last = frames[frames.length - 1];
        panel.style.transform = last.transform;
        panel.style.borderRadius = last.borderRadius;
      } else {
        // Easing is already baked into the keyframes' offsets/values
        // (see buildFlipKeyframes), so play them back linearly.
        var openAnim = panel.animate(frames, { duration: OPEN_MS, easing: 'linear', fill: 'forwards' });
        openAnim.onfinish = function () {
          // A fill:'forwards' animation keeps overriding direct style
          // writes to the same properties indefinitely — commit its end
          // state into real inline styles and release it, so the drag
          // gesture and the close animation's own writes below aren't
          // silently fighting a lingering finished animation.
          try { openAnim.commitStyles(); } catch (err) {}
          openAnim.cancel();
        };
        var cloneFadeAnim = clone.animate(cloneFrames, { duration: OPEN_MS, easing: 'linear', fill: 'forwards' });
        cloneFadeAnim.onfinish = function () {
          // Same fill:'forwards' hazard as openAnim above — release it once
          // it's done so a later write (there isn't one today, but keeps
          // this element as unsurprising as the others) isn't silently
          // ignored.
          try { cloneFadeAnim.commitStyles(); } catch (err) {}
          cloneFadeAnim.cancel();
        };
      }
    });

    finishOpen(link, panel, clone, backdrop);
  }

  // A photo's feed thumbnail is a cropped (object-fit: cover) rectangle
  // and its detail view is the whole, uncropped image (object-fit:
  // contain) sitting on a fixed black backdrop — two different shapes, in
  // two different places, with real caption text between them. FLIPping
  // one box between those (the generic openCard's approach) means
  // stretching that whole mismatch uniformly, which is what read as "a
  // white/black card growing" rather than "the photo moving." This
  // instead moves only the image itself from its cropped feed position to
  // its real, measured detail position — laying out the actual detail
  // markup up front (real CSS, so the measured position already accounts
  // for the responsive breakpoint, safe-area insets, etc. instead of
  // reimplementing that math here) — while the caption fades/slides in
  // a beat after, and the panel itself just fades to black behind it all.
  // Closer to how the App Store's own card-to-detail transition reads:
  // the asset relocates, the chrome around it arrives separately.
  function openPhotoCard(link) {
    var heroImg = link.querySelector('.cards-hero img');
    var fromRect = heroImg.getBoundingClientRect();
    var eyebrowEl = link.querySelector('.cards-eyebrow');
    var titleEl = link.querySelector('.cards-title');

    document.documentElement.classList.add('cards-lock-scroll');

    var backdrop = document.createElement('div');
    backdrop.className = 'cards-overlay-backdrop';
    document.body.appendChild(backdrop);

    var panel = document.createElement('div');
    panel.className = 'cards-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.style.background = '#000';
    panel.style.opacity = '0';

    var header = document.createElement('header');
    header.className = 'cards-detail-header cards-detail-header--photo';
    var card = document.createElement('div');
    card.className = 'cards-photo-card cards-photo-card--full';

    var caption = document.createElement('div');
    caption.className = 'cards-photo-caption';
    caption.style.opacity = '0';
    caption.style.transform = 'translateY(10px)';
    if (eyebrowEl) {
      var eyebrowClone = document.createElement('p');
      eyebrowClone.className = 'cards-photo-eyebrow';
      eyebrowClone.textContent = eyebrowEl.textContent;
      caption.appendChild(eyebrowClone);
    }
    var titleClone = document.createElement('h1');
    titleClone.className = 'cards-photo-title';
    titleClone.textContent = titleEl ? titleEl.textContent : '';
    caption.appendChild(titleClone);
    // The feed card never shows a date (see Hero/Caption — dateLabel is a
    // detail-only prop), so there's no text to clone here, but the real
    // detail page's .cards-photo-date line still occupies its own row.
    // Leaving it out of the placeholder made the caption one line shorter
    // than the real thing, so the moment the cross-fade below swapped
    // this out for the fetched content, that line's height appeared from
    // nowhere and visibly shoved the image down a few pixels right at the
    // end. Reserving the same row up front — sized correctly, just not
    // showing anything — means the swap only changes the *text* in a slot
    // that was already there, not the layout around it.
    var dateClone = document.createElement('p');
    dateClone.className = 'cards-photo-date';
    dateClone.style.visibility = 'hidden';
    dateClone.textContent = ' ';
    caption.appendChild(dateClone);

    var imgClone = document.createElement('img');
    imgClone.className = 'cards-photo-image';
    imgClone.src = heroImg.currentSrc || heroImg.src;
    imgClone.alt = '';

    card.appendChild(caption);
    card.appendChild(imgClone);
    header.appendChild(card);
    panel.appendChild(header);
    document.body.appendChild(panel);

    var main = document.getElementById('main-content');
    if (main) main.inert = true;
    var tabbar = document.querySelector('.cards-tabbar');
    if (tabbar) tabbar.inert = true;

    requestAnimationFrame(function () {
      backdrop.classList.add('cards-overlay-backdrop--visible');
      // Laid out with the real detail CSS above, imgClone is already
      // exactly where the fetched page will place it — measure that
      // instead of computing it by hand.
      var toRect = imgClone.getBoundingClientRect();

      if (reduceMotion) {
        panel.style.opacity = '1';
        caption.style.opacity = '';
        caption.style.transform = '';
      } else {
        var scaleX = fromRect.width / toRect.width;
        var scaleY = fromRect.height / toRect.height;
        var dx = (fromRect.left + fromRect.width / 2) - (toRect.left + toRect.width / 2);
        var dy = (fromRect.top + fromRect.height / 2) - (toRect.top + toRect.height / 2);
        imgClone.style.transform =
          'translate(' + dx.toFixed(2) + 'px, ' + dy.toFixed(2) + 'px) scale(' + scaleX.toFixed(4) + ', ' + scaleY.toFixed(4) + ')';
        // Force the browser to actually paint that starting transform
        // before the transitions attached below take effect — otherwise
        // this write and the target-value writes that follow coalesce
        // into one frame and nothing visibly animates.
        void imgClone.offsetWidth;

        var captionDelay = Math.round(OPEN_MS * 0.45);
        panel.style.transition = 'opacity ' + Math.round(OPEN_MS * 0.6) + 'ms ease';
        imgClone.style.transition = 'transform ' + OPEN_MS + 'ms cubic-bezier(0.22, 1, 0.36, 1)';
        caption.style.transition = 'opacity 260ms ease ' + captionDelay + 'ms, transform 320ms ease ' + captionDelay + 'ms';

        panel.style.opacity = '1';
        imgClone.style.transform = 'none';
        caption.style.opacity = '1';
        caption.style.transform = 'none';

        setTimeout(function () {
          panel.style.transition = '';
          imgClone.style.transition = '';
          caption.style.transition = '';
        }, OPEN_MS);
      }
    });

    finishOpenPhoto(link, panel, header, card, caption, titleClone, dateClone, backdrop);
  }

  // finishOpen's cross-fade (clone -> scroller, both via opacity) works
  // for the generic path because the clone is only ever an approximation
  // being replaced by something better. Here it isn't: imgClone and
  // caption are already exactly right, so putting them through that same
  // opacity fade doesn't fix anything, it just recreates the "blink" a
  // different way — opacity is a *group* compositing effect, so once
  // they're reparented into a fading container, they get swept along
  // with it regardless of being "the same element," dipping and
  // recovering right along with everything else. So instead of fading a
  // whole container in, this only touches what's actually new: filling in
  // the date text (the one thing the feed card never had — see the
  // comment on dateClone above), and fading in just the close control and
  // EXIF strip (if any), which genuinely didn't exist a moment ago. The
  // image and caption never have opacity applied to them at all after
  // landing, so there's nothing left to blink.
  function finishOpenPhoto(link, panel, header, card, caption, titleClone, dateClone, backdrop) {
    var controller = new AbortController();
    current = { link: link, backdrop: backdrop, panel: panel, controller: controller };
    history.pushState({ cardsOverlay: true }, '', link.href);
    var openStartedAt = Date.now();

    fetch(link.href, { signal: controller.signal })
      .then(function (res) {
        if (!res.ok) throw new Error('bad response');
        return res.text();
      })
      .then(function (html) {
        if (!current || current.panel !== panel) return;
        var elapsed = Date.now() - openStartedAt;
        var remaining = OPEN_MS - elapsed;
        if (remaining > 0) {
          setTimeout(function () { applyFetchedPhotoHtml(html); }, remaining);
        } else {
          applyFetchedPhotoHtml(html);
        }
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;
        window.location.href = link.href;
      });

    function applyFetchedPhotoHtml(html) {
      if (!current || current.panel !== panel) return;
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var fetchedMain = doc.getElementById('main-content');
      if (!fetchedMain) { window.location.href = link.href; return; }
      document.title = doc.title;

      var fetchedDate = fetchedMain.querySelector('.cards-photo-date');
      dateClone.textContent = fetchedDate ? fetchedDate.textContent : '';
      dateClone.style.visibility = '';

      var fetchedExif = fetchedMain.querySelector('.cards-photo-exif');
      if (fetchedExif) card.appendChild(fetchedExif);

      var scroller = document.createElement('div');
      scroller.className = 'cards-panel-scroll';
      scroller.setAttribute('tabindex', '-1');
      var closeLink = fetchedMain.querySelector('.cards-close');
      if (closeLink) scroller.appendChild(closeLink);
      scroller.appendChild(header);
      panel.appendChild(scroller);

      if (!reduceMotion) {
        [closeLink, fetchedExif].forEach(function (el) {
          if (!el) return;
          el.style.opacity = '0';
          el.style.transition = 'opacity 0.2s ease';
          requestAnimationFrame(function () { el.style.opacity = '1'; });
          setTimeout(function () { el.style.transition = ''; el.style.opacity = ''; }, 260);
        });
      }

      if (closeLink) {
        closeLink.addEventListener('click', function (e) {
          e.preventDefault();
          closeOverlay({});
        });
      }

      wireDismissGesture(scroller, panel, backdrop);

      if (!titleClone.id) titleClone.id = 'cards-panel-heading';
      panel.setAttribute('aria-labelledby', titleClone.id);
      titleClone.setAttribute('tabindex', '-1');
      titleClone.focus({ preventScroll: true });
    }

    document.addEventListener('keydown', onKeydown);
  }

  // The rest of opening a card — fetching the real detail page and
  // cross-fading it in over whatever placeholder the entry animation
  // built, wiring up the close control and drag-to-dismiss, moving focus
  // — is identical regardless of *how* that placeholder got on screen, so
  // openCard's generic whole-panel FLIP hands off to this once its own
  // entry animation has started. (openPhotoCard has its own
  // finishOpenPhoto instead — its placeholder's image and caption are
  // already exactly right, and cross-fading a container they sit inside
  // would sweep them into that fade regardless of being "the same
  // element," which is a problem this generic path doesn't have.)
  function finishOpen(link, panel, clone, backdrop) {
    var controller = new AbortController();
    current = { link: link, backdrop: backdrop, panel: panel, controller: controller };
    history.pushState({ cardsOverlay: true }, '', link.href);

    fetch(link.href, { signal: controller.signal })
      .then(function (res) {
        if (!res.ok) throw new Error('bad response');
        return res.text();
      })
      .then(function (html) {
        applyFetchedHtml(html);
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;
        window.location.href = link.href;
      });

    function applyFetchedHtml(html) {
      if (!current || current.panel !== panel) return;
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var fetchedMain = doc.getElementById('main-content');
      if (!fetchedMain) { window.location.href = link.href; return; }
      document.title = doc.title;

      var scroller = document.createElement('div');
      scroller.className = 'cards-panel-scroll';
      scroller.setAttribute('tabindex', '-1');
      while (fetchedMain.firstChild) scroller.appendChild(fetchedMain.firstChild);

      // Cross-fade the loading clone into the real content instead of a
      // hard swap. The clone is necessarily an approximation — a bare
      // cover/photo image with none of its caption, or a feed-sized card
      // that the detail page repads/resizes — so the instant it's
      // replaced by the real markup is a visible pop no matter how close
      // the two are (worst case: a book's nearly-fullscreen cover
      // collapsing straight to its small detail-page thumbnail). Briefly
      // overlapping old and new reads as a deliberate transition instead
      // of a flicker.
      if (reduceMotion) {
        panel.innerHTML = '';
        panel.appendChild(scroller);
      } else {
        scroller.style.opacity = '0';
        scroller.style.transition = 'opacity 0.2s ease';
        panel.appendChild(scroller);
        requestAnimationFrame(function () {
          clone.style.transition = 'opacity 0.2s ease';
          clone.style.opacity = '0';
          scroller.style.opacity = '1';
        });
        setTimeout(function () {
          if (clone.parentNode === panel) panel.removeChild(clone);
          scroller.style.transition = '';
          scroller.style.opacity = '';
        }, 220);
      }

      // The close link moved over with the rest of #main-content's
      // children (it's server-rendered as part of the detail markup, not
      // a script-built button — see CardsDetailHeader) — wire its click
      // here instead of letting it fall through to a hard navigation.
      var closeLink = scroller.querySelector('.cards-close');
      if (closeLink) {
        closeLink.addEventListener('click', function (e) {
          e.preventDefault();
          closeOverlay({});
        });
      }

      wireDismissGesture(scroller, panel, backdrop);

      var heading = scroller.querySelector('h1');
      if (heading) {
        if (!heading.id) heading.id = 'cards-panel-heading';
        panel.setAttribute('aria-labelledby', heading.id);
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      } else {
        scroller.focus({ preventScroll: true });
      }
    }

    document.addEventListener('keydown', onKeydown);
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && current) closeOverlay({});
  }

  function closeOverlay(opts) {
    if (!current) return;
    var o = current;
    current = null;
    document.removeEventListener('keydown', onKeydown);
    o.controller.abort();

    // Read the panel's *current* on-screen box rather than assuming it's
    // full-screen — it may still carry a drag-gesture transform (see
    // wireDismissGesture) if the user let go mid-drag below the commit
    // threshold. getBoundingClientRect reflects that transform correctly,
    // so the close animation always starts exactly where the panel is.
    var fromRect = o.panel.getBoundingClientRect();
    var fromRadius = parseFloat(getComputedStyle(o.panel).borderRadius) || 0;
    var toRect = o.link.getBoundingClientRect();
    var toRadius = parseFloat(getComputedStyle(o.link).borderRadius) || 0;
    o.backdrop.classList.remove('cards-overlay-backdrop--visible');
    // A swipe-to-dismiss drag (see wireDismissGesture below) drives the
    // backdrop's opacity directly via inline style while it's in progress,
    // which outranks the class rule above in specificity — so on a
    // drag-committed close, removing the class alone left the backdrop
    // frozen at whatever opacity the drag let go of for this whole
    // animation, only disappearing in one abrupt jump when cleanup() below
    // removes it from the DOM. Explicitly assigning a fresh value here
    // guarantees the opacity transition actually has something to animate
    // to, regardless of what a drag left behind.
    o.backdrop.style.opacity = '0';

    var main = document.getElementById('main-content');
    if (main) main.inert = false;
    var tabbar = document.querySelector('.cards-tabbar');
    if (tabbar) tabbar.inert = false;

    function cleanup() {
      o.backdrop.remove();
      o.panel.remove();
      document.documentElement.classList.remove('cards-lock-scroll');
      o.link.focus({ preventScroll: true });
    }

    if (reduceMotion) {
      cleanup();
    } else {
      var frames = buildFlipKeyframes(fromRect, toRect, fromRadius, toRadius, CLOSE_EASING, true);
      o.panel.style.transform = frames[0].transform;
      o.panel.style.borderRadius = frames[0].borderRadius;
      var anim = o.panel.animate(frames, { duration: CLOSE_MS, easing: 'linear', fill: 'forwards' });
      anim.onfinish = cleanup;
    }

    if (!opts.skipHistory) history.back();
  }

  // Interactive drag-to-dismiss, matching the standard iOS sheet heuristic:
  // commit the dismiss once the drag passes ~120px or has enough downward
  // velocity, otherwise spring back open. Only starts when the panel's own
  // scroll position is already at the top, so it doesn't fight normal
  // scrolling through the post body.
  function wireDismissGesture(scroller, panel, backdrop) {
    var startY = null, startTime = 0, dragging = false, delta = 0;

    scroller.addEventListener('pointerdown', function (e) {
      if (scroller.scrollTop > 0 || e.button !== 0) return;
      // A tap/click on a link or button (the close control, a retailer
      // link in a book's body, ...) fires the same pointerdown -> pointerup
      // sequence a drag gesture does, just with ~0 movement — which used to
      // fall through to endDrag's "spring back" branch below and force the
      // backdrop back to full opacity, fighting whatever that click just
      // triggered (most visibly: closing overlay's own fade-out, leaving
      // the dim backdrop stuck on screen well past when it should have
      // cleared). A real drag-to-dismiss only ever starts from open
      // content/background, never from a control, so ignore pointerdowns
      // that land on one.
      if (e.target.closest('a, button')) return;
      startY = e.clientY;
      startTime = Date.now();
      dragging = true;
      delta = 0;
    });

    scroller.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var raw = e.clientY - startY;
      if (raw <= 0) { delta = 0; return; }
      delta = raw < 200 ? raw : 200 + (raw - 200) * 0.35;
      var s = 1 - delta / 2400;
      // The panel's transform-origin is its top-left corner (0 0), needed
      // so the open/close FLIP math above has a fixed anchor. Scaling
      // directly from there would shrink the panel toward that corner —
      // pre-translate by the same amount the origin shift would otherwise
      // move the visual center, so the drag still reads as "shrinking
      // toward the middle" the way it would with the default center origin.
      var tx = (1 - s) * window.innerWidth / 2;
      var ty = delta + (1 - s) * window.innerHeight / 2;
      panel.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + s + ')';
      panel.style.borderRadius = Math.min(28, delta / 4) + 'px';
      backdrop.style.opacity = String(Math.max(0.15, 1 - delta / 360));
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      var elapsed = Math.max(1, Date.now() - startTime);
      var velocity = delta / elapsed;
      if (delta > 120 || velocity > 0.5) {
        // closeOverlay reads the panel's current on-screen box via
        // getBoundingClientRect, which reflects this drag's transform
        // correctly — no need to bake anything in first, it can just take
        // over from here directly.
        if (current) closeOverlay({});
      } else {
        var springEasing = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
        panel.style.transition = reduceMotion ? 'none' : 'transform 0.32s ' + springEasing + ', border-radius 0.32s ' + springEasing;
        backdrop.style.transition = 'opacity 0.32s ease';
        panel.style.transform = '';
        panel.style.borderRadius = '';
        backdrop.style.opacity = '1';
        panel.addEventListener('transitionend', function clear() {
          panel.style.transition = '';
          panel.removeEventListener('transitionend', clear);
        });
      }
    }

    scroller.addEventListener('pointerup', endDrag);
    scroller.addEventListener('pointercancel', endDrag);
  }
})();
`;
