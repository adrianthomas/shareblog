import type { contentObjects, sites } from "../../db/schema.js";

export type Site = typeof sites.$inferSelect;
export type ContentObject = typeof contentObjects.$inferSelect;

export interface BookMetadata {
  author: string;
  isbn13?: string;
  isbn10?: string;
  coverUrl?: string;
  rating?: number;
  links?: { bookshop?: string; amazon?: string; appleBooks?: string };
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
}

export interface ArticleMetadata {
  coverAssetId?: string;
  excerpt?: string;
}
