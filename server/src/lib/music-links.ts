export interface MusicLinks {
  spotify?: string;
  appleMusic?: string;
  youtubeMusic?: string;
  bandcamp?: string;
}

export interface MusicLinkSource {
  artist: string;
  releaseTitle: string;
  sourceUrl?: string;
  links?: MusicLinks;
}

function exactSpotifySourceUrl(sourceUrl: string | undefined): string | undefined {
  if (!sourceUrl) return undefined;
  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();
    return host === "open.spotify.com" || host === "spotify.link" ? sourceUrl : undefined;
  } catch {
    return undefined;
  }
}

export function spotifySearchUrl(source: Pick<MusicLinkSource, "artist" | "releaseTitle">): string | undefined {
  const query = `${source.releaseTitle} ${source.artist}`.trim();
  return query ? `https://open.spotify.com/search/${encodeURIComponent(query)}` : undefined;
}

// Exact stored/shared links remain authoritative. Otherwise, derive a
// credential-free Spotify search from the structured title and artist so old
// posts gain a useful Spotify destination without rewriting their metadata.
export function musicLinksFor(source: MusicLinkSource): MusicLinks {
  const { spotify: storedSpotify, appleMusic, ...otherLinks } = source.links ?? {};
  const spotify = storedSpotify ?? exactSpotifySourceUrl(source.sourceUrl) ?? spotifySearchUrl(source);
  return {
    ...(appleMusic ? { appleMusic } : {}),
    ...(spotify ? { spotify } : {}),
    ...otherLinks,
  };
}

export function isSpotifySearchUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "open.spotify.com" && parsed.pathname.startsWith("/search/");
  } catch {
    return false;
  }
}
