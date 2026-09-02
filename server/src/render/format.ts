// Minimal, safe formatting for user-authored free text. Two tiers:
//
// - formatBasicText: paragraphs, **bold**, *italic*/_italic_, [text](url)
//   links (including Markdown's optional quoted title). Used for shorter
//   annotation fields (Site.about, a Book/Music note, a Quote's comment).
// - formatRichText: everything formatBasicText has, plus block-level
//   `# ` through `###### ` headings, `- `/`• ` unordered lists, and
//   `![alt](url)` inline images. Used for the two
//   "full post" body fields — Thought and Article — where someone might
//   paste in an actual structured post rather than a one-line note.
//
// Everything is HTML-escaped first and only http(s)/mailto links (https-only
// for images) are ever emitted, so this never needs a full HTML sanitizer
// despite feeding dangerouslySetInnerHTML downstream (see AboutPage.tsx,
// ThoughtPost.tsx, ArticlePage.tsx, etc).

const SAFE_LINK_PROTOCOL = /^(https?:|mailto:)/i;

function isSafeImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    // Local development and the browser suite use the documented
    // *.localhost setup over HTTP. Never admit arbitrary remote HTTP images
    // into a production article, where they would be mixed content.
    return url.protocol === "http:" && (
      url.hostname === "localhost" || url.hostname.endsWith(".localhost") ||
      url.hostname === "127.0.0.1" || url.hostname === "::1"
    );
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// `escapeHtml` runs before inline formatting, so quoted Markdown titles are
// represented by their HTML entities by the time these expressions run. The
// title is optional and is retained as an escaped HTML title attribute.
const escapedMarkdownTitle = String.raw`(?:\s+(?:&quot;([^\n)]*)&quot;|&#39;([^\n)]*)&#39;|\(([^\n)]*)\)))?`;
const escapedMarkdownImage = new RegExp(
  String.raw`!\[([^\]]*)\]\(([^)\s]+)${escapedMarkdownTitle}\)`,
  "g",
);
const escapedMarkdownLink = new RegExp(
  String.raw`\[([^\]]+)\]\(([^)\s]+)${escapedMarkdownTitle}\)`,
  "g",
);

function titleAttribute(doubleQuoted?: string, singleQuoted?: string, parenthesized?: string): string {
  const title = doubleQuoted ?? singleQuoted ?? parenthesized;
  return title === undefined ? "" : ` title="${title}"`;
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
    html = html.replace(
      escapedMarkdownImage,
      (match, alt: string, url: string, doubleQuoted?: string, singleQuoted?: string, parenthesized?: string) => {
        if (!isSafeImageUrl(url)) return "";
        return `<img src="${url}" alt="${alt}"${titleAttribute(doubleQuoted, singleQuoted, parenthesized)} loading="lazy" />`;
      },
    );
  }
  return html.replace(
    escapedMarkdownLink,
    (match, label: string, url: string, doubleQuoted?: string, singleQuoted?: string, parenthesized?: string) => {
      if (!SAFE_LINK_PROTOCOL.test(url)) return label;
      return `<a href="${url}"${titleAttribute(doubleQuoted, singleQuoted, parenthesized)} target="_blank" rel="noopener noreferrer">${label}</a>`;
    },
  );
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
  const fencedCode = paragraph.match(/^```[^\n]*\n([\s\S]*?)\n```$/);
  if (fencedCode) return `<pre><code>${escapeHtml(fencedCode[1])}</code></pre>`;
  const heading = paragraph.match(/^(#{1,6})\s+([\s\S]+)$/);
  if (heading) {
    const tag = `h${Math.min(heading[1].length + 1, 6)}`;
    return `<${tag}>${formatInline(heading[2], { images: true })}</${tag}>`;
  }
  const lines = paragraph.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length > 0 && lines.every((line) => /^[-•]\s+/.test(line))) {
    const items = lines
      .map((line) => line.replace(/^[-•]\s+/, ""))
      .map((line) => `<li>${formatInline(line, { images: true })}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  }
  if (lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line))) {
    const items = lines
      .map((line) => line.replace(/^\d+\.\s+/, ""))
      .map((line) => `<li>${formatInline(line, { images: true })}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  }
  if (lines.length > 0 && lines.every((line) => /^>\s?/.test(line))) {
    const quote = lines.map((line) => line.replace(/^>\s?/, "")).join("\n");
    return `<blockquote><p>${formatInline(quote, { images: true })}</p></blockquote>`;
  }
  if (/^(?:---|\*\*\*|___)$/.test(paragraph)) return "<hr />";
  // A paragraph that's nothing but a single image renders as its own block
  // rather than wrapped in a <p> — keeps it visually distinct from body
  // copy the same way an image dropped on its own line reads in Markdown.
  const imageOnly = paragraph.match(
    /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+(?:"([^\n)]*)"|'([^\n)]*)'|\(([^\n)]*)\)))?\)$/,
  );
  if (imageOnly) {
    const [, alt, url, doubleQuoted, singleQuoted, parenthesized] = imageOnly;
    if (!isSafeImageUrl(url)) return "";
    const title = doubleQuoted ?? singleQuoted ?? parenthesized;
    const titleHtml = title === undefined ? "" : ` title="${escapeHtml(title)}"`;
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"${titleHtml} loading="lazy" />`;
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
    .replace(/!\[([^\]]*)\]\([^)\s]+(?:\s+(?:"[^\n)]*"|'[^\n)]*'|\([^\n)]*\)))?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)\s]+(?:\s+(?:"[^\n)]*"|'[^\n)]*'|\([^\n)]*\)))?\)/g, "$1")
    .replace(/^[-•]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^```[^\n]*\n|\n```$/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1$2")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
