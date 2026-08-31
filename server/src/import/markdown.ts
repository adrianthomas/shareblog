import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { db } from "../db/client.js";
import { contentObjects, sites, type ContentType } from "../db/schema.js";
import { createImageAsset, imageAssetResponse } from "../lib/image-assets.js";
import { slugify } from "../lib/slugify.js";

type Frontmatter = Record<string, unknown>;

interface ImportOptions {
  input: string;
  site?: string;
  source: string;
  sourceBaseUrl?: string;
  wordpressExport?: string;
  commit: boolean;
}

interface ImportSummary {
  discovered: number;
  importable: number;
  imported: number;
  skippedExisting: number;
  skippedPages: number;
  skippedUnsupported: Array<{ file: string; type: string }>;
  skippedSlugCollisions: Array<{ file: string; slug: string }>;
  images: number;
  remoteImages: number;
  errors: Array<{ file: string; message: string }>;
}

interface ImportedImage {
  id: string;
  url: string;
}

interface WordPressExportData {
  attachments: Map<string, string>;
  links: Map<string, string>;
}

const SUPPORTED_MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

function usage(): string {
  return [
    "Import a Markdown folder into the configured Shareblog database.",
    "",
    "Usage:",
    "  npm run import:markdown -- --input <folder> [options]",
    "",
    "Options:",
    "  --site <subdomain>          Target site (optional when the database has one site)",
    "  --source <name>             Idempotency namespace (default: markdown)",
    "  --source-base-url <url>     Original site origin used for legacy /<slug> redirects",
    "  --wordpress-export <file>   WXR/XML export used to restore galleries and exact old URLs",
    "  --commit                    Write objects and assets; without this flag, dry-run only",
  ].join("\n");
}

function parseArgs(argv: string[]): ImportOptions {
  const readOption = (name: string): string | undefined => {
    const index = argv.indexOf(name);
    if (index === -1) return undefined;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
    return value;
  };
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(usage());
    process.exit(0);
  }
  const positional = argv.find((arg, index) => !arg.startsWith("--") && (index === 0 || !argv[index - 1].startsWith("--")));
  const input = readOption("--input") ?? positional;
  if (!input) throw new Error("--input <folder> is required.");
  const sourceBaseUrl = readOption("--source-base-url");
  if (sourceBaseUrl) new URL(sourceBaseUrl);
  return {
    input: path.resolve(input),
    site: readOption("--site"),
    source: readOption("--source") ?? "markdown",
    sourceBaseUrl,
    wordpressExport: readOption("--wordpress-export") ? path.resolve(readOption("--wordpress-export")!) : undefined,
    commit: argv.includes("--commit"),
  };
}

async function markdownFiles(root: string): Promise<string[]> {
  const rootStat = await stat(root);
  if (rootStat.isFile()) return SUPPORTED_MARKDOWN_EXTENSIONS.has(path.extname(root).toLowerCase()) ? [root] : [];
  const result: string[] = [];
  async function visit(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else if (SUPPORTED_MARKDOWN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) result.push(fullPath);
    }
  }
  await visit(root);
  return result.sort();
}

function parseMarkdown(source: string): { frontmatter: Frontmatter; body: string } {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return { frontmatter: {}, body: normalized.trim() };
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) throw new Error("Frontmatter starts with --- but has no closing --- line.");
  const parsed = parseYaml(normalized.slice(4, end));
  if (parsed != null && (typeof parsed !== "object" || Array.isArray(parsed))) {
    throw new Error("Frontmatter must be a YAML object.");
  }
  return { frontmatter: (parsed ?? {}) as Frontmatter, body: normalized.slice(end + 5).trim() };
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(stringValue).filter((item): item is string => Boolean(item));
  const single = stringValue(value);
  return single ? [single] : [];
}

