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

export function isAppleMusicUrl(sourceUrl: string | undefined): boolean {
  if (!sourceUrl) return false;
  try {
    const url = new URL(sourceUrl);
    return url.protocol === "https:" && url.hostname.toLowerCase() === "music.apple.com";
  } catch {
    return false;
  }
}

// Music can be shared into Shareblog from any service, but a public post has
// one canonical listening destination. Ignore legacy provider links so old
// metadata cannot accidentally reintroduce third-party outbound requests.
export function musicLinksFor(source: MusicLinkSource): MusicLinks {
  const stored = source.links?.appleMusic;
  const appleMusic = isAppleMusicUrl(stored)
    ? stored
    : isAppleMusicUrl(source.sourceUrl)
      ? source.sourceUrl
      : undefined;
  return appleMusic ? { appleMusic } : {};
}
