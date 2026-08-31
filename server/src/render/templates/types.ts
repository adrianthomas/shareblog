import type { contentObjects, sites } from "../../db/schema.js";

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
  rating?: number;
  links?: {
    bookshop?: string;
    amazon?: Partial<Record<"us" | "uk" | "de" | "fr" | "it" | "es" | "ca" | "jp", string>>;
    kobo?: string;
    appleBooks?: string;
    storygraph?: string;
  };
}

export interface MusicMetadata {
  artist: string;
  releaseTitle: string;
  artworkUrl?: string;
  sourceUrl?: string;
  links?: { spotify?: string; appleMusic?: string; youtubeMusic?: string; bandcamp?: string };
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
