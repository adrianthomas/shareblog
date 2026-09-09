import got from "got";
import type { Logger } from "pino";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { assets } from "../db/schema.js";
import { createImageAsset, imageAssetResponse } from "./image-assets.js";
import { isAppleMusicUrl } from "./music-links.js";

const MAX_ARTWORK_BYTES = 10 * 1024 * 1024;

export function isAppleArtworkUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "mzstatic.com" || host.endsWith(".mzstatic.com"));
  } catch {
    return false;
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function appleMusicLink(metadata: Record<string, unknown>, sourceUrl: string | undefined): string | undefined {
  const links = metadata.links && typeof metadata.links === "object"
    ? metadata.links as Record<string, unknown>
    : {};
  const candidates = [stringValue(links.appleMusic), stringValue(metadata.sourceUrl), sourceUrl];
  return candidates.find((candidate) => isAppleMusicUrl(candidate));
}

async function importArtwork(siteId: string, artworkUrl: string) {
  const response = await got(artworkUrl, {
    followRedirect: false,
    timeout: { request: 8000 },
  });
  const contentType = response.headers["content-type"]?.split(";", 1)[0]?.toLowerCase();
  if (!contentType?.startsWith("image/")) {
    throw new Error("Apple Music artwork response was not an image.");
  }
  if (response.rawBody.length > MAX_ARTWORK_BYTES) {
    throw new Error("Apple Music artwork exceeded the 10 MB limit.");
  }
  const filename = new URL(artworkUrl).pathname.split("/").pop() || "apple-music-artwork";
  return imageAssetResponse(await createImageAsset(siteId, response.rawBody, filename));
}

async function ownedArtwork(siteId: string, assetId: string | undefined) {
  if (!assetId) return undefined;
  const [asset] = await db.select().from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.siteId, siteId)))
    .limit(1);
  if (!asset) return undefined;
  const response = imageAssetResponse(asset);
  return { id: response.id, url: response.url };
}

/**
 * Converts client-supplied music metadata into the public storage contract:
 * Apple is the only outbound provider and artwork is served from this server.
 * A failed artwork copy never falls back to a visitor-visible remote URL.
 */
export async function materializeAppleMusicMetadata(
  siteId: string,
  input: unknown,
  sourceUrl: string | undefined,
  log?: Pick<Logger, "warn">,
): Promise<{ metadata: Record<string, unknown>; sourceUrl?: string }> {
  const metadata = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const appleMusic = appleMusicLink(metadata, sourceUrl);
  const artworkAssetId = stringValue(metadata.artworkAssetId);
  const artworkUrl = stringValue(metadata.artworkUrl);
  // Never trust a caller-supplied URL merely because it is accompanied by
  // an asset id. Rebuild the URL from an asset owned by the current site.
  let localArtwork = await ownedArtwork(siteId, artworkAssetId);

  if (!localArtwork && appleMusic && isAppleArtworkUrl(artworkUrl)) {
    try {
      const imported = await importArtwork(siteId, artworkUrl!);
      localArtwork = { id: imported.id, url: imported.url };
    } catch (error) {
      log?.warn({ err: error, artworkUrl }, "could not cache Apple Music artwork; publishing without artwork");
    }
  }

  const sanitized: Record<string, unknown> = {
    artist: stringValue(metadata.artist) ?? "Unknown artist",
    releaseTitle: stringValue(metadata.releaseTitle) ?? "Untitled",
    ...(metadata.showArtwork === false ? { showArtwork: false } : {}),
    ...(localArtwork ? { artworkAssetId: localArtwork.id, artworkUrl: localArtwork.url } : {}),
    ...(appleMusic ? { sourceUrl: appleMusic, links: { appleMusic } } : { links: {} }),
  };
  return { metadata: sanitized, ...(appleMusic ? { sourceUrl: appleMusic } : {}) };
}
