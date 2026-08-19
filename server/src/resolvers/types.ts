export interface ResolvedBookCandidate {
  title: string;
  author: string;
  isbn13?: string;
  isbn10?: string;
  coverUrl?: string;
  source: "open_library" | "google_books";
}

export interface ResolvedMusic {
  artist: string;
  releaseTitle: string;
  artworkUrl?: string;
  /** The (single) link metadata was resolved from — whichever platform the user shared. */
  sourceUrl?: string;
  links: {
    spotify?: string;
    appleMusic?: string;
    youtubeMusic?: string;
    bandcamp?: string;
  };
}

export interface ResolvedArticle {
  title?: string;
  excerpt?: string;
  imageUrl?: string;
  siteName?: string;
  canonicalUrl: string;
}