function booleanValue(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: "\u00a0", quot: '"' };
  return value.replace(/&(#(?:x[\da-f]+|\d+)|amp|apos|gt|lt|nbsp|quot);/gi, (match, entity: string) => {
    if (!entity.startsWith("#")) return named[entity.toLowerCase()] ?? match;
    const hexadecimal = entity[1]?.toLowerCase() === "x";
    const point = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    try {
      return Number.isFinite(point) ? String.fromCodePoint(point) : match;
    } catch {
      return match;
    }
  });
}

function xmlValue(item: string, tag: string): string | undefined {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i"));
  return match?.[1] ? decodeEntities(match[1].trim()) : undefined;
}

async function readWordPressExport(filePath?: string): Promise<WordPressExportData | undefined> {
  if (!filePath) return undefined;
  const xml = await readFile(filePath, "utf8");
  const attachments = new Map<string, string>();
  const links = new Map<string, string>();
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = match[1];
    const id = xmlValue(item, "wp:post_id");
    if (!id) continue;
    const link = xmlValue(item, "link");
    if (link) links.set(id, link);
    const attachment = xmlValue(item, "wp:attachment_url");
    if (attachment) attachments.set(id, attachment);
  }
  return { attachments, links };
}

function importedType(frontmatter: Frontmatter): ContentType | "page" | undefined {
  const type = stringValue(frontmatter.type)?.toLowerCase();
  if (type === "page") return "page";
  if (!type || type === "post") return "article";
  if (["thought", "photo", "book", "article", "link", "music", "quote"].includes(type)) {
    return type as ContentType;
  }
  return undefined;
}

function importedDate(frontmatter: Frontmatter): Date {
  const raw = stringValue(frontmatter.date);
  if (!raw) return new Date();
  const date = new Date(raw);
  if (Number.isNaN(date.valueOf())) throw new Error(`Invalid frontmatter date: ${raw}`);
  return date;
}

function importedSlug(frontmatter: Frontmatter, filePath: string): string {
  const requested = stringValue(frontmatter.slug) ?? (path.basename(filePath).toLowerCase() === "index.md"
    ? path.basename(path.dirname(filePath))
    : path.basename(filePath, path.extname(filePath)));
  const slug = slugify(requested);
  if (!slug) throw new Error("The post does not have a usable slug.");
  return slug;
}

function importMarker(metadata: unknown): { source?: string; sourceId?: string } {
  if (!metadata || typeof metadata !== "object") return {};
  const marker = (metadata as Record<string, unknown>).import;
  return marker && typeof marker === "object" ? marker as { source?: string; sourceId?: string } : {};
}

function localImagePath(target: string, markdownPath: string, inputRoot: string): string | undefined {
  const unwrapped = target.startsWith("<") && target.endsWith(">") ? target.slice(1, -1) : target;
  if (/^[a-z][a-z\d+.-]*:/i.test(unwrapped) || unwrapped.startsWith("//")) return undefined;
  const withoutSuffix = unwrapped.split(/[?#]/, 1)[0];
  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutSuffix);
  } catch {
    decoded = withoutSuffix;
  }
  const candidate = decoded.startsWith("/")
    ? path.resolve(inputRoot, `.${decoded}`)
    : path.resolve(path.dirname(markdownPath), decoded);
  const relative = path.relative(inputRoot, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Image path escapes the import folder: ${target}`);
  }
  return candidate;
}

async function coverImagePath(target: string, markdownPath: string, inputRoot: string): Promise<string | undefined> {
  const direct = localImagePath(target, markdownPath, inputRoot);
  if (!direct) return undefined;
  if (await stat(direct).then(() => true, () => false)) return direct;

  // wordpress-export-to-markdown writes coverImage as a bare filename while
  // saving the actual attachment beside other post media in images/. Accept
  // that documented output shape without weakening the root-boundary check.
  const fallback = localImagePath(`images/${path.basename(direct)}`, markdownPath, inputRoot);
  if (fallback && await stat(fallback).then(() => true, () => false)) return fallback;
  throw new Error(`Cover image is missing: ${path.relative(inputRoot, direct)}`);
}

function videoLink(source: string): string {
  const decoded = decodeEntities(source.startsWith("//") ? `https:${source}` : source);
  try {
    const url = new URL(decoded);
    const youtube = url.hostname.replace(/^www\./, "") === "youtube.com" && url.pathname.match(/^\/embed\/([^/]+)/);
    if (youtube) return `https://www.youtube.com/watch?v=${youtube[1]}`;
    const vimeo = url.hostname === "player.vimeo.com" && url.pathname.match(/^\/video\/(\d+)/);
    if (vimeo) return `https://vimeo.com/${vimeo[1]}`;
  } catch {
    // The Markdown renderer will discard unsafe link schemes later.
  }
  return decoded;
}

