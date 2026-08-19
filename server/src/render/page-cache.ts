// Renders happen on every request (DB query + React SSR) with nothing in
// front of the server on Uberspace — no CDN, single process. This absorbs
// repeat hits to the same page in-process instead of re-rendering each time.
// Bounded size since it's shared across every tenant site on the box.
const MAX_ENTRIES = 500;
export const PAGE_CACHE_TTL_MS = 30_000;

interface CacheEntry {
  body: string;
  contentType: string;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

function cacheKey(siteId: string, url: string): string {
  return `${siteId}:${url}`;
}

export function getCachedPage(siteId: string, url: string): CacheEntry | undefined {
  const key = cacheKey(siteId, url);
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry;
}

export function setCachedPage(siteId: string, url: string, body: string, contentType: string): void {
  const key = cacheKey(siteId, url);
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  store.set(key, { body, contentType, expiresAt: Date.now() + PAGE_CACHE_TTL_MS });
}

// Called on publish/edit/delete so authors see changes immediately instead
// of waiting out the TTL.
export function invalidateSitePages(siteId: string): void {
  const prefix = `${siteId}:`;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
