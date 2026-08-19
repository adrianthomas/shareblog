import { z } from "zod";
import { contentTypeValues } from "../db/schema.js";

export const thoughtMetadataSchema = z.object({}).strict();

export const photoMetadataSchema = z.object({
  assetId: z.string().uuid(),
  caption: z.string().optional(),
});

export const bookMetadataSchema = z.object({
  author: z.string(),
  isbn13: z.string().optional(),
  isbn10: z.string().optional(),
  coverAssetId: z.string().uuid().optional(),
  coverUrl: z.string().url().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  links: z
    .object({
      bookshop: z.string().url().optional(),
      amazon: z.string().url().optional(),
      appleBooks: z.string().url().optional(),
    })
    .default({}),
  source: z.enum(["open_library", "google_books", "manual"]),
});

export const articleMetadataSchema = z.object({
  coverAssetId: z.string().uuid().optional(),
  excerpt: z.string().optional(),
});

export const musicMetadataSchema = z.object({
  artist: z.string(),
  releaseTitle: z.string(),
  artworkUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
  links: z
    .object({
      spotify: z.string().url().optional(),
      appleMusic: z.string().url().optional(),
      youtubeMusic: z.string().url().optional(),
      bandcamp: z.string().url().optional(),
    })
    .default({}),
});

export const metadataSchemaByType = {
  thought: thoughtMetadataSchema,
  photo: photoMetadataSchema,
  book: bookMetadataSchema,
  article: articleMetadataSchema,
  music: musicMetadataSchema,
} as const;

export const createObjectSchema = z
  .object({
    type: z.enum(contentTypeValues),
    title: z.string().max(300).optional(),
    body: z.string().optional(),
    status: z.enum(["draft", "published"]).default("draft"),
    sourceUrl: z.string().url().optional(),
    metadata: z.record(z.string(), z.unknown()),
  })
  .superRefine((val, ctx) => {
    const schema = metadataSchemaByType[val.type];
    const result = schema.safeParse(val.metadata);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ["metadata", ...issue.path] });
      }
    }
  });

export const updateObjectSchema = z.object({
  title: z.string().max(300).optional(),
  body: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
