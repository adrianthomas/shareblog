import React from "react";
import { t } from "../i18n.js";

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M9.5 14.5l5-5M10.5 6.5l1-1a4 4 0 1 1 5.66 5.66l-1.42 1.42M13.5 17.5l-1 1a4 4 0 1 1-5.66-5.66l1.42-1.42"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Copies the current page's URL rather than one built server-side — on
// every path that renders this (a hard page load, or the cards theme's
// client-routed overlay, which history.pushState()s to the real permalink
// before its content even loads — see wireDismissGesture/openCard in
// cards.tsx) the address bar already holds the exact deep link, so reading
// it client-side avoids threading siteOrigin through every template just
// for this.
export function CopyLinkButton({ locale, className }: { locale: string; className?: string }) {
  const label = t(locale, "copyLink");
  return (
    <button
      type="button"
      className={`copy-btn${className ? ` ${className}` : ""}`}
      data-copy="url"
      data-copied-label={t(locale, "urlCopied")}
      aria-label={label}
      title={label}
    >
      <LinkIcon />
      <span className="copy-feedback" aria-live="polite" />
    </button>
  );
}

// Same copy-to-clipboard mechanics as CopyQuoteButton, for a site's
// Fediverse handle (@subdomain@host) next to the RSS link in Layout.tsx —
// there's no universal "click to follow" across federated servers, so the
// convention is showing the handle as text a visitor pastes into their own
// instance's search bar.
export function CopyHandleButton({ handle, locale, className }: { handle: string; locale: string; className?: string }) {
  const label = t(locale, "copyFediverseHandle");
  return (
    <button
      type="button"
      className={`copy-btn${className ? ` ${className}` : ""}`}
      data-copy="text"
      data-copy-text={handle}
      data-copied-label={t(locale, "fediverseHandleCopied")}
      aria-label={label}
      title={label}
    >
      <CopyIcon />
      <span className="copy-feedback" aria-live="polite" />
    </button>
  );
}

export function CopyQuoteButton({ text, locale, className }: { text: string; locale: string; className?: string }) {
  const label = t(locale, "copyQuote");
  return (
    <button
      type="button"
      className={`copy-btn${className ? ` ${className}` : ""}`}
      data-copy="text"
      data-copy-text={text}
      data-copied-label={t(locale, "quoteCopied")}
      aria-label={label}
      title={label}
    >
      <CopyIcon />
      <span className="copy-feedback" aria-live="polite" />
    </button>
  );
}

// One delegated handler for every [data-copy] button on the page, injected
// once in Layout.tsx regardless of theme. A "url" button always copies
// location.href (see CopyLinkButton above); a "text" button copies its own
// data-copy-text. Falls back to a hidden-textarea + execCommand for browsers
// without the async Clipboard API (older Safari, or a non-secure context).
export const copyButtonScript = `
(function () {
  function legacyCopy(value) {
    var textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (err) {}
    document.body.removeChild(textarea);
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var kind = btn.getAttribute('data-copy');
    var value = kind === 'url' ? location.href : btn.getAttribute('data-copy-text');
    if (!value) return;

    var showFeedback = function () {
      var feedback = btn.querySelector('.copy-feedback');
      if (!feedback) return;
      feedback.textContent = btn.getAttribute('data-copied-label') || '';
      feedback.classList.add('copy-feedback--visible');
      clearTimeout(btn._copyFeedbackTimer);
      btn._copyFeedbackTimer = setTimeout(function () {
        feedback.classList.remove('copy-feedback--visible');
      }, 1600);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(showFeedback).catch(function () {
        legacyCopy(value);
        showFeedback();
      });
    } else {
      legacyCopy(value);
      showFeedback();
    }
  });
})();
`;
