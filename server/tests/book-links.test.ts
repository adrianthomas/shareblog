import assert from "node:assert/strict";
import test from "node:test";
import { bookRetailerLinksFor, buildBookRetailerLinks, canonicalBookIsbn } from "../src/lib/book-links.js";

test("normalizes an ISBN-13 as the canonical book reference", () => {
  assert.equal(canonicalBookIsbn({ isbn13: "978-0-316-76948-8" }), "9780316769488");
});

test("derives current retailer destinations for ISBN-backed posts", () => {
  const links = bookRetailerLinksFor("The Catcher in the Rye", "J. D. Salinger", {
    isbn13: "9780316769488",
    links: { bookshop: "https://old.example/book" },
  });

  assert.equal(links?.bookshop, "https://bookshop.org/search?keywords=9780316769488");
  assert.equal(links?.amazon?.us, "https://www.amazon.com/dp/0316769487");
  assert.notEqual(links?.bookshop, "https://old.example/book");
});

test("keeps stored links as the compatibility fallback when no ISBN exists", () => {
  const stored = { bookshop: "https://legacy.example/title" };
  assert.strictEqual(bookRetailerLinksFor("Legacy book", "Author", { links: stored }), stored);
});

test("uses an ISBN search for identifiers without an ISBN-10 equivalent", () => {
  const links = buildBookRetailerLinks("Example", "Author", { isbn13: "9791234567896" });
  assert.equal(links.amazon?.de, "https://www.amazon.de/s?k=9791234567896");
});
