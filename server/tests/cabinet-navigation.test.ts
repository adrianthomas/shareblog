import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CabinetNavigation } from "../src/render/themes/cabinet.js";

test("Cabinet navigation exposes the current section through its compact index trigger", () => {
  const html = renderToStaticMarkup(
    React.createElement(CabinetNavigation, {
      locale: "en",
      currentPath: "/articles/example",
      availablePaths: ["/articles", "/books"],
    }),
  );

  assert.match(html, /^<details class="cabinet-navigation">/);
  assert.match(html, /<summary class="cabinet-nav-trigger" aria-label="Filter categories">/);
  assert.match(html, /<span aria-hidden="true">02<\/span>Articles/);
  assert.match(html, /href="\/articles" aria-current="page"/);
  assert.doesNotMatch(html, /href="\/posts"/);
});
