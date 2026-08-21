// Minimal, safe formatting for user-authored free text (currently just
// Site.about): paragraphs, **bold**, *italic*/_italic_, and [text](url)
// links. Everything is HTML-escaped first and only http(s)/mailto links are
// ever emitted, so this never needs a full HTML sanitizer despite feeding
// dangerouslySetInnerHTML downstream (see AboutPage.tsx).

const SAFE_LINK_PROTOCOL = /^(https?:|mailto:)/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(text: string): string {
  let html = escapeHtml(text);
  // Bold/italic run before links, and links run last: the <a ...> markup
  // this emits contains its own literal underscores (target="_blank"),
  // which the underscore-italic pass below would otherwise mistake for
  // emphasis markers and mangle across separate links in the same
  // paragraph — so nothing may run after the link substitution.
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  html = html.replace(/_([^_\n]+)_/g, "<em>$1</em>");
  html = html.replace(/\n/g, "<br />");
  return html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) => {
    if (!SAFE_LINK_PROTOCOL.test(url)) return label;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
}

export function formatBasicText(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${formatInline(paragraph)}</p>`)
    .join("");
}
