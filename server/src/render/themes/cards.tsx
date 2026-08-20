import React from "react";
import { t, type MessageKey } from "../i18n.js";

// A small curated set of color pairs used to give text-only posts (a
// Thought, Quote, or an Article/Book/Music post that hasn't set a cover) a
// per-post color identity — chosen deterministically per post so the same
// post always gets the same accent instead of reshuffling on every render.
const GRADIENTS = [
  ["#4f46e5", "#9333ea"],
  ["#0ea5e9", "#0891b2"],
  ["#db2777", "#9333ea"],
  ["#ea580c", "#dc2626"],
  ["#16a34a", "#0d9488"],
  ["#7c3aed", "#2563eb"],
  ["#c026d3", "#e11d48"],
  ["#0284c7", "#4338ca"],
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// The same per-post color identity used to distinguish text-only cards —
// deterministic per seed so the same post always gets the same accent.
function accentForSeed(seed: string): string {
  return GRADIENTS[hashSeed(seed) % GRADIENTS.length][0];
}

export interface CardsHero {
  imageUrl?: string;
  imageAlt: string;
  gradientSeed: string;
}

export interface CardsItemData {
  href: string;
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  hero: CardsHero;
  /** "quote" renders the letter-card treatment (cursive type on paper) instead of the generic text card. Only meaningful when `hero.imageUrl` is unset. */
  variant?: "quote";
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
// foreground-colored type on the card's own surface, with a thin per-post
// accent stripe standing in for the color identity a cover image would
// otherwise carry. `full` skips the feed card's line-clamp (used on the
// detail page, where the text should never be truncated).
function TextCard({
  eyebrow,
  title,
  subtitle,
  seed,
  dateLabel,
  titleTag: TitleTag = "h2",
  full = false,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  seed: string;
  dateLabel?: string;
  titleTag?: "h1" | "h2";
  full?: boolean;
}) {
  const style = { "--cards-accent": accentForSeed(seed) } as React.CSSProperties;
  return (
    <div className={`cards-text-card${full ? " cards-text-card--full" : ""}`} style={style}>
      <p className="cards-text-eyebrow">{eyebrow}</p>
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
export function CardsFeedItem({ href, eyebrow, title, subtitle, hero, variant }: CardsItemData) {
  return (
    <a className={`cards-item${variant === "quote" ? " cards-item--quote" : ""}`} href={href} data-cards-card>
      {hero.imageUrl ? (
        <Hero hero={hero} caption={<Caption eyebrow={eyebrow} title={title} subtitle={subtitle} />} />
      ) : variant === "quote" ? (
        <QuoteCard title={title} subtitle={subtitle} seed={hero.gradientSeed} />
      ) : (
        <TextCard eyebrow={eyebrow} title={title} subtitle={subtitle} seed={hero.gradientSeed} />
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
  dateLabel,
  hero,
  backHref,
  backLabel,
  variant,
}: CardsItemData & { dateLabel: string; backHref: string; backLabel: string }) {
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
              seed={hero.gradientSeed}
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
export function CardsTabBar({ locale, currentPath }: { locale: string; currentPath: string }) {
  return (
    <nav className="cards-tabbar" aria-label={t(locale, "primaryNavigation")}>
      {TAB_PATHS.map((tab) => {
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
    .cards-detail-header:not(.cards-detail-header--text) {
      width: auto; max-width: 640px;
      margin: max(2.5rem, calc(env(safe-area-inset-top) + 1.5rem)) auto 0;
      border-radius: 24px; overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.12);
    }
    .cards-detail-header:not(.cards-detail-header--text) .cards-detail-hero {
      min-height: 0; aspect-ratio: 4 / 3;
    }
  }

  /* Text-only card (no cover image): real foreground-colored type on the
     card's own surface instead of white text forced onto a colored block
     standing in for a missing photo. A thin per-post accent stripe across
     the top carries the color identity a cover image would otherwise give
     the card, without competing with the text for contrast. */
  .cards-text-card {
    position: relative; padding: 1.5rem 1.375rem 1.25rem; background: var(--bg);
    border-top: 3px solid var(--cards-accent);
  }
  .cards-text-eyebrow {
    margin: 0 0 0.6rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--cards-accent);
  }
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

  /* Quote card: a piece of writing paper rather than a UI rectangle. The
     outer .cards-item link normally supplies its own rounded, shadowed
     surface, which made the text card read as "a card on top of a card" —
     here the paper card carries its own shadow and tilt instead, so the
     link wrapping it is stripped back to nothing. Paper tone and tilt are
     fixed regardless of light/dark mode, same as a photo not inverting for
     dark mode: it's a physical object sitting on the page, not chrome. */
  .cards-item--quote { background: transparent; box-shadow: none; border-radius: 0; overflow: visible; }
  .cards-item--quote:hover { box-shadow: none; }
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
  /* A generic cursive stack — Dancing Script is loaded for Latin text (see
     the font <link> in Layout.tsx); a script in another writing system
     falls through per-character to the next font that has the glyph, same
     as any other font stack, so a non-Latin quote still renders legibly
     rather than showing missing-glyph boxes. */
  .cards-quote-text {
    margin: 0; font-family: "Dancing Script", "Segoe Script", "Apple Chancery", cursive;
    font-weight: 700; font-size: 1.6rem; line-height: 1.35; color: #3a3122;
    display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden;
  }
  .cards-quote-card--full .cards-quote-text { -webkit-line-clamp: unset; }
  .cards-quote-author {
    margin: 0.9rem 0 0; text-align: right;
    font-family: "Dancing Script", "Segoe Script", "Apple Chancery", cursive;
    font-weight: 600; font-size: 1.15rem; color: #6b5a3d;
  }
  .cards-quote-author::before { content: "— "; }
  .cards-quote-date {
    margin: 1.25rem 0 0; padding-top: 0.7rem; border-top: 1px dashed rgba(61,50,34,0.28);
    font-size: 0.78rem; color: #6b5a3d; text-align: right; letter-spacing: 0.02em;
  }
  .cards-detail-header--quote .cards-quote-card { padding: 2.5rem 2rem 1.75rem; border-radius: 8px; }
  .cards-detail-header--quote .cards-quote-text { font-size: clamp(1.6rem, 3.4vw, 2.1rem); }

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

  var OPEN_EASING = cubicBezier(0.34, 1.56, 0.64, 1);
  // Shrinking back into the card is a deceleration (fast start, gentle
  // settle) — the same shape as OPEN_EASING but without the overshoot,
  // since bouncing past the card's own size on the way in looks like a
  // glitch rather than a bounce. The previous curve accelerated instead
  // (barely moved for most of the animation, then snapped shut in the
  // last beat), which read as an abrupt cut rather than a close.
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

  function openCard(link) {
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
      }
    });

    var controller = new AbortController();
    current = { link: link, backdrop: backdrop, panel: panel, controller: controller };
    history.pushState({ cardsOverlay: true }, '', link.href);

    fetch(link.href, { signal: controller.signal })
      .then(function (res) {
        if (!res.ok) throw new Error('bad response');
        return res.text();
      })
      .then(function (html) {
        if (!current || current.panel !== panel) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fetchedMain = doc.getElementById('main-content');
        if (!fetchedMain) throw new Error('no main content');
        document.title = doc.title;

        var scroller = document.createElement('div');
        scroller.className = 'cards-panel-scroll';
        scroller.setAttribute('tabindex', '-1');
        while (fetchedMain.firstChild) scroller.appendChild(fetchedMain.firstChild);

        panel.innerHTML = '';
        panel.appendChild(scroller);

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
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;
        window.location.href = link.href;
      });

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
