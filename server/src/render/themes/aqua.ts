// A turn-of-the-century Apple-inspired skin for the accessible classic
// renderer. Everything is CSS: no remote assets, scripts, or browser-specific
// images are needed to get the pinstriped chrome and translucent gel controls.
export const aquaStyles = `
  html[data-theme="aqua"] {
    --fg: #17212b;
    --bg: #dfe3e8;
    --muted: #596674;
    --border: #9ba5ae;
    --focus: #0066cc;
    --aqua-blue: #1688e8;
    --aqua-surface: rgba(255, 255, 255, 0.92);
    --aqua-shadow: 0 1px 1px rgba(255,255,255,.85) inset, 0 1px 3px rgba(23,33,43,.16), 0 14px 36px rgba(23,33,43,.12);
  }
  @media (prefers-color-scheme: dark) {
    html[data-theme="aqua"] {
      --fg: #f4f7fa; --bg: #20252b; --muted: #b7c0ca; --border: #65717c; --focus: #69b9ff;
      --aqua-blue: #2997ff;
      --aqua-surface: rgba(47, 54, 62, 0.94);
      --aqua-shadow: 0 1px 1px rgba(255,255,255,.16) inset, 0 1px 4px rgba(0,0,0,.45), 0 16px 38px rgba(0,0,0,.3);
    }
  }
  html[data-theme="aqua"] body {
    max-width: none;
    padding: 0;
    background-color: var(--bg);
    background-image:
      radial-gradient(circle at 50% -8rem, rgba(255,255,255,.92), transparent 30rem),
      repeating-linear-gradient(0deg, rgba(255,255,255,.2) 0, rgba(255,255,255,.2) 1px, rgba(91,105,119,.075) 1px, rgba(91,105,119,.075) 3px);
    background-attachment: fixed;
    font-family: "Lucida Grande", "Lucida Sans Unicode", -apple-system, BlinkMacSystemFont, sans-serif;
    letter-spacing: -0.012em;
  }
  html[data-theme="aqua"] header.site-header {
    position: sticky;
    top: 0;
    z-index: 30;
    align-items: center;
    width: 100%;
    min-height: 5.25rem;
    margin: 0 0 2.4rem;
    padding: .72rem max(1.25rem, calc((100vw - 1040px) / 2 + 1.25rem));
    border-top: 1px solid rgba(255,255,255,.95);
    border-bottom: 1px solid #7f8992;
    background:
      linear-gradient(90deg, transparent, rgba(255,255,255,.55) 50%, transparent),
      repeating-linear-gradient(0deg, rgba(255,255,255,.36) 0, rgba(255,255,255,.36) 1px, rgba(104,114,124,.08) 1px, rgba(104,114,124,.08) 3px),
      linear-gradient(#eef1f3, #c2c8ce);
    box-shadow: 0 1px 0 rgba(255,255,255,.72), 0 4px 12px rgba(37,48,58,.2);
  }
  @media (prefers-color-scheme: dark) {
    html[data-theme="aqua"] body {
      background-image:
        radial-gradient(circle at 50% -8rem, rgba(122,143,163,.24), transparent 30rem),
        repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0, rgba(255,255,255,.035) 1px, rgba(0,0,0,.1) 1px, rgba(0,0,0,.1) 3px);
    }
    html[data-theme="aqua"] header.site-header {
      border-top-color: rgba(255,255,255,.23);
      border-bottom-color: #171b1f;
      background:
        repeating-linear-gradient(0deg, rgba(255,255,255,.055) 0, rgba(255,255,255,.055) 1px, rgba(0,0,0,.1) 1px, rgba(0,0,0,.1) 3px),
        linear-gradient(#59616a, #333a41);
      box-shadow: 0 1px 0 rgba(255,255,255,.16), 0 5px 15px rgba(0,0,0,.38);
    }
  }
  html[data-theme="aqua"] header.site-header h1 {
    font-size: 1.42rem;
    font-weight: 700;
    letter-spacing: -.045em;
    text-shadow: 0 1px 0 rgba(255,255,255,.9);
  }
  html[data-theme="aqua"] header.site-header h1 a { display: inline-flex; align-items: center; gap: .65rem; }
  html[data-theme="aqua"] header.site-header h1 a::before {
    content: "";
    width: 1rem;
    height: 1rem;
    flex: 0 0 auto;
    border: 1px solid rgba(0,62,121,.58);
    border-radius: 50%;
    background: radial-gradient(circle at 35% 25%, #fff 0 9%, #8fe2ff 19%, #1688e8 53%, #0751a0 78%, #062d58 100%);
    box-shadow: inset 0 -2px 4px rgba(0,30,80,.45), 0 1px 1px rgba(255,255,255,.9);
  }
  html[data-theme="aqua"] .site-tagline { color: #44515d; font-size: .76rem; text-shadow: 0 1px 0 rgba(255,255,255,.8); }
  html[data-theme="aqua"] main,
  html[data-theme="aqua"] footer.site-footer {
    width: min(100%, 1040px);
    margin-left: auto;
    margin-right: auto;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
  html[data-theme="aqua"] main { min-height: 42vh; }
  html[data-theme="aqua"] .category-filter-trigger,
  html[data-theme="aqua"] .content-action-button {
    min-height: 2.75rem;
    border: 1px solid #176cae;
    border-radius: 999px;
    color: #073d6d;
    background:
      linear-gradient(180deg, rgba(255,255,255,.95) 0 8%, rgba(255,255,255,.28) 9% 45%, rgba(0,77,166,.12) 46% 52%, rgba(255,255,255,.25) 53%),
      linear-gradient(#8dd7ff, #25a0ef 48%, #0876d0 52%, #55bdff);
    box-shadow: inset 0 1px 1px rgba(255,255,255,.92), inset 0 -1px 2px rgba(0,55,120,.32), 0 1px 2px rgba(26,48,67,.22);
    text-shadow: 0 1px 0 rgba(255,255,255,.68);
  }
  html[data-theme="aqua"] .category-filter-trigger:hover,
  html[data-theme="aqua"] .content-action-button:hover { filter: saturate(1.12) brightness(1.04); color: #002f5c; }
  html[data-theme="aqua"] .category-filter-menu {
    border-color: #7c8791;
    border-radius: 8px;
    background: color-mix(in srgb, var(--aqua-surface) 96%, transparent);
    box-shadow: var(--aqua-shadow);
  }
  html[data-theme="aqua"] .category-filter-menu a { border-radius: 5px; }
  html[data-theme="aqua"] .aqua-feed {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.4rem;
  }
  html[data-theme="aqua"] .aqua-feed > .card {
    position: relative;
    min-width: 0;
    margin: 0;
    padding: 2.15rem 1.25rem 1.25rem;
    overflow: hidden;
    border: 1px solid #9aa4ad;
    border-radius: 13px;
    background: var(--aqua-surface);
    box-shadow: var(--aqua-shadow);
    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  }
  html[data-theme="aqua"] .aqua-feed > .card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: .8rem;
    border-bottom: 1px solid #aab2ba;
    background:
      radial-gradient(circle at 1.25rem 50%, #ff6258 0 .2rem, transparent .22rem),
      radial-gradient(circle at 2rem 50%, #ffbd2e 0 .2rem, transparent .22rem),
      radial-gradient(circle at 2.75rem 50%, #28c840 0 .2rem, transparent .22rem),
      repeating-linear-gradient(0deg, rgba(255,255,255,.42) 0 1px, rgba(104,114,124,.07) 1px 3px),
      linear-gradient(#eef1f3, #cbd0d5);
  }
  html[data-theme="aqua"] .aqua-feed > .card:hover {
    border-color: #788693;
    box-shadow: 0 1px 1px rgba(255,255,255,.9) inset, 0 3px 7px rgba(23,33,43,.2), 0 19px 42px rgba(23,33,43,.16);
    transform: translateY(-2px);
  }
  html[data-theme="aqua"] .aqua-feed > .card:nth-child(5n + 1) { border-top-color: #61abd9; }
  html[data-theme="aqua"] .aqua-feed > .card:nth-child(5n + 2) { border-top-color: #ef8e32; }
  html[data-theme="aqua"] .aqua-feed > .card:nth-child(5n + 3) { border-top-color: #77a844; }
  html[data-theme="aqua"] .aqua-feed > .card:nth-child(5n + 4) { border-top-color: #9e79b7; }
  html[data-theme="aqua"] .card h2,
  html[data-theme="aqua"] article > h1,
  html[data-theme="aqua"] .about-page > h1 {
    font-weight: 700;
    letter-spacing: -.045em;
    text-shadow: 0 1px 0 rgba(255,255,255,.72);
  }
  html[data-theme="aqua"] .card img,
  html[data-theme="aqua"] .body-content img,
  html[data-theme="aqua"] .article-detail-cover,
  html[data-theme="aqua"] .book img,
  html[data-theme="aqua"] .music img.artwork {
    border: 1px solid rgba(60,72,84,.42);
    border-radius: 8px;
    box-shadow: 0 1px 0 rgba(255,255,255,.8), 0 5px 14px rgba(31,43,54,.2);
  }
  html[data-theme="aqua"] .music img.artwork { border-radius: 6px; }
  html[data-theme="aqua"] .book img { border-radius: 3px 7px 7px 3px; }
  html[data-theme="aqua"] .quote-text {
    padding: 1.1rem 1.2rem 1rem;
    border: 1px solid #aeb6bd;
    border-left: 5px solid var(--aqua-blue);
    border-radius: 7px;
    background: linear-gradient(135deg, rgba(255,255,255,.82), rgba(202,232,250,.48));
  }
  html[data-theme="aqua"] .link-card {
    border-color: #8f9aa4;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--aqua-surface), color-mix(in srgb, var(--aqua-blue) 10%, var(--aqua-surface)));
  }
  html[data-theme="aqua"] .meta { color: var(--muted); }
  html[data-theme="aqua"] .exif,
  html[data-theme="aqua"] .book-more-links { border-color: color-mix(in srgb, var(--border) 65%, transparent); }
  html[data-theme="aqua"] .pagination { margin-top: 2rem; }
  html[data-theme="aqua"] .pagination a {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    padding: .45rem .9rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--aqua-surface);
    box-shadow: 0 1px 2px rgba(23,33,43,.13);
    text-decoration: none;
  }
  html[data-theme="aqua"] main > article,
  html[data-theme="aqua"] main > .about-page,
  html[data-theme="aqua"] main > .release-history,
  html[data-theme="aqua"] main > .archive-page,
  html[data-theme="aqua"] main > .search-page {
    padding: clamp(1.25rem, 4vw, 2.4rem);
    border: 1px solid #98a3ad;
    border-radius: 13px;
    background: var(--aqua-surface);
    box-shadow: var(--aqua-shadow);
  }
  html[data-theme="aqua"] footer.site-footer { margin-top: 3.25rem; padding-bottom: 2rem; }
  html[data-theme="aqua"] .site-footer-inner {
    border: 1px solid #9aa4ad;
    border-radius: 11px;
    background: var(--aqua-surface);
    box-shadow: var(--aqua-shadow);
  }
  html[data-theme="aqua"] .site-footer-nav { border-top-color: color-mix(in srgb, var(--border) 62%, transparent); }
  @media (prefers-color-scheme: dark) {
    html[data-theme="aqua"] header.site-header h1 { text-shadow: 0 1px 0 rgba(0,0,0,.72); }
    html[data-theme="aqua"] .site-tagline { color: #d0d7de; text-shadow: 0 1px 0 rgba(0,0,0,.7); }
    html[data-theme="aqua"] .category-filter-trigger,
    html[data-theme="aqua"] .content-action-button { color: #061a2c; }
    html[data-theme="aqua"] .aqua-feed > .card::before {
      border-bottom-color: #20252a;
      background:
        radial-gradient(circle at 1.25rem 50%, #ff6258 0 .2rem, transparent .22rem),
        radial-gradient(circle at 2rem 50%, #ffbd2e 0 .2rem, transparent .22rem),
        radial-gradient(circle at 2.75rem 50%, #28c840 0 .2rem, transparent .22rem),
        repeating-linear-gradient(0deg, rgba(255,255,255,.055) 0 1px, rgba(0,0,0,.12) 1px 3px),
        linear-gradient(#5d6670, #353c43);
    }
    html[data-theme="aqua"] .card h2,
    html[data-theme="aqua"] article > h1,
    html[data-theme="aqua"] .about-page > h1 { text-shadow: 0 1px 0 rgba(0,0,0,.75); }
    html[data-theme="aqua"] .quote-text { background: linear-gradient(135deg, rgba(65,73,82,.92), rgba(25,76,112,.42)); }
  }
  @media (max-width: 700px) {
    html[data-theme="aqua"] .aqua-feed { grid-template-columns: 1fr; }
  }
  @media (max-width: 560px) {
    html[data-theme="aqua"] header.site-header { position: relative; padding: .9rem 1.2rem; margin-bottom: 1.4rem; }
    html[data-theme="aqua"] .site-header-right { align-items: flex-start; }
    html[data-theme="aqua"] main,
    html[data-theme="aqua"] footer.site-footer { padding-left: .85rem; padding-right: .85rem; }
    html[data-theme="aqua"] .aqua-feed { gap: 1rem; }
  }
`;
