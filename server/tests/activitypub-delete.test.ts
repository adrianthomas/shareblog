import assert from "node:assert/strict";
import test from "node:test";
import type { Context } from "@fedify/fedify";
import { Delete, PUBLIC_COLLECTION } from "@fedify/vocab";
import { buildDeleteActivity } from "../src/activitypub/federation.js";
import type { ContentObject, Site } from "../src/render/templates/types.js";

const site = {
  id: "site-1",
  title: "Test Site",
  subdomain: "test",
  customDomain: "notes.example",
  locale: "en",
  federationEnabled: true,
} as Site;

const object = {
  id: "object-1",
  siteId: site.id,
  type: "thought",
  slug: "retracted-post",
  title: null,
  body: "Retract me",
  status: "published",
  sourceUrl: null,
  metadata: {},
  publishedAt: new Date("2026-09-07T10:00:00Z"),
  createdAt: new Date("2026-09-07T10:00:00Z"),
  updatedAt: new Date("2026-09-07T10:00:00Z"),
} as ContentObject;

const context = {
  getActorUri: (identifier: string) => new URL(`https://test.example/users/${identifier}`),
  getFollowersUri: (identifier: string) => new URL(`https://test.example/users/${identifier}/followers`),
} as Context<void>;

test("builds a public Delete activity for the original ActivityPub object", () => {
  const activity = buildDeleteActivity(context, site, object, new Date("2026-09-07T12:34:56Z"));

  assert.ok(activity instanceof Delete);
  assert.equal(activity.id?.href, "https://notes.example/posts/retracted-post#delete-1788784496000");
  assert.equal(activity.actorId?.href, "https://test.example/users/test");
  assert.equal(activity.objectId?.href, "https://notes.example/posts/retracted-post");
  assert.equal(activity.toId?.href, PUBLIC_COLLECTION.href);
  assert.equal(activity.ccId?.href, "https://test.example/users/test/followers");
});
