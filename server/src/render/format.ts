// Minimal, safe formatting for user-authored free text. Two tiers:
//
// - formatBasicText: paragraphs, **bold**, *italic*/_italic_, [text](url)
//   links. Used for shorter annotation fields (Site.about, a Book/Music
//   note, a Quote's comment).
// - formatRichText: everything formatBasicText has, plus block-level
//   `# ` through `###### ` headings and `![alt](url)` inline images. Used for the two
//   "full post" body fields — Thought and Article — where someone might
//   paste in an actual structured post rather than a one-line note.
//
// Everything is HTML-escaped first and only http(s)/mailto links (https-only
// for images) are ever emitted, so this never needs a full HTML sanitizer
// despite feeding dangerouslySetInnerHTML downstream (see AboutPage.tsx,
// ThoughtPost.tsx, ArticlePage.tsx, etc).

const SAFE_LINK_PROTOCOL = /^(https?:|mailto:)/i;
const SAFE_IMAGE_PROTOCOL = /^https:/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(text: string, { images = false }: { images?: boolean } = {}): string {
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
  if (images) {
    // Images before links: both use [...](...), but an image's leading "!"
    // would otherwise make the link pass wrap its "[alt](url)" tail in an
    // <a> too.
    html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt: string, url: string) => {
      if (!SAFE_IMAGE_PROTOCOL.test(url)) return "";
      return `<img src="${url}" alt="${alt}" loading="lazy" />`;
    });
  }
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

function formatRichBlock(paragraph: string): string {
  const heading = paragraph.match(/^(#{1,6})\s+([\s\S]+)$/);
  if (heading) {
    const tag = `h${Math.min(heading[1].length + 1, 6)}`;
    return `<${tag}>${formatInline(heading[2], { images: true })}</${tag}>`;
  }
  // A paragraph that's nothing but a single image renders as its own block
  // rather than wrapped in a <p> — keeps it visually distinct from body
  // copy the same way an image dropped on its own line reads in Markdown.
  const imageOnly = paragraph.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
  if (imageOnly) {
    const [, alt, url] = imageOnly;
    if (!SAFE_IMAGE_PROTOCOL.test(url)) return "";
    return `<img src="${url}" alt="${alt}" loading="lazy" />`;
  }
  return `<p>${formatInline(paragraph, { images: true })}</p>`;
}

export function formatRichText(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(formatRichBlock)
    .join("");
}

// Plain-text rendering of the same syntax — for anywhere a body is shown as
// a short preview or title rather than fully rendered (a feed item's
// <title>, a cards-theme feed tile), where literal "**"/"#"/"![]()" syntax
// characters would otherwise leak through. Images are dropped entirely
// rather than represented in any way, since there's no plain-text stand-in
// for one in a title-length preview.
export function stripBasicFormatting(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)\s]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1$2")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
