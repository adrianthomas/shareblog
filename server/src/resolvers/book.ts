import got from "got";
import type { AmazonRegion, ResolvedBookCandidate } from "./types.js";

const AMAZON_DOMAINS: Record<AmazonRegion, string> = {
  us: "amazon.com",
  uk: "amazon.co.uk",
  de: "amazon.de",
  fr: "amazon.fr",
  it: "amazon.it",
  es: "amazon.es",
  ca: "amazon.ca",
  jp: "amazon.co.jp",
};

interface OpenLibraryDoc {
  title: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
}

interface OpenLibrarySearchResponse {
  docs: OpenLibraryDoc[];
}

// Amazon's book ASINs are the ISBN-10. Most sources only give us ISBN-13, so
// derive the ISBN-10 via the standard check-digit conversion when possible.
function isbn13ToIsbn10(isbn13: string): string | undefined {
  if (!/^978\d{10}$/.test(isbn13)) return undefined;
  const core = isbn13.slice(3, 12);
  const sum = core
    .split("")
    .reduce((total, digit, i) => total + (10 - i) * Number(digit), 0);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? "X" : String(check));
}

// Amazon's ISBN-based /dp/ link works on every regional storefront (each
// carries its own catalog under the same ASIN), so one ASIN covers all of them.
function buildAmazonLinks(asin: string | undefined, query: string): ResolvedBookCandidate["links"]["amazon"] {
  const links: ResolvedBookCandidate["links"]["amazon"] = {};
  for (const region of Object.keys(AMAZON_DOMAINS) as AmazonRegion[]) {
    const domain = AMAZON_DOMAINS[region];
    links[region] = asin ? `https://www.${domain}/dp/${asin}` : `https://www.${domain}/s?k=${query}`;
  }
  return links;
}

function buildLinks(title: string, author: string, isbn13?: string, isbn10?: string): ResolvedBookCandidate["links"] {
  const asin = isbn10 ?? (isbn13 ? isbn13ToIsbn10(isbn13) : undefined);
  const query = encodeURIComponent(isbn13 ?? isbn10 ?? `${title} ${author}`);
  return {
    amazon: buildAmazonLinks(asin, query),
    bookshop: `https://bookshop.org/search?keywords=${query}`,
    kobo: `https://www.kobo.com/search?query=${query}`,
    appleBooks: `https://books.apple.com/search?term=${query}`,
  };
}

export async function resolveBook(query: string): Promise<ResolvedBookCandidate[]> {
  const response = await got("https://openlibrary.org/search.json", {
    searchParams: { q: query, limit: 5, fields: "title,author_name,isbn,cover_i" },
    responseType: "json",
    timeout: { request: 8000 },
  }).json<OpenLibrarySearchResponse>();

  return response.docs.slice(0, 3).map((doc) => {
    const isbn13 = doc.isbn?.find((i) => i.length === 13);
    const isbn10 = doc.isbn?.find((i) => i.length === 10);
    const author = doc.author_name?.[0] ?? "Unknown author";
    return {
      title: doc.title,
      author,
      isbn13,
      isbn10,
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : undefined,
      source: "open_library",
      links: buildLinks(doc.title, author, isbn13, isbn10),
    };
  });
}