async function normalizeWordPressMarkup(
  body: string,
  markdownPath: string,
  inputRoot: string,
  wordpress?: WordPressExportData,
): Promise<string> {
  let output = body;
  output = output.replace(/<figcaption>\s*([\s\S]*?)\s*<\/figcaption>/gi, (_match, caption: string) => `\n\n*${caption.trim()}*\n\n`);
  output = output.replace(/<\/?figure>\s*/gi, "\n");
  output = output.replace(/\\?\[caption\b[^\]]*\\?\]\s*/gi, "\n");
  output = output.replace(/\s*\\?\[\/caption\\?\]/gi, "\n");
  output = output.replace(/\\?\[embed\\?\]\s*(https?:\/\/[^\s<]+)\s*\\?\[\/embed\\?\]/gi,
    (_match, url: string) => `\n\n[Watch the embedded media](${videoLink(url)})\n\n`);
  output = output.replace(/<iframe\b[^>]*\bsrc=(['"])(.*?)\1[^>]*>[\s\S]*?<\/iframe>/gi,
    (_match, _quote: string, url: string) => `\n\n[Watch the embedded video](${videoLink(url)})\n\n`);
  output = await replaceAsync(output, /\\?\[gallery\b([^\]]*)\\?\]/gi, async (match, attributes: string) => {
    const ids = attributes.match(/\bids=(['"])(.*?)\1/i)?.[2].split(",").map((id) => id.trim()).filter(Boolean) ?? [];
    if (!wordpress || ids.length === 0) return match;
    const images: string[] = [];
    for (const id of ids) {
      const url = wordpress.attachments.get(id);
      if (!url) continue;
      let filename: string;
      try {
        filename = path.basename(new URL(url).pathname);
      } catch {
        continue;
      }
      const local = localImagePath(`images/${filename}`, markdownPath, inputRoot);
      const source = local && await stat(local).then(() => true, () => false) ? `images/${filename}` : url;
      images.push(`![WordPress gallery image](${source})`);
    }
    return images.length > 0 ? `\n\n${images.join("\n\n")}\n\n` : match;
  });
  return output.replace(/\n{3,}/g, "\n\n").trim();
}

async function replaceAsync(
  value: string,
  pattern: RegExp,
  replacer: (match: string, ...groups: string[]) => Promise<string>,
): Promise<string> {
  const matches = [...value.matchAll(pattern)];
  if (matches.length === 0) return value;
  const replacements = await Promise.all(matches.map((match) => replacer(match[0], ...match.slice(1))));
  let output = "";
  let cursor = 0;
  matches.forEach((match, index) => {
    const start = match.index ?? cursor;
    output += value.slice(cursor, start) + replacements[index];
    cursor = start + match[0].length;
  });
  return output + value.slice(cursor);
}

async function rewriteImages(
  body: string,
  markdownPath: string,
  inputRoot: string,
  importImage: (absolutePath: string) => Promise<ImportedImage>,
): Promise<{ body: string; assetIds: string[]; remoteImages: number }> {
  const assetIds: string[] = [];
  let remoteImages = 0;
  const pattern = /!\[([^\]]*)\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^)]*["'])?\)/g;
  let output = "";
  let cursor = 0;
  for (const match of body.matchAll(pattern)) {
    const index = match.index ?? 0;
    output += body.slice(cursor, index);
    const absolutePath = localImagePath(match[2], markdownPath, inputRoot);
    if (!absolutePath) {
      const remote = match[2].startsWith("//") ? `https:${match[2]}` : match[2];
      if (/^https?:\/\//i.test(remote)) {
        remoteImages += 1;
        const image = await importImage(remote);
        assetIds.push(image.id);
        output += `![${match[1]}](${image.url})`;
      } else {
        output += match[0];
      }
    } else {
      await stat(absolutePath).catch(() => { throw new Error(`Referenced image is missing: ${path.relative(inputRoot, absolutePath)}`); });
      const image = await importImage(absolutePath);
      assetIds.push(image.id);
      output += `![${match[1]}](${image.url})`;
    }
    cursor = index + match[0].length;
  }
  output += body.slice(cursor);
  return { body: output, assetIds: [...new Set(assetIds)], remoteImages };
}

function legacyDetails(frontmatter: Frontmatter, slug: string, sourceBaseUrl?: string, wordpressUrl?: string): { path?: string; url?: string } {
  const explicit = stringValue(frontmatter.permalink) ?? stringValue(frontmatter.url) ?? stringValue(frontmatter.link) ?? wordpressUrl;
  if (explicit) {
    try {
      const url = sourceBaseUrl ? new URL(explicit, sourceBaseUrl) : new URL(explicit);
      return { path: url.pathname.replace(/\/$/, "") || "/", url: url.toString() };
    } catch {
      if (explicit.startsWith("/")) return { path: explicit.replace(/\/$/, "") || "/" };
    }
  }
  if (!sourceBaseUrl) return {};
  const url = new URL(`${slug}/`, sourceBaseUrl.endsWith("/") ? sourceBaseUrl : `${sourceBaseUrl}/`);
  return { path: url.pathname.replace(/\/$/, "") || "/", url: url.toString() };
}

export async function runMarkdownImport(options: ImportOptions): Promise<ImportSummary> {
  const files = await markdownFiles(options.input);
  const wordpress = await readWordPressExport(options.wordpressExport);
  const allSites = await db.select().from(sites);
  const site = options.site ? allSites.find((candidate) => candidate.subdomain === options.site) : allSites.length === 1 ? allSites[0] : undefined;
  if (!site) {
    throw new Error(options.site
      ? `No site has the subdomain "${options.site}".`
      : `The database has ${allSites.length} sites; pass --site <subdomain>.`);
  }

  const existingObjects = await db.select().from(contentObjects).where(eq(contentObjects.siteId, site.id));
  const existingImports = new Set(existingObjects.map((object) => {
    const marker = importMarker(object.metadata);
    return marker.source && marker.sourceId ? `${marker.source}\u0000${marker.sourceId}` : "";
  }).filter(Boolean));
  const usedSlugs = new Set(existingObjects.map((object) => object.slug));
  const imageCache = new Map<string, ImportedImage>();
  const summary: ImportSummary = {
    discovered: files.length,
    importable: 0,
    imported: 0,
    skippedExisting: 0,
    skippedPages: 0,
    skippedUnsupported: [],
    skippedSlugCollisions: [],
    images: 0,
    remoteImages: 0,
    errors: [],
  };

  const importImage = async (source: string): Promise<ImportedImage> => {
    const cached = imageCache.get(source);
    if (cached) return cached;
    const remote = /^https?:\/\//i.test(source);
    if (!options.commit) {
      const preview = remote
        ? { id: `dry-run:${source}`, url: source }
        : { id: `dry-run:${path.relative(options.input, source)}`, url: pathToFileURL(source).toString() };
      imageCache.set(source, preview);
      summary.images += 1;
      return preview;
    }
    const bytes = remote
      ? await fetch(source).then(async (response) => {
        if (!response.ok) throw new Error(`Could not download image (${response.status}): ${source}`);
        return Buffer.from(await response.arrayBuffer());
      })
      : await readFile(source);
    const filename = remote ? path.basename(new URL(source).pathname) || "wordpress-image" : path.basename(source);
    const asset = await createImageAsset(site.id, bytes, filename);
    const response = imageAssetResponse(asset);
    const imported = { id: response.id, url: response.url };
    imageCache.set(source, imported);
    summary.images += 1;
    return imported;
  };

  for (const file of files) {
    const relativeFile = path.relative(options.input, file);
    try {
      const { frontmatter, body: unnormalizedBody } = parseMarkdown(await readFile(file, "utf8"));
      const type = importedType(frontmatter);
      if (type === "page") {
        summary.skippedPages += 1;
        continue;
      }
      if (type !== "article") {
        summary.skippedUnsupported.push({ file: relativeFile, type: stringValue(frontmatter.type) ?? "unknown" });
        continue;
      }

      const slug = importedSlug(frontmatter, file);
      const sourceId = stringValue(frontmatter.id) ?? relativeFile;
      const importKey = `${options.source}\u0000${sourceId}`;
      if (existingImports.has(importKey)) {
        summary.skippedExisting += 1;
        continue;
      }
      if (usedSlugs.has(slug)) {
        summary.skippedSlugCollisions.push({ file: relativeFile, slug });
        continue;
      }

      const originalBody = await normalizeWordPressMarkup(unnormalizedBody, file, options.input, wordpress);
      const rewritten = await rewriteImages(originalBody, file, options.input, importImage);
      summary.remoteImages += rewritten.remoteImages;
      const coverPath = stringValue(frontmatter.coverImage);
      const cover = coverPath ? await coverImagePath(coverPath, file, options.input) : undefined;
      if (!cover && coverPath) {
        summary.remoteImages += 1;
      }
      const coverAsset = cover ? await importImage(cover) : undefined;
      const date = importedDate(frontmatter);
      const draft = booleanValue(frontmatter.draft);
      const legacy = legacyDetails(frontmatter, slug, options.sourceBaseUrl, wordpress?.links.get(sourceId));
      const title = stringValue(frontmatter.title) ? decodeEntities(stringValue(frontmatter.title)!).slice(0, 300) : undefined;
      if (!title) throw new Error("Article frontmatter needs a title.");
      summary.importable += 1;

      if (options.commit) {
        await db.insert(contentObjects).values({
          siteId: site.id,
          type: "article",
          slug,
          title,
          body: rewritten.body || null,
          status: draft ? "draft" : "published",
          metadata: {
            ...(stringValue(frontmatter.excerpt) ? { excerpt: stringValue(frontmatter.excerpt) } : {}),
            ...(coverAsset ? { coverAssetId: coverAsset.id } : {}),
            inlineAssetIds: rewritten.assetIds,
            import: {
              source: options.source,
              sourceId,
              sourcePath: relativeFile,
              originalUrl: legacy.url,
              legacyPath: legacy.path,
              categories: stringList(frontmatter.categories),
              tags: stringList(frontmatter.tags),
              inlineImagesReadOnly: rewritten.assetIds.length > 0,
            },
          },
          publishedAt: draft ? null : date,
          createdAt: date,
          updatedAt: date,
        });
        existingImports.add(importKey);
        usedSlugs.add(slug);
        summary.imported += 1;
      }
    } catch (error) {
      summary.errors.push({ file: relativeFile, message: error instanceof Error ? error.message : String(error) });
    }
  }

  return summary;
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const summary = await runMarkdownImport(options);
    console.log(options.commit ? "Markdown import complete." : "Markdown import dry-run complete; no data was changed.");
    console.log(JSON.stringify(summary, null, 2));
    if (summary.errors.length) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(`\n${usage()}`);
    process.exitCode = 1;
  }
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsScript) await main();
