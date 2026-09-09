import got from "got";
import type { ResolvedMusic } from "./types.js";
import { resolveArticle } from "./article.js";

interface ITunesResult {
  trackId?: number;
  collectionId?: number;
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
}

interface ITunesResponse {
  results: ITunesResult[];
}

interface SourceMetadata {
  artist: string;
  releaseTitle: string;
}

function appleArtwork(url: string | undefined): string | undefined {
  return url?.replace(/100x100(?:bb)?/, "600x600bb");
}

function resolvedAppleResult(result: ITunesResult, fallbackUrl?: string): ResolvedMusic {
  const appleMusic = result.trackViewUrl ?? result.collectionViewUrl ?? fallbackUrl;
  return {
    artist: result.artistName ?? "Unknown artist",
    releaseTitle: result.trackName ?? result.collectionName ?? "Untitled",
    artworkUrl: appleArtwork(result.artworkUrl100),
    sourceUrl: appleMusic,
    links: appleMusic ? { appleMusic } : {},
  };
}

async function resolveAppleMusic(url: URL): Promise<ResolvedMusic> {
  const trackId = url.searchParams.get("i");
  const pathId = url.pathname.match(/(\d+)(?:$|\/)/)?.[1];
  const id = trackId ?? pathId;
  if (!id) throw new Error("Apple Music URL did not contain a catalog id.");

  const response = await got("https://itunes.apple.com/lookup", {
    searchParams: { id, ...(trackId ? { entity: "song" } : {}) },
    responseType: "json",
    timeout: { request: 8000 },
  }).json<ITunesResponse>();
  const numericId = Number(id);
  const result = trackId
    ? response.results.find((candidate) => candidate.trackId === numericId)
    : response.results.find((candidate) => candidate.collectionId === numericId) ?? response.results[0];
  if (!result) throw new Error("Apple Music catalog item was not found.");
  return resolvedAppleResult(result, url.toString());
}

function cleanTitle(value: string): string {
  return value
    .replace(/\s*[|·]\s*(Spotify|Apple Music|YouTube Music|YouTube)\s*$/i, "")
    .replace(/\s*[-–—]\s*YouTube\s*$/i, "")
    .replace(/\s+on Apple Music\s*$/i, "")
    .trim();
}

function cleanReleaseTitle(value: string): string {
  return value.replace(/\s*[([](?:official\s+)?(?:music\s+)?(?:video|audio|lyrics?|visuali[sz]er).*?[)\]]\s*$/i, "").trim();
}

export function sourceMetadata(title: string | undefined, artist = ""): SourceMetadata {
  const cleaned = cleanTitle(title ?? "");
  const spotify = cleaned.match(/^(.+?)\s+-\s+(?:song|album) and lyrics by\s+(.+)$/i);
  if (spotify) return { releaseTitle: spotify[1].trim(), artist: spotify[2].trim() };
  const bandcamp = cleaned.match(/^(.+?),\s+by\s+(.+)$/i);
  if (bandcamp) return { releaseTitle: bandcamp[1].trim(), artist: bandcamp[2].trim() };
  const separated = cleaned.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (separated) {
    return { artist: separated[1].trim(), releaseTitle: cleanReleaseTitle(separated[2]) };
  }
  return { artist, releaseTitle: cleaned || "Untitled" };
}

function tokens(value: string): Set<string> {
  return new Set(value.toLocaleLowerCase("en").normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 1));
}

function similarity(left: string, right: string): number {
  const a = tokens(left);
  const b = tokens(right);
  if (a.size === 0 || b.size === 0) return 0;
  const overlap = [...a].filter((word) => b.has(word)).length;
  return (2 * overlap) / (a.size + b.size);
}

export function appleMatchScore(source: SourceMetadata, candidate: ITunesResult): number {
  const titleScore = similarity(source.releaseTitle, candidate.trackName ?? candidate.collectionName ?? "");
  if (!source.artist) return titleScore;
  return titleScore * 0.7 + similarity(source.artist, candidate.artistName ?? "") * 0.3;
}

async function sourceFor(url: URL): Promise<SourceMetadata> {
  const host = url.hostname.toLowerCase();
  if (host === "open.spotify.com") {
    const result = await got("https://open.spotify.com/oembed", {
      searchParams: { url: url.toString() }, responseType: "json", timeout: { request: 8000 },
    }).json<{ title?: string }>();
    return sourceMetadata(result.title);
  }
  if (host === "music.youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") {
    const lookupUrl = new URL(url);
    if (host === "music.youtube.com") lookupUrl.hostname = "www.youtube.com";
    const result = await got("https://www.youtube.com/oembed", {
      searchParams: { url: lookupUrl.toString(), format: "json" }, responseType: "json", timeout: { request: 8000 },
    }).json<{ title?: string; author_name?: string }>();
    return sourceMetadata(result.title, result.author_name ?? "");
  }
  const article = await resolveArticle(url.toString());
  return sourceMetadata(article.title, host.includes("bandcamp.com") ? article.siteName ?? "" : "");
}

async function searchApple(source: SourceMetadata): Promise<ITunesResult | undefined> {
  const term = `${source.releaseTitle} ${source.artist}`.trim();
  const response = await got("https://itunes.apple.com/search", {
    searchParams: { term, media: "music", entity: "song", limit: 10 },
    responseType: "json",
    timeout: { request: 8000 },
  }).json<ITunesResponse>();
  const ranked = response.results
    .map((candidate) => ({ candidate, score: appleMatchScore(source, candidate) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const threshold = source.artist ? 0.68 : 0.9;
  return best && best.score >= threshold ? best.candidate : undefined;
}

export async function resolveMusic(rawUrl: string): Promise<ResolvedMusic> {
  const url = new URL(rawUrl);
  if (url.hostname.toLowerCase() === "music.apple.com") return resolveAppleMusic(url);

  const source = await sourceFor(url);
  const match = await searchApple(source);
  if (match) return resolvedAppleResult(match);

  // Keep enough metadata for the user to finish a post manually, but never
  // expose provider artwork or a non-Apple destination to public visitors.
  return { ...source, links: {} };
}
