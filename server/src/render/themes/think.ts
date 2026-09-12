// The visual grammar of Apple's early-2000s public website, not Mac OS X:
// a centered product canvas, graphite tab navigation, a dominant lead story,
// and compact promotional modules. It uses the script-free classic renderer.
export const thinkStyles = `
  html[data-theme="think"] {
    --fg: #111;
    --bg: #fff;
    --muted: #666;
    --border: #c9c9c9;
    --focus: #0066cc;
    --think-panel: #f7f7f7;
    --think-rule: #d6d6d6;
    --think-shadow: 0 1px 2px rgba(0,0,0,.17);
  }
  @media (prefers-color-scheme: dark) {
    html[data-theme="think"] {
      --fg: #f5f5f5;
      --bg: #111;
      --muted: #aaa;
      --border: #444;
      --focus: #55aaff;
      --think-panel: #1d1d1d;
      --think-rule: #393939;
      --think-shadow: 0 1px 3px rgba(0,0,0,.62);
    }
  }
  html[data-theme="think"] body {
    max-width: none;
    margin: 0;
    padding: 0 0 2rem;
    background: var(--bg);
    font-family: "Lucida Grande", "Lucida Sans Unicode", -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    line-height: 1.45;
    letter-spacing: 0;
  }
  html[data-theme="think"] header.site-header,
  html[data-theme="think"] main,
  html[data-theme="think"] footer.site-footer {
    width: min(calc(100% - 2rem), 980px);
    margin-left: auto;
    margin-right: auto;
  }
  html[data-theme="think"] header.site-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: .45rem 1rem;
    align-items: end;
    margin-top: 1.5rem;
    margin-bottom: 1rem;
  }
  html[data-theme="think"] .site-header-left { grid-column: 1; grid-row: 1; gap: 0; }
  html[data-theme="think"] .site-header-right { display: contents; }
  html[data-theme="think"] .header-links {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
    min-height: 2rem;
    margin: 0;
  }
  html[data-theme="think"] .rss-link,
  html[data-theme="think"] .link-btn-reset { min-height: 2rem; font-size: 10px; }
  html[data-theme="think"] header.site-header h1 {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -.045em;
    line-height: 1;
  }
  html[data-theme="think"] .site-tagline {
    margin-top: .32rem;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.25;
  }
  html[data-theme="think"] .think-navigation {
    grid-column: 1 / -1;
    grid-row: 2;
    display: flex;
    flex-wrap: nowrap;
    gap: 0;
    width: 100%;
    min-height: 38px;
    overflow: hidden;
    border: 1px solid #202020;
    border-radius: 7px;
    background: linear-gradient(#777 0, #555 48%, #333 52%, #444 100%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.46), var(--think-shadow);
  }
  html[data-theme="think"] .think-navigation a {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    justify-content: center;
    min-width: 0;
    min-height: 38px;
    padding: 0 .75rem;
    border-left: 1px solid rgba(0,0,0,.46);
    border-right: 1px solid rgba(255,255,255,.13);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    text-shadow: 0 -1px 0 #222;
    white-space: nowrap;
  }
  html[data-theme="think"] .think-navigation a:first-child { border-left: 0; }
  html[data-theme="think"] .think-navigation a:last-child { border-right: 0; }
  html[data-theme="think"] .think-navigation a:hover,
  html[data-theme="think"] .think-navigation a:focus-visible,
  html[data-theme="think"] .think-navigation a[aria-current="page"] {
    color: #fff;
    background: linear-gradient(#4f9cdc, #176db3 49%, #075997 51%, #2b84c7);
    text-decoration: none;
  }
  html[data-theme="think"] main { min-height: 45vh; }
  html[data-theme="think"] .think-feed {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  html[data-theme="think"] .think-feed > .card {
    min-width: 0;
    min-height: 210px;
    margin: 0;
    padding: 18px;
    overflow: hidden;
    border: 1px solid var(--think-rule);
    border-radius: 8px;
    background: linear-gradient(#fff, #f2f2f2);
    box-shadow: 0 1px 2px rgba(0,0,0,.13);
  }
  html[data-theme="think"] .think-feed > .card:first-child {
    grid-column: 1 / -1;
    min-height: 350px;
    padding: clamp(2.2rem, 6vw, 4.7rem) clamp(1.5rem, 8vw, 6rem);
    border-color: #c5c5c5;
    background:
      radial-gradient(ellipse at 50% 115%, rgba(109,183,232,.34), transparent 44%),
      linear-gradient(#fff 0 58%, #f2f5f7 100%);
    text-align: center;
  }
  html[data-theme="think"] .think-feed > .card:nth-child(3n + 2) { background: linear-gradient(#fff, #f2f6fa); }
  html[data-theme="think"] .think-feed > .card:nth-child(3n + 3) { background: linear-gradient(#fff, #f5f5f5); }
  html[data-theme="think"] .think-feed > .card:nth-child(3n + 4) { background: linear-gradient(#fff, #f7f4ef); }
  html[data-theme="think"] .think-feed > .card h2 {
    margin: 0 0 .45rem;
    color: #111;
    font-size: 21px;
    font-weight: 700;
    line-height: 1.08;
    letter-spacing: -.035em;
  }
  html[data-theme="think"] .think-feed > .card:first-child h2 {
    max-width: 760px;
    margin: 0 auto .8rem;
    font-size: clamp(38px, 6vw, 64px);
    font-weight: 700;
    line-height: .98;
    letter-spacing: -.06em;
  }
  html[data-theme="think"] .think-feed > .card:first-child > .body-content:first-child {
    max-width: 760px;
    margin: auto;
    font-size: clamp(24px, 4vw, 42px);
    font-weight: 700;
    line-height: 1.08;
    letter-spacing: -.045em;
  }
  html[data-theme="think"] .think-feed > .card:first-child .article-excerpt,
  html[data-theme="think"] .think-feed > .card:first-child > p:not(.meta) {
    max-width: 580px;
    margin-left: auto;
    margin-right: auto;
    font-size: 17px;
    line-height: 1.4;
  }
  html[data-theme="think"] .think-feed > .card:first-child .meta { margin-top: 1.3rem; }
  html[data-theme="think"] .think-feed > .book:first-child,
  html[data-theme="think"] .think-feed > .music:first-child {
    align-items: center;
    justify-content: center;
    gap: clamp(1.5rem, 5vw, 4rem);
    text-align: left;
  }
  html[data-theme="think"] .think-feed > .book:first-child img,
  html[data-theme="think"] .think-feed > .music:first-child img.artwork { width: min(34vw, 230px); }
  html[data-theme="think"] .card img,
  html[data-theme="think"] .body-content img,
  html[data-theme="think"] .article-detail-cover {
    border: 0;
    border-radius: 3px;
    box-shadow: 0 1px 4px rgba(0,0,0,.24);
  }
  html[data-theme="think"] .think-feed > .card:not(:first-child) > a:first-child img,
  html[data-theme="think"] .think-feed > .card:not(:first-child) > img:first-child {
    width: calc(100% + 36px);
    max-width: none;
    margin: -18px -18px 14px;
    border-radius: 7px 7px 0 0;
    box-shadow: none;
  }
  html[data-theme="think"] .book img { border-radius: 2px 5px 5px 2px; }
  html[data-theme="think"] .music img.artwork { border-radius: 3px; }
  html[data-theme="think"] .meta { color: var(--muted); font-size: 10px; }
  html[data-theme="think"] .quote-text {
    margin: 0;
    padding: 0;
    border: 0;
  }
  html[data-theme="think"] .quote-text p {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 20px;
    line-height: 1.3;
  }
  html[data-theme="think"] .link-card {
    border-color: #c3c3c3;
    border-radius: 6px;
    background: linear-gradient(135deg, #fff, #edf4fa);
  }
  html[data-theme="think"] a { color: #06c; }
  html[data-theme="think"] a.title-link { color: inherit; }
  html[data-theme="think"] .content-action-button,
  html[data-theme="think"] .pagination a {
    min-height: 2.75rem;
    border: 1px solid #aaa;
    border-radius: 5px;
    color: #333;
    background: linear-gradient(#fff, #ddd);
    box-shadow: inset 0 1px 0 #fff, 0 1px 1px rgba(0,0,0,.12);
    text-shadow: 0 1px 0 #fff;
  }
  html[data-theme="think"] .content-action-button:hover,
  html[data-theme="think"] .pagination a:hover { border-color: #777; background: linear-gradient(#fff, #d0d0d0); }
  html[data-theme="think"] main > article,
  html[data-theme="think"] main > .about-page,
  html[data-theme="think"] main > .release-history,
  html[data-theme="think"] main > .archive-page,
  html[data-theme="think"] main > .search-page {
    width: min(100%, 760px);
    margin-left: auto;
    margin-right: auto;
    padding: clamp(2rem, 7vw, 5rem) 0;
  }
  html[data-theme="think"] .article-detail > h1,
  html[data-theme="think"] .about-page > h1,
  html[data-theme="think"] main > article > h1 {
    font-size: clamp(40px, 7vw, 68px);
    font-weight: 700;
    line-height: .98;
    letter-spacing: -.06em;
    text-align: center;
  }
  html[data-theme="think"] .article-detail > .meta,
  html[data-theme="think"] main > article > h1 + .meta { text-align: center; }
  html[data-theme="think"] .article-detail > .article-excerpt {
    max-width: 620px;
    margin: .9rem auto 1rem;
    color: var(--muted);
    font-size: 17px;
    line-height: 1.42;
    text-align: center;
  }
  html[data-theme="think"] main > article .body-content,
  html[data-theme="think"] main > .about-page .body-content {
    max-width: 620px;
    margin-left: auto;
    margin-right: auto;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 17px;
    line-height: 1.62;
  }
  html[data-theme="think"] main > article .body-content h2,
  html[data-theme="think"] main > article .body-content h3,
  html[data-theme="think"] main > .about-page .body-content h2,
  html[data-theme="think"] main > .about-page .body-content h3 { font-family: "Lucida Grande", "Lucida Sans Unicode", sans-serif; }
  html[data-theme="think"] footer.site-footer { margin-top: 2.25rem; }
  html[data-theme="think"] .site-footer-inner {
    padding-top: 1.2rem;
    padding-left: 0;
    padding-right: 0;
    border: 0;
    border-top: 1px solid var(--think-rule);
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    font-size: 11px;
  }
  html[data-theme="think"] .site-footer-nav { border-top-color: var(--think-rule); }
  @media (prefers-color-scheme: dark) {
    html[data-theme="think"] .think-feed > .card,
    html[data-theme="think"] .think-feed > .card:nth-child(n) {
      border-color: #444;
      background: linear-gradient(#252525, #181818);
    }
    html[data-theme="think"] .think-feed > .card:first-child {
      background: radial-gradient(ellipse at 50% 115%, rgba(24,107,166,.45), transparent 45%), linear-gradient(#242424, #151515);
    }
    html[data-theme="think"] .think-feed > .card h2 { color: var(--fg); }
    html[data-theme="think"] .link-card { background: linear-gradient(135deg, #252525, #172532); }
  }
  @media (max-width: 760px) {
    html[data-theme="think"] .think-feed { grid-template-columns: 1fr 1fr; }
    html[data-theme="think"] .think-navigation { overflow-x: auto; justify-content: flex-start; }
    html[data-theme="think"] .think-navigation a { flex: 0 0 auto; min-width: 84px; }
  }
  @media (max-width: 540px) {
    html[data-theme="think"] header.site-header,
    html[data-theme="think"] main,
    html[data-theme="think"] footer.site-footer { width: min(calc(100% - 1.25rem), 980px); }
    html[data-theme="think"] header.site-header { margin-top: 1rem; }
    html[data-theme="think"] .think-feed { grid-template-columns: 1fr; gap: 8px; }
    html[data-theme="think"] .think-feed > .card:first-child { min-height: 300px; padding: 3rem 1.2rem; }
    html[data-theme="think"] .header-links { display: none; }
    html[data-theme="think"] .site-header-left { grid-column: 1 / -1; }
    html[data-theme="think"] .think-navigation a {
      flex: 1 1 0;
      min-width: 0;
      padding: 0 .2rem;
      font-size: 9px;
    }
    html[data-theme="think"] main > article,
    html[data-theme="think"] main > .about-page { padding-top: 2.5rem; }
    html[data-theme="think"] .article-detail > h1,
    html[data-theme="think"] .about-page > h1,
    html[data-theme="think"] main > article > h1 { font-size: 42px; }
  }
`;
