import React from "react";

const APP_STORE_PLACEHOLDER = "https://apps.apple.com/app/id0000000000";
const REPOSITORY_URL = "https://github.com/adrianthomas/shareblog";

// Shown at the bare BASE_DOMAIN, before any site has been created there.
// It deliberately remains a dependency-free static document: no Site row,
// client bundle, hydration, cookies, or third-party runtime requests.
export function LandingPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#243027" />
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='8' fill='%23243027'/%3E%3Ctext x='32' y='43' fill='%23f1ead9' font-family='Georgia,serif' font-size='34' text-anchor='middle'%3EN%3C/text%3E%3C/svg%3E"
        />
        <meta
          name="description"
          content="Notehangar is a friendly, self-hosted publishing app for iPhone. Keep your notes and photos on your server, publish on your domain, and join the Fediverse."
        />
        <title>Notehangar — your notes, on your runway</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @font-face {
                font-family: "Hangar Serif";
                src: url("/static/fonts/shippori-mincho-latin-600.woff2") format("woff2");
                font-weight: 600;
                font-style: normal;
                font-display: swap;
              }
              @font-face {
                font-family: "Hangar Type";
                src: url("/static/fonts/special-elite-latin.woff2") format("woff2");
                font-weight: 400;
                font-style: normal;
                font-display: swap;
              }
              :root {
                color-scheme: light dark;
                --paper: #f1ead9;
                --paper-raised: #fbf7ed;
                --ink: #20251f;
                --muted: #5c6258;
                --line: #b9b3a2;
                --olive: #465747;
                --deep-olive: #243027;
                --yellow: #dda938;
                --red: #a1462f;
                --soft-field: #d9d3c4;
                --principle-line: #9c9789;
                --principle-muted: #555a51;
                --feature-bg: rgba(251,247,237,0.52);
                --focus: #0068b5;
                --shadow: 0 1.25rem 3.5rem rgba(34, 30, 20, 0.18);
              }
              @media (prefers-color-scheme: dark) {
                :root {
                  --paper: #171b18;
                  --paper-raised: #202620;
                  --ink: #f0eadb;
                  --muted: #b9b7ac;
                  --line: #485047;
                  --olive: #92a087;
                  --deep-olive: #101511;
                  --yellow: #d5a73a;
                  --red: #e17b59;
                  --soft-field: #262d27;
                  --principle-line: #626b60;
                  --principle-muted: #c0c3bb;
                  --feature-bg: rgba(32,38,32,0.68);
                  --focus: #65b8ff;
                  --shadow: 0 1.25rem 3.5rem rgba(0, 0, 0, 0.34);
                }
              }
              * { box-sizing: border-box; }
              html { scroll-behavior: smooth; }
              body {
                margin: 0;
                background:
                  linear-gradient(rgba(70, 87, 71, 0.035) 1px, transparent 1px),
                  var(--paper);
                background-size: 100% 2rem;
                color: var(--ink);
                font: 400 1rem/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                -webkit-font-smoothing: antialiased;
              }
              body::before {
                content: "";
                position: fixed;
                inset: 0;
                pointer-events: none;
                opacity: 0.18;
                background-image: radial-gradient(rgba(43, 48, 39, 0.3) 0.55px, transparent 0.55px);
                background-size: 5px 5px;
                z-index: 10;
              }
              a { color: inherit; }
              a:focus-visible, summary:focus-visible {
                outline: 3px solid var(--focus);
                outline-offset: 4px;
              }
              .skip-link {
                position: fixed;
                top: 0.75rem;
                left: 0.75rem;
                z-index: 20;
                transform: translateY(-160%);
                background: var(--paper-raised);
                padding: 0.75rem 1rem;
                border: 2px solid var(--ink);
              }
              .skip-link:focus { transform: none; }
              .shell { width: min(100% - 2rem, 76rem); margin-inline: auto; }
              .site-header {
                position: absolute;
                inset: 0 0 auto;
                z-index: 4;
                color: #fffaf0;
                border-bottom: 1px solid rgba(255,255,255,0.25);
              }
              .header-inner {
                min-height: 5.25rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 2rem;
              }
              .brand {
                display: inline-flex;
                align-items: center;
                gap: 0.75rem;
                text-decoration: none;
                font-family: "Hangar Type", ui-monospace, monospace;
                font-size: 1.2rem;
                letter-spacing: 0.02em;
              }
              .brand-mark {
                display: grid;
                place-items: center;
                width: 2.5rem;
                height: 2.1rem;
                border: 1px solid currentColor;
                border-radius: 0.15rem 0.15rem 0.4rem 0.4rem;
                font: 400 0.72rem/1 "Hangar Type", ui-monospace, monospace;
                letter-spacing: 0.08em;
              }
              .nav-links { display: flex; align-items: center; gap: clamp(1rem, 2.5vw, 2rem); }
              .nav-links a {
                min-height: 2.75rem;
                display: inline-flex;
                align-items: center;
                font-size: 0.86rem;
                font-weight: 650;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                text-decoration: none;
              }
              .nav-links a:hover { text-decoration: underline; text-underline-offset: 0.35rem; }
              .hero {
                min-height: min(54rem, 92vh);
                position: relative;
                display: grid;
                align-items: end;
                isolation: isolate;
                background: var(--deep-olive);
                overflow: hidden;
              }
              .hero-image {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                z-index: -2;
              }
              .hero::after {
                content: "";
                position: absolute;
                inset: 0;
                z-index: -1;
                background:
                  linear-gradient(90deg, rgba(24, 29, 23, 0.93) 0%, rgba(24, 29, 23, 0.7) 36%, rgba(24, 29, 23, 0.12) 72%),
                  linear-gradient(0deg, rgba(15, 18, 15, 0.8) 0%, transparent 52%);
              }
              .hero-copy {
                color: #fffaf0;
                width: min(42rem, 100%);
                padding: 10rem 0 clamp(4rem, 9vw, 7.5rem);
              }
              .kicker, .section-kicker {
                font-family: "Hangar Type", ui-monospace, monospace;
                letter-spacing: 0.12em;
                text-transform: uppercase;
              }
              .kicker { margin: 0 0 1rem; color: #f2c963; font-size: 0.86rem; }
              h1, h2, h3 { font-family: "Hangar Serif", Georgia, serif; text-wrap: balance; }
              h1 {
                margin: 0;
                max-width: 11ch;
                font-size: clamp(3rem, 8vw, 6.9rem);
                font-weight: 600;
                line-height: 0.96;
                letter-spacing: -0.045em;
              }
              .hero-lede {
                margin: 1.6rem 0 0;
                max-width: 38rem;
                font-size: clamp(1.08rem, 2vw, 1.32rem);
                color: rgba(255, 250, 240, 0.84);
              }
              .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 2rem; }
              .button {
                min-height: 3.25rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.55rem;
                padding: 0.75rem 1.15rem;
                border: 1px solid transparent;
                border-radius: 0.2rem;
                background: var(--yellow);
                color: #1f241e;
                font-weight: 750;
                text-decoration: none;
                box-shadow: 0 0.35rem 1.2rem rgba(0,0,0,0.2);
              }
              .button:hover { background: #efc45e; }
              .button.secondary {
                border-color: rgba(255,255,255,0.62);
                background: rgba(24,29,23,0.28);
                color: #fffaf0;
                box-shadow: none;
                backdrop-filter: blur(0.4rem);
              }
              .button.secondary:hover { background: rgba(255,255,255,0.12); }
              .hero-note {
                margin: 1.15rem 0 0;
                font-size: 0.83rem;
                color: rgba(255,250,240,0.68);
              }
              .manifest {
                background: var(--deep-olive);
                color: #f7f1e3;
                border-top: 1px solid rgba(255,255,255,0.1);
              }
              .manifest-inner { display: grid; grid-template-columns: repeat(4, 1fr); }
              .manifest-item {
                min-height: 7rem;
                display: grid;
                align-content: center;
                padding: 1rem clamp(1rem, 2.5vw, 2rem);
                border-right: 1px solid rgba(255,255,255,0.14);
              }
              .manifest-item:first-child { padding-left: 0; }
              .manifest-item:last-child { border-right: 0; }
              .manifest-item strong { font-family: "Hangar Serif", Georgia, serif; font-size: 1.1rem; }
              .manifest-item span { color: rgba(247,241,227,0.62); font-size: 0.82rem; }
              .content-section { padding: clamp(4.5rem, 9vw, 8.5rem) 0; }
              .section-kicker { color: var(--red); font-size: 0.78rem; margin: 0 0 0.8rem; }
              h2 {
                margin: 0;
                max-width: 15ch;
                font-size: clamp(2.25rem, 5vw, 4.5rem);
                line-height: 1.05;
                letter-spacing: -0.035em;
              }
              .section-intro {
                margin: 1.25rem 0 0;
                max-width: 45rem;
                color: var(--muted);
                font-size: 1.08rem;
              }
              .feature-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                margin-top: 3.5rem;
                border-top: 1px solid var(--line);
                border-left: 1px solid var(--line);
              }
              .feature {
                min-height: 16rem;
                padding: clamp(1.4rem, 3vw, 2.2rem);
                border-right: 1px solid var(--line);
                border-bottom: 1px solid var(--line);
                background: var(--feature-bg);
              }
              .feature-number {
                display: block;
                margin-bottom: 2.4rem;
                color: var(--red);
                font: 400 0.78rem/1 "Hangar Type", ui-monospace, monospace;
                letter-spacing: 0.1em;
              }
              .feature h3 { margin: 0 0 0.65rem; font-size: 1.42rem; }
              .feature p { margin: 0; color: var(--muted); }
              .sovereignty { background: var(--soft-field); border-block: 1px solid var(--line); }
              .split {
                display: grid;
                grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
                gap: clamp(3rem, 8vw, 7rem);
                align-items: start;
              }
              .principles { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--principle-line); }
              .principles li {
                display: grid;
                grid-template-columns: 2rem 1fr;
                gap: 0.8rem;
                padding: 1.15rem 0;
                border-bottom: 1px solid var(--principle-line);
              }
              .principles li::before { content: "✓"; color: var(--red); font-weight: 800; }
              .principles strong { display: block; }
              .principles span { display: block; color: var(--principle-muted); font-size: 0.94rem; }
              .route {
                margin-top: 3.5rem;
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                border: 1px solid var(--line);
                background: var(--paper-raised);
                box-shadow: var(--shadow);
              }
              .route-stop { position: relative; padding: 1.4rem; min-height: 9rem; }
              .route-stop:not(:last-child) { border-right: 1px dashed #a7a18f; }
              .route-stop:not(:last-child)::after {
                content: "→";
                position: absolute;
                top: 50%;
                right: -0.65rem;
                transform: translateY(-50%);
                width: 1.3rem;
                background: var(--paper-raised);
                color: var(--red);
                text-align: center;
                z-index: 1;
              }
              .route-code { color: var(--red); font: 400 0.72rem/1 "Hangar Type", monospace; }
              .route-stop strong { display: block; margin-top: 1.4rem; font-family: "Hangar Serif", Georgia, serif; }
              .route-stop span { color: var(--muted); font-size: 0.86rem; }
              .federation {
                min-height: 43rem;
                position: relative;
                display: grid;
                align-items: end;
                isolation: isolate;
                color: #fffaf0;
                overflow: hidden;
              }
              .federation img {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                z-index: -2;
              }
              .federation::after {
                content: "";
                position: absolute;
                inset: 0;
                z-index: -1;
                background: linear-gradient(0deg, rgba(13,31,42,0.92), rgba(13,31,42,0.08) 72%);
              }
              .federation-copy { max-width: 48rem; padding: 5rem 0; }
              .federation h2 { max-width: 13ch; }
              .federation p { max-width: 43rem; color: rgba(255,250,240,0.82); font-size: 1.08rem; }
              .setup-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
                margin-top: 3.5rem;
                counter-reset: setup;
              }
              .setup-step {
                counter-increment: setup;
                position: relative;
                padding: 2rem 2rem 2.1rem 5.4rem;
                border: 1px solid var(--line);
                background: var(--paper-raised);
              }
              .setup-step::before {
                content: counter(setup, decimal-leading-zero);
                position: absolute;
                left: 1.5rem;
                top: 1.8rem;
                color: var(--red);
                font: 400 1rem/1 "Hangar Type", monospace;
              }
              .setup-step h3 { margin: 0 0 0.6rem; font-size: 1.35rem; }
              .setup-step p { margin: 0; color: var(--muted); }
              code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; }
              .setup-actions { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; margin-top: 2rem; }
              .setup-actions .button { background: var(--deep-olive); color: #fffaf0; }
              .text-link { font-weight: 700; text-underline-offset: 0.25rem; }
              .app-callout {
                margin-top: clamp(4rem, 8vw, 7rem);
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 2rem;
                align-items: center;
                padding: clamp(2rem, 5vw, 4rem);
                background: var(--yellow);
                border: 1px solid #8d6b22;
                box-shadow: 0.65rem 0.65rem 0 var(--red);
              }
              .app-callout h3 { margin: 0; font-size: clamp(1.8rem, 4vw, 3rem); }
              .app-callout p { margin: 0.55rem 0 0; max-width: 45rem; color: #44391e; }
              .app-callout .button { background: var(--deep-olive); color: #fffaf0; box-shadow: none; white-space: nowrap; }
              footer { background: #18211b; color: #f7f1e3; }
              .footer-inner {
                min-height: 18rem;
                display: grid;
                grid-template-columns: 1.2fr 0.8fr;
                gap: 3rem;
                align-items: center;
                padding-block: 3.5rem;
              }
              footer .brand { font-size: 1.45rem; }
              .footer-copy { margin: 1rem 0 0; max-width: 34rem; color: rgba(247,241,227,0.66); }
              .footer-links { display: grid; grid-template-columns: repeat(2, auto); justify-content: end; gap: 0.8rem 2.2rem; }
              .footer-links a { min-height: 2.75rem; display: inline-flex; align-items: center; text-underline-offset: 0.25rem; }
              .byline { margin-top: 1.5rem; color: rgba(247,241,227,0.55); font-size: 0.85rem; }
              .byline a { color: #f2c963; }
              @media (max-width: 800px) {
                .nav-links a:not(.nav-cta) { display: none; }
                .manifest-inner { grid-template-columns: repeat(2, 1fr); }
                .manifest-item:nth-child(2) { border-right: 0; }
                .manifest-item:nth-child(-n + 2) { border-bottom: 1px solid rgba(255,255,255,0.14); }
                .manifest-item:nth-child(3) { padding-left: 0; }
                .feature-grid { grid-template-columns: repeat(2, 1fr); }
                .split, .footer-inner { grid-template-columns: 1fr; }
                .route { grid-template-columns: repeat(2, 1fr); }
                .route-stop:nth-child(2) { border-right: 0; }
                .route-stop:nth-child(-n + 2) { border-bottom: 1px dashed #a7a18f; }
                .route-stop:nth-child(2)::after { display: none; }
                .route-stop:nth-child(3)::before {
                  content: "↓";
                  position: absolute;
                  top: -0.75rem;
                  left: 50%;
                  width: 1.5rem;
                  background: var(--paper-raised);
                  color: var(--red);
                  text-align: center;
                }
                .app-callout { grid-template-columns: 1fr; }
                .footer-links { justify-content: start; }
              }
              @media (max-width: 540px) {
                .shell { width: min(100% - 1.25rem, 76rem); }
                .header-inner { min-height: 4.5rem; }
                .hero { min-height: 48rem; }
                .hero-image { object-position: 58% center; }
                .hero::after { background: linear-gradient(0deg, rgba(20,25,20,0.95) 0%, rgba(20,25,20,0.66) 72%, rgba(20,25,20,0.35)); }
                .hero-copy { padding-top: 8rem; }
                .manifest-item { min-height: 6.5rem; padding: 1rem; }
                .feature-grid, .setup-grid { grid-template-columns: 1fr; }
                .feature { min-height: 0; }
                .route { grid-template-columns: 1fr; }
                .route-stop { min-height: 7.6rem; border-right: 0 !important; border-bottom: 1px dashed #a7a18f !important; }
                .route-stop:last-child { border-bottom: 0 !important; }
                .route-stop::after { content: "↓" !important; top: auto !important; bottom: -0.7rem; right: 50% !important; transform: translateX(50%) !important; }
                .route-stop:nth-child(3)::before { display: none; }
                .footer-links { grid-template-columns: 1fr 1fr; gap: 0 1rem; }
              }
              @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
            `,
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to main content</a>

        <header className="site-header">
          <div className="shell header-inner">
            <a className="brand" href="#top" aria-label="Notehangar home">
              <span className="brand-mark" aria-hidden="true">NH</span>
              <span>notehangar</span>
            </a>
            <nav className="nav-links" aria-label="Main navigation">
              <a href="#features">Features</a>
              <a href="#ownership">Ownership</a>
              <a href="#setup">Setup</a>
              <a className="nav-cta" href={APP_STORE_PLACEHOLDER} rel="nofollow">iOS app</a>
            </nav>
          </div>
        </header>

        <main id="main">
          <section className="hero" id="top" aria-labelledby="hero-title">
            <img className="hero-image" src="/static/landing/notehangar-hero.webp" alt="A small vintage aeroplane beside a writing desk in a sunlit civilian hangar" width="1536" height="1024" />
            <div className="shell">
              <div className="hero-copy">
                <p className="kicker">A home airfield for the independent web</p>
                <h1 id="hero-title">Your notes. Your server. Your runway.</h1>
                <p className="hero-lede">Notehangar turns anything you share from your iPhone into a thoughtful page on your own website—without handing your writing, photos, or audience to a platform.</p>
                <div className="actions">
                  <a className="button" href={APP_STORE_PLACEHOLDER} rel="nofollow" aria-label="Notehangar for iOS, coming soon">Get the iOS app <span aria-hidden="true">↗</span></a>
                  <a className="button secondary" href="#setup">Set up your server</a>
                </div>
                <p className="hero-note">iOS app coming soon · Server available now under the MIT license</p>
              </div>
            </div>
          </section>

          <div className="manifest" aria-label="Product highlights">
            <div className="shell manifest-inner">
              <div className="manifest-item"><strong>Self-hosted</strong><span>Your machine, your account</span></div>
              <div className="manifest-item"><strong>SQLite</strong><span>One portable database file</span></div>
              <div className="manifest-item"><strong>Fediverse-ready</strong><span>Followable from Mastodon</span></div>
              <div className="manifest-item"><strong>Open source</strong><span>Inspect, adapt, keep forever</span></div>
            </div>
          </div>

          <section className="content-section" id="features" aria-labelledby="features-title">
            <div className="shell">
              <p className="section-kicker">Flight manifest 01 · What it carries</p>
              <h2 id="features-title">Made for the things worth keeping.</h2>
              <p className="section-intro">Share from the apps you already use. Notehangar recognizes what arrived, gives it the right shape, and publishes it without turning everything into the same generic post.</p>
              <div className="feature-grid">
                <article className="feature"><span className="feature-number">NH · 01</span><h3>One-tap dispatch</h3><p>Send a thought, link, photograph, book, song, quote, or article directly from the iOS share sheet.</p></article>
                <article className="feature"><span className="feature-number">NH · 02</span><h3>Proper pages</h3><p>Each kind of post gets useful structure, considered typography, and a stable address on your domain.</p></article>
                <article className="feature"><span className="feature-number">NH · 03</span><h3>Your own identity</h3><p>Choose a theme, title, profile, and custom domain. The result looks like your site—not an account inside ours.</p></article>
                <article className="feature"><span className="feature-number">NH · 04</span><h3>A useful archive</h3><p>Browse by type or date, search everything, and keep ordinary URLs that remain useful beyond any app.</p></article>
                <article className="feature"><span className="feature-number">NH · 05</span><h3>Feeds built in</h3><p>Every site includes RSS, sitemaps, social metadata, and a Fediverse identity—no plugin assembly required.</p></article>
                <article className="feature"><span className="feature-number">NH · 06</span><h3>Quiet by design</h3><p>No visitor accounts, engagement traps, advertising network, or third-party scripts on your public pages.</p></article>
              </div>
            </div>
          </section>

          <section className="content-section sovereignty" id="ownership" aria-labelledby="ownership-title">
            <div className="shell split">
              <div>
                <p className="section-kicker">Ground control · Data sovereignty</p>
                <h2 id="ownership-title">Keep the keys to the hangar.</h2>
                <p className="section-intro">Notehangar is software you operate, not a hosted social account. Your domain, database, uploads, and backups stay under your control.</p>
              </div>
              <ul className="principles">
                <li><div><strong>Your database is a file</strong><span>SQLite keeps the whole archive portable, understandable, and easy to back up.</span></div></li>
                <li><div><strong>Your media stays local</strong><span>Uploaded originals and generated variants live in storage attached to your server.</span></div></li>
                <li><div><strong>Your domain is the address</strong><span>Readers visit you directly. Canonical links, feeds, and federation all use the same public origin.</span></div></li>
                <li><div><strong>Your exit is always open</strong><span>The server is MIT-licensed. Keep running it, fork it, or move it to another host whenever you choose.</span></div></li>
              </ul>
            </div>
            <div className="shell route" aria-label="How a Notehangar post travels">
              <div className="route-stop"><span className="route-code">DEPARTURE</span><strong>Your iPhone</strong><span>Share what caught your attention.</span></div>
              <div className="route-stop"><span className="route-code">HOME FIELD</span><strong>Your server</strong><span>Store and enrich it locally.</span></div>
              <div className="route-stop"><span className="route-code">PUBLIC GATE</span><strong>Your domain</strong><span>Publish a durable web page.</span></div>
              <div className="route-stop"><span className="route-code">OPEN SKIES</span><strong>The Fediverse</strong><span>Deliver it to people who follow.</span></div>
            </div>
          </section>

          <section className="federation" aria-labelledby="federation-title">
            <img src="/static/landing/notehangar-federation.webp" alt="A silver flying boat leaving a quiet coastal aerodrome at dawn" width="1536" height="1024" loading="lazy" />
            <div className="shell federation-copy">
              <p className="kicker">Open skies · Federation</p>
              <h2 id="federation-title">A small site can still travel far.</h2>
              <p>People can follow your site from Mastodon and compatible Fediverse apps. New posts arrive where they already read—while the original remains on your domain, in your design, under your control. Prefer a quieter flight plan? Outbound federation can be switched off.</p>
            </div>
          </section>

          <section className="content-section" id="setup" aria-labelledby="setup-title">
            <div className="shell">
              <p className="section-kicker">Pre-flight checklist · About twenty minutes</p>
              <h2 id="setup-title">A small server, not a second career.</h2>
              <p className="section-intro">Notehangar is one Node process backed by SQLite. Run it on inexpensive shared hosting, a Linux VPS, or a machine you already manage.</p>
              <div className="setup-grid">
                <article className="setup-step"><h3>Choose a home field</h3><p>Bring a domain and any always-on Linux host with SSH access. Uberspace is the friendliest documented route.</p></article>
                <article className="setup-step"><h3>Install and configure</h3><p>Clone the server, run <code>npm install</code>, copy the example environment file, and add your domain.</p></article>
                <article className="setup-step"><h3>Prepare the logbook</h3><p><code>npm run db:migrate</code> creates the database. No separate database service or container stack is required.</p></article>
                <article className="setup-step"><h3>Pair the app</h3><p><code>npm run bootstrap-owner</code> prints a short-lived QR code. Scan it in the app to connect and sign in.</p></article>
              </div>
              <div className="setup-actions">
                <a className="button" href="https://github.com/adrianthomas/shareblog/blob/main/SELF_HOSTING.md">Read the self-hosting guide</a>
                <a className="text-link" href="https://github.com/adrianthomas/shareblog/blob/main/UBERSPACE.md">Uberspace walkthrough →</a>
                <a className="text-link" href={REPOSITORY_URL}>Browse the source →</a>
              </div>

              <aside className="app-callout" aria-labelledby="app-title">
                <div>
                  <p className="section-kicker">Mobile companion · Coming soon</p>
                  <h3 id="app-title">The shortest route from “save this” to published.</h3>
                  <p>The Notehangar app and share extension connect directly to your server. The App Store destination is a placeholder while the new listing is prepared.</p>
                </div>
                <a className="button" href={APP_STORE_PLACEHOLDER} rel="nofollow" aria-label="Notehangar on the App Store, coming soon">App Store placeholder ↗</a>
              </aside>
            </div>
          </section>
        </main>

        <footer>
          <div className="shell footer-inner">
            <div>
              <a className="brand" href="#top" aria-label="Back to Notehangar home"><span className="brand-mark" aria-hidden="true">NH</span><span>notehangar</span></a>
              <p className="footer-copy">A friendly, self-hosted home for notes, photographs, links, and the people who would like to follow along.</p>
              <p className="byline">A <a href="https://navigationstack.com">Navigationstack.com</a> app.</p>
            </div>
            <nav className="footer-links" aria-label="Footer navigation">
              <a href="#features">Features</a><a href="#ownership">Ownership</a><a href="#setup">Setup</a><a href={REPOSITORY_URL}>GitHub</a><a href={APP_STORE_PLACEHOLDER} rel="nofollow">iOS app</a><a href="https://github.com/adrianthomas/shareblog/blob/main/LICENSE">MIT license</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
