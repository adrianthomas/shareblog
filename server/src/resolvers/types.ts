import type { GeneratedBookRetailerLinks } from "../lib/book-links.js";
import type { MusicLinks } from "../lib/music-links.js";

export type { AmazonRegion } from "../lib/book-links.js";

export interface ResolvedBookCandidate {
  title: string;
  author: string;
  isbn13?: string;
  isbn10?: string;
  coverUrl?: string;
  source: "open_library" | "google_books";
  links: GeneratedBookRetailerLinks;
}

export interface ResolvedMusic {
  artist: string;
  releaseTitle: string;
  artworkUrl?: string;
  /** The (single) link metadata was resolved from — whichever platform the user shared. */
  sourceUrl?: string;
  links: MusicLinks;
}

export interface ResolvedArticle {
  title?: string;
  excerpt?: string;
  imageUrl?: string;
  siteName?: string;
  canonicalUrl: string;
}
