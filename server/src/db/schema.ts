import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { randomUUID } from "node:crypto";

// Curated subset of EXIF tags worth showing on a photo post — camera/lens
// identity plus the standard "exposure triangle" (aperture, shutter, ISO)
// and focal length, the same handful a camera's own info screen leads with.
export interface AssetExif {
  make?: string;
  model?: string;
  lensModel?: string;
  fNumber?: number;
  exposureTime?: number;
  iso?: number;
  focalLength?: number;
  takenAt?: string;
}

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

const createdAt = (name = "created_at") =>
  integer(name, { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

export const users = sqliteTable("users", {
  id: id(),
  // Case-insensitivity is enforced app-side (emails are lowercased before
  // they ever reach a query) rather than via a DB-level citext/collation,
  // since SQLite's COLLATE NOCASE is ASCII-only.
  email: text("email").notNull().unique(),
  createdAt: createdAt(),
});

export const themeValues = ["classic", "cards"] as const;
export type Theme = (typeof themeValues)[number];

export const sites = sqliteTable("sites", {
  id: id(),
  // TODO: multi-blog-per-user support means dropping this .unique() and
  // reworking the singular-site lookups in auth-guard.ts / sites.ts, which
  // currently assume exactly one site per account.
  ownerUserId: text("owner_user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  subdomain: text("subdomain").notNull().unique(),
  customDomain: text("custom_domain").unique(),
  title: text("title").notNull(),
  tagline: text("tagline"),
  // Free-text About page, editable from the iOS app's settings and linked
  // from the site footer (see Layout.tsx). Supports a small safe-formatting
  // syntax — **bold**, *italic*, [text](url) — parsed by render/format.ts;
  // null/empty means the site has no About page, and the footer link and
  // /about route are both hidden in that case.
  about: text("about"),
  locale: text("locale").notNull().default("en"),
  theme: text("theme", { enum: themeValues }).notNull().default("classic"),
  createdAt: createdAt(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const apiTokens = sqliteTable("api_tokens", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  deviceName: text("device_name"),
  createdAt: createdAt(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
});

export const magicTokens = sqliteTable("magic_tokens", {
  id: id(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  purpose: text("purpose", { enum: ["web_session", "mobile_code"] }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  consumedAt: integer("consumed_at", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
});

export const contentTypeValues = ["thought", "photo", "book", "article", "music", "quote"] as const;
export type ContentType = (typeof contentTypeValues)[number];

export const contentObjects = sqliteTable(
  "content_objects",
  {
    id: id(),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id),
    type: text("type", { enum: contentTypeValues }).notNull(),
    slug: text("slug").notNull(),
    title: text("title"),
    body: text("body"),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    sourceUrl: text("source_url"),
    metadata: text("metadata", { mode: "json" })
      .notNull()
      .$defaultFn(() => ({})),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("content_objects_site_slug_idx").on(table.siteId, table.slug),
    index("content_objects_site_type_published_idx").on(
      table.siteId,
      table.type,
      table.publishedAt,
    ),
  ],
);

export const assets = sqliteTable(
  "assets",
  {
    id: id(),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id),
    contentObjectId: text("content_object_id").references(() => contentObjects.id),
    storageKey: text("storage_key").notNull(),
    originalFilename: text("original_filename"),
    mimeType: text("mime_type"),
    width: integer("width"),
    height: integer("height"),
    variants: text("variants", { mode: "json" })
      .notNull()
      .$defaultFn(() => ({})),
    // Populated at upload time from the original file's EXIF tags (see
    // image/worker.ts); null for assets uploaded before this existed and for
    // any file that simply has no EXIF (e.g. a screenshot or a scan).
    exif: text("exif", { mode: "json" }).$type<AssetExif | null>(),
    createdAt: createdAt(),
  },
  (table) => [index("assets_site_idx").on(table.siteId)],
);
