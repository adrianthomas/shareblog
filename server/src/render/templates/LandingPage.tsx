import React from "react";

// Shown at the bare BASE_DOMAIN, before any site has been created there —
// every real site lives at <subdomain>.BASE_DOMAIN instead. No Site row
// exists yet at this point, so this doesn't go through Layout (which
// requires one for title/locale/theme/nav) and hardcodes English instead of
// threading a locale.
export function LandingPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Shareblog</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                color-scheme: light dark;
                --fg: #1a1a1a; --bg: #fff; --muted: #595959; --border: #d8d8d8;
              }
              @media (prefers-color-scheme: dark) {
                :root { --fg: #f0f0f0; --bg: #111; --muted: #b8b8b8; --border: #3a3a3a; }
              }
              * { box-sizing: border-box; }
              html, body { background: var(--bg); color: var(--fg); }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif;
                     max-width: 32rem; margin: 0 auto; padding: 3rem 1.25rem; line-height: 1.55; }
              h1 { font-size: 1.25rem; margin: 0 0 0.75rem; }
              p { color: var(--muted); }
              .mark { display: inline-block; width: 2.5rem; height: 2.5rem; border-radius: 8px;
                      background: var(--fg); color: var(--bg); font-weight: 700; font-size: 1.1rem;
                      line-height: 2.5rem; text-align: center; margin-bottom: 1.25rem; }
            `,
          }}
        />
      </head>
      <body>
        <div className="mark" aria-hidden="true">S</div>
        <h1>This is a Shareblog server.</h1>
        <p>No site has been created here yet — sites appear at their own subdomain once published.</p>
      </body>
    </html>
  );
}
