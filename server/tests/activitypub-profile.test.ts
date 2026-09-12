import assert from "node:assert/strict";
import test from "node:test";
import { Image } from "@fedify/vocab";
import { siteActorIcon } from "../src/activitypub/federation.js";
import type { Site } from "../src/render/templates/types.js";

test("uses the configured favicon as the ActivityPub actor icon", () => {
  const icon = siteActorIcon({
    profileImageUrl: "https://cdn.example/profile.jpg",
  } as Site);

  assert.ok(icon instanceof Image);
  assert.equal(icon.url?.href, "https://cdn.example/profile.jpg");
});

test("omits the ActivityPub actor icon when no image is configured", () => {
  assert.equal(siteActorIcon({ profileImageUrl: null } as Site), undefined);
});
