import assert from "node:assert/strict";
import test from "node:test";
import { formatBasicText, formatRichText, stripBasicFormatting } from "../src/render/format.js";

test("renders imported Markdown links with optional titles", () => {
  const markdown =
    '[Olympus OM-D E-M5 on Amazon](https://www.amazon.com/dp/B0074WDERI/?tag=whitjetp-20 "E-M5 mark 1 on Amazon")';

  assert.equal(
    formatBasicText(markdown),
    '<p><a href="https://www.amazon.com/dp/B0074WDERI/?tag=whitjetp-20" title="E-M5 mark 1 on Amazon" target="_blank" rel="noopener noreferrer">Olympus OM-D E-M5 on Amazon</a></p>',
  );
  assert.equal(stripBasicFormatting(markdown), "Olympus OM-D E-M5 on Amazon");
});

test("supports every Markdown link-title delimiter and escapes title text", () => {
  const markdown = [
    '[double](https://example.com/double "A & B")',
    "[single](https://example.com/single 'Single title')",
    "[parenthesized](https://example.com/parenthesized (Parenthesized title))",
  ].join("\n\n");

  const html = formatRichText(markdown);
  assert.match(html, /href="https:\/\/example\.com\/double" title="A &amp; B"/);
  assert.match(html, /href="https:\/\/example\.com\/single" title="Single title"/);
  assert.match(html, /href="https:\/\/example\.com\/parenthesized" title="Parenthesized title"/);
});

test("renders an image-only block with an optional title", () => {
  assert.equal(
    formatRichText('![Camera](https://example.com/camera.jpg "Front & rear")'),
    '<img src="https://example.com/camera.jpg" alt="Camera" title="Front &amp; rear" loading="lazy" />',
  );
});
