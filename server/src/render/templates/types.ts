import type { contentObjects, sites } from "../../db/schema.js";
import type { BookRetailerLinks } from "../../lib/book-links.js";
import type { MusicLinks } from "../../lib/music-links.js";

export type Site = typeof sites.$inferSelect;
export type ContentObject = typeof contentObjects.$inferSelect;

export interface ProfileLink {
  label: string;
  url: string;
  relMe?: boolean;
}

export interface ContactLink {
  label: string;
  url: string;
}

export interface BookMetadata {
  author: string;
  isbn13?: string;
  isbn10?: string;
  coverUrl?: string;
  /** Absent means visible for compatibility with books published by older clients. */
  showCover?: boolean;
  rating?: number;
  links?: BookRetailerLinks;
}

export function publicBookCoverUrl(metadata: BookMetadata): string | undefined {
  return metadata.showCover === false ? undefined : metadata.coverUrl;
}

export interface MusicMetadata {
  artist: string;
  releaseTitle: string;
  artworkUrl?: string;
  /** Absent means visible for compatibility with music published by older clients. */
  showArtwork?: boolean;
  sourceUrl?: string;
  links?: MusicLinks;
}

export function publicMusicArtworkUrl(metadata: MusicMetadata): string | undefined {
  return metadata.showArtwork === false ? undefined : metadata.artworkUrl;
}

export interface PhotoMetadata {
  assetId: string;
  caption?: string;
  altText?: string;
}

export interface ArticleMetadata {
  coverAssetId?: string;
  coverAltText?: string;
  excerpt?: string;
  // Imported body images remain normal Markdown URLs for old clients, while
  // their asset ids make lifecycle cleanup and future richer editing safe.
  inlineAssetIds?: string[];
  import?: {
    source?: string;
    sourceId?: string;
    sourcePath?: string;
    originalUrl?: string;
    legacyPath?: string;
    categories?: string[];
    tags?: string[];
    inlineImagesReadOnly?: boolean;
  };
}

export interface LinkMetadata {
  excerpt?: string;
}

export interface QuoteMetadata {
  author: string;
  comment?: string;
}
