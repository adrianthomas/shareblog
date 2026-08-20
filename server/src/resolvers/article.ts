import got from "got";
import metascraper from "metascraper";
import metascraperTitle from "metascraper-title";
import metascraperDescription from "metascraper-description";
import metascraperImage from "metascraper-image";
import metascraperAuthor from "metascraper-author";
import metascraperPublisher from "metascraper-publisher";
import metascraperUrl from "metascraper-url";
import type { ResolvedArticle } from "./types.js";

const scraper = metascraper([
  metascraperTitle(),
  metascraperDescription(),
  metascraperImage(),
  metascraperAuthor(),
  metascraperPublisher(),
  metascraperUrl(),
]);

// Scraping is best-effort: sites block bots, 404, time out, or serve HTML
// metascraper can't parse. Rather than fail the whole share, fall back to
// the plain URL so the user can supply title/excerpt/etc themselves.
export async function resolveArticle(targetUrl: string): Promise<ResolvedArticle> {
  try {
    const response = await got(targetUrl, { timeout: { request: 8000 } });
    const metadata = await scraper({ html: response.body, url: targetUrl });

    return {
      title: metadata.title || undefined,
      excerpt: metadata.description || undefined,
      imageUrl: metadata.image || undefined,
      siteName: metadata.publisher || undefined,
      canonicalUrl: metadata.url || targetUrl,
    };
  } catch {
    return { canonicalUrl: targetUrl };
  }
}
