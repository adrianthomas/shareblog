import got from "got";
import type { ResolvedBookCandidate } from "./types.js";

interface OpenLibraryDoc {
  title: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
}

interface OpenLibrarySearchResponse {
  docs: OpenLibraryDoc[];
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
    return {
      title: doc.title,
      author: doc.author_name?.[0] ?? "Unknown author",
      isbn13,
      isbn10,
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : undefined,
      source: "open_library",
    };
  });
}
