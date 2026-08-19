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

export async function resolveArticle(targetUrl: string): Promise<ResolvedArticle> {
  const response = await got(targetUrl, { timeout: { request: 8000 } });
  const metadata = await scraper({ html: response.body, url: targetUrl });

  return {
    title: metadata.title || undefined,
    excerpt: metadata.description || undefined,
    imageUrl: metadata.image || undefined,
    siteName: metadata.publisher || undefined,
    canonicalUrl: metadata.url || targetUrl,
  };
}
