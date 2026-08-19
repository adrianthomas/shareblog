import got from "got";
import type { ResolvedMusic } from "./types.js";
import { resolveArticle } from "./article.js";

// Odesli/Songlink (api.song.link, api.odesli.co) has been sunset — confirmed
// by direct testing against verified-live URLs (both hosts return a genuine
// 404, not a rate limit) and by the product owner. There's no replacement
// that resolves one link into every platform's link for free, so this
// resolver now gets metadata straight from whichever platform the user
// shared, via each platform's own free, unauthenticated endpoint. The
// trade-off: no more automatic "also available on Spotify/Apple/YouTube"
// links — just the one platform that was actually shared.

interface ITunesLookupResult {
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
}

interface ITunesLookupResponse {
  results: ITunesLookupResult[];
}

async function resolveAppleMusic(url: URL): Promise<ResolvedMusic> {
  const trackId = url.searchParams.get("i");
  const pathId = url.pathname.match(/(\d+)(?:$|\/)/)?.[1];
  const id = trackId ?? pathId;

  if (id) {
    const response = await got("https://itunes.apple.com/lookup", {
      searchParams: { id },
      responseType: "json",
      timeout: { request: 8000 },
    }).json<ITunesLookupResponse>();
    const result = response.results[0];
    if (result) {
      return {
        artist: result.artistName ?? "Unknown artist",
        releaseTitle: result.trackName ?? result.collectionName ?? "Untitled",
        artworkUrl: result.artworkUrl100?.replace("100x100", "600x600"),
        sourceUrl: url.toString(),
        links: { appleMusic: url.toString() },
      };
    }
  }

  return fallbackViaOpenGraph(url, { appleMusic: url.toString() });
}

interface SpotifyOembedResponse {
  title?: string;
  thumbnail_url?: string;
}

async function resolveSpotify(url: URL): Promise<ResolvedMusic> {
  const response = await got("https://open.spotify.com/oembed", {
    searchParams: { url: url.toString() },
    responseType: "json",
    timeout: { request: 8000 },
  }).json<SpotifyOembedResponse>();

  // Spotify's oEmbed only gives a combined title, no separate artist field.
  return {
    artist: "",
    releaseTitle: response.title ?? "Untitled",
    artworkUrl: response.thumbnail_url,
    sourceUrl: url.toString(),
    links: { spotify: url.toString() },
  };
}

interface YouTubeOembedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

async function resolveYouTubeMusic(url: URL): Promise<ResolvedMusic> {
  // youtube.com's oEmbed endpoint doesn't recognize the music.youtube.com
  // host even though the video ID (the `v` param) refers to the same item.
  // youtube.com and youtu.be URLs are already accepted as-is.
  let lookupUrl = url;
  if (url.hostname.toLowerCase().includes("music.youtube.com")) {
    lookupUrl = new URL(url.toString());
    lookupUrl.hostname = "www.youtube.com";
  }

  const response = await got("https://www.youtube.com/oembed", {
    searchParams: { url: lookupUrl.toString(), format: "json" },
    responseType: "json",
    timeout: { request: 8000 },
  }).json<YouTubeOembedResponse>();

  return {
    artist: response.author_name ?? "Unknown artist",
    releaseTitle: response.title ?? "Untitled",
    artworkUrl: response.thumbnail_url,
    sourceUrl: url.toString(),
    links: { youtubeMusic: url.toString() },
  };
}

async function fallbackViaOpenGraph(url: URL, links: ResolvedMusic["links"]): Promise<ResolvedMusic> {
  const article = await resolveArticle(url.toString());
  return {
    artist: article.siteName ?? "Unknown artist",
    releaseTitle: article.title ?? "Untitled",
    artworkUrl: article.imageUrl,
    sourceUrl: url.toString(),
    links,
  };
}

export async function resolveMusic(rawUrl: string): Promise<ResolvedMusic> {
  const url = new URL(rawUrl);
  const host = url.hostname.toLowerCase();

  if (host.includes("music.apple.com")) return resolveAppleMusic(url);
  if (host.includes("open.spotify.com")) return resolveSpotify(url);
  if (host.includes("music.youtube.com") || host.includes("youtube.com") || host === "youtu.be") {
    return resolveYouTubeMusic(url);
  }
  if (host.includes("bandcamp.com")) return fallbackViaOpenGraph(url, { bandcamp: url.toString() });

  return fallbackViaOpenGraph(url, {});
}
