export const AMAZON_REGIONS = ["us", "uk", "de", "fr", "it", "es", "ca", "jp"] as const;

export type AmazonRegion = (typeof AMAZON_REGIONS)[number];

export interface BookRetailerLinks {
  amazon?: Partial<Record<AmazonRegion, string>>;
  bookshop?: string;
  kobo?: string;
  appleBooks?: string;
  storygraph?: string;
}

export type GeneratedBookRetailerLinks = BookRetailerLinks & {
  amazon: Partial<Record<AmazonRegion, string>>;
};

export interface BookLinkSource {
  isbn13?: string;
  isbn10?: string;
  links?: BookRetailerLinks;
}

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

function normalizedIsbn13(value: string | undefined): string | undefined {
  const normalized = value?.replace(/[^0-9]/g, "");
  if (!normalized || !/^\d{13}$/.test(normalized)) return undefined;
  const sum = normalized
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return sum % 10 === 0 ? normalized : undefined;
}

function normalizedIsbn10(value: string | undefined): string | undefined {
  const normalized = value?.replace(/[^0-9X]/gi, "").toUpperCase();
  if (!normalized || !/^\d{9}[\dX]$/.test(normalized)) return undefined;
  const sum = normalized.split("").reduce((total, character, index) => {
    const digit = character === "X" ? 10 : Number(character);
    return total + (10 - index) * digit;
  }, 0);
  return sum % 11 === 0 ? normalized : undefined;
}

// Amazon uses ISBN-10 as the ASIN for print books. ISBN-13 values beginning
// with 978 can be converted; 979 identifiers have no ISBN-10 equivalent.
function isbn13ToIsbn10(isbn13: string): string | undefined {
  if (!/^978\d{10}$/.test(isbn13)) return undefined;
  const core = isbn13.slice(3, 12);
  const sum = core
    .split("")
    .reduce((total, digit, index) => total + (10 - index) * Number(digit), 0);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? "X" : String(check));
}

export function canonicalBookIsbn(source: Pick<BookLinkSource, "isbn13" | "isbn10">): string | undefined {
  return normalizedIsbn13(source.isbn13) ?? normalizedIsbn10(source.isbn10);
}

export function buildBookRetailerLinks(
  title: string,
  author: string,
  source: Pick<BookLinkSource, "isbn13" | "isbn10"> = {},
): GeneratedBookRetailerLinks {
  const isbn13 = normalizedIsbn13(source.isbn13);
  const isbn10 = normalizedIsbn10(source.isbn10);
  const canonicalIsbn = isbn13 ?? isbn10;
  const asin = isbn10 ?? (isbn13 ? isbn13ToIsbn10(isbn13) : undefined);
  const query = encodeURIComponent(canonicalIsbn ?? `${title} ${author}`);
  const amazon: Partial<Record<AmazonRegion, string>> = {};

  for (const region of AMAZON_REGIONS) {
    const domain = AMAZON_DOMAINS[region];
    amazon[region] = asin ? `https://www.${domain}/dp/${asin}` : `https://www.${domain}/s?k=${query}`;
  }

  return {
    amazon,
    bookshop: `https://bookshop.org/search?keywords=${query}`,
    kobo: `https://www.kobo.com/search?query=${query}`,
    appleBooks: `https://books.apple.com/search?term=${query}`,
    storygraph: `https://app.thestorygraph.com/browse?search_term=${query}`,
  };
}

// ISBN-backed posts deliberately ignore their stored URL snapshot. That makes
// this policy the single place where destinations can evolve, and updates old
// posts on their next render. Pre-ISBN/manual posts retain their original links.
export function bookRetailerLinksFor(
  title: string,
  author: string,
  source: BookLinkSource,
): BookRetailerLinks | undefined {
  if (!canonicalBookIsbn(source)) return source.links;
  return buildBookRetailerLinks(title, author, source);
}
