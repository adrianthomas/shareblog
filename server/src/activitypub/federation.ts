import { createFederation, MemoryKvStore, InProcessMessageQueue, type Context } from "@fedify/fedify";
import {
  Person,
  Note,
  Image,
  Article,
  Create,
  Follow,
  Accept,
  Undo,
  Endpoints,
  PUBLIC_COLLECTION,
  isActor,
  type Recipient,
} from "@fedify/vocab";
import { Temporal } from "@js-temporal/polyfill";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { apFollowers, contentObjects } from "../db/schema.js";
import type { Site, ContentObject } from "../render/templates/types.js";
import { siteForHost } from "../middleware/tenant.js";
import { siteOrigin, objectPath, feedTitle, feedItemContent } from "../render/render.js";
import { getOrCreateKeyPairs } from "./keys.js";

// One Federation instance serves every site as a virtual host — Fedify
// derives the origin per-request from the incoming Host header (ctx.host)
// rather than a single fixed origin, so no `origin` option is set here;
// see https://fedify.dev/manual/federation on virtual hosting.
//
// kv/queue are in-memory: there's no background job/queue infrastructure
// anywhere else in this codebase, and the project is deliberately scoped
// small (one site and a handful of actors). Known
// tradeoff: an in-flight retry is lost on process restart (every deploy
// restarts the service). Acceptable at this scale; worth revisiting with
// a persistent MessageQueue/KvStore if delivery reliability becomes a
// real problem.
export const federation = createFederation<void>({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

async function siteForIdentifier(host: string, identifier: string): Promise<Site | null> {
  const site = await siteForHost(host);
  if (!site || site.subdomain !== identifier) return null;
  return site;
}

federation
  .setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
    const site = await siteForIdentifier(ctx.host, identifier);
    if (!site) return null;

    // ctx.getActorKeyPairs() (distinct from keys.ts's getOrCreateKeyPairs,
    // which only returns raw CryptoKeyPairs) calls through to the
    // keyPairsDispatcher below and wraps each pair with the
    // cryptographicKey/multikey accessors the actor JSON needs.
    const keyPairs = await ctx.getActorKeyPairs(identifier);
    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: identifier,
      name: site.title,
      summary: site.about ?? site.tagline ?? undefined,
      url: new URL(siteOrigin(site)),
      inbox: ctx.getInboxUri(identifier),
      outbox: ctx.getOutboxUri(identifier),
      followers: ctx.getFollowersUri(identifier),
      endpoints: new Endpoints({ sharedInbox: ctx.getInboxUri() }),
      publicKey: keyPairs[0]?.cryptographicKey,
      assertionMethods: keyPairs.map((pair) => pair.multikey),
    });
  })
  .setKeyPairsDispatcher(async (ctx, identifier) => {
    const site = await siteForIdentifier(ctx.host, identifier);
    if (!site) return [];
    return getOrCreateKeyPairs(site);
  });

federation.setOutboxDispatcher("/users/{identifier}/outbox", async (ctx, identifier, cursor) => {
  const site = await siteForIdentifier(ctx.host, identifier);
  if (!site) return null;
  if (cursor !== null) return { items: [] }; // single-page collection for v1

  const rows = await db
    .select()
    .from(contentObjects)
    .where(and(eq(contentObjects.siteId, site.id), eq(contentObjects.status, "published")))
    .orderBy(desc(contentObjects.publishedAt))
    .limit(20);
  return { items: await Promise.all(rows.map((object) => buildCreateActivity(ctx, site, object))) };
});

federation.setFollowersDispatcher("/users/{identifier}/followers", async (ctx, identifier, cursor) => {
  const site = await siteForIdentifier(ctx.host, identifier);
  if (!site) return null;
  if (cursor !== null) return { items: [] }; // single-page collection for v1, small follower counts expected

  const rows = await db.select().from(apFollowers).where(eq(apFollowers.siteId, site.id));
  const items: Recipient[] = rows.map((row) => ({
    id: new URL(row.actorUri),
    inboxId: new URL(row.inboxUri),
    endpoints: row.sharedInboxUri ? { sharedInbox: new URL(row.sharedInboxUri) } : null,
  }));
  return { items };
});

federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, async (ctx, follow) => {
    const site = await siteForHost(ctx.host);
    if (!site) return;

    const actor = await follow.getActor(ctx);
    if (actor == null || !isActor(actor) || actor.id == null || actor.inboxId == null) return;

    const sharedInbox = actor.endpoints instanceof Endpoints ? actor.endpoints.sharedInbox : null;

    await db
      .insert(apFollowers)
      .values({
        siteId: site.id,
        actorUri: actor.id.href,
        inboxUri: actor.inboxId.href,
        sharedInboxUri: sharedInbox instanceof URL ? sharedInbox.href : null,
      })
      .onConflictDoNothing();

    await ctx.sendActivity(
      { identifier: site.subdomain },
      actor,
      new Accept({ actor: follow.objectId, object: follow }),
    );
  })
  .on(Undo, async (ctx, undo) => {
    const object = await undo.getObject(ctx);
    if (!(object instanceof Follow) || object.actorId == null) return;
    const site = await siteForHost(ctx.host);
    if (!site) return;
    await db
      .delete(apFollowers)
      .where(and(eq(apFollowers.siteId, site.id), eq(apFollowers.actorUri, object.actorId.href)));
  });

const AP_TYPE_FOR_CONTENT_TYPE: Record<ContentObject["type"], typeof Note | typeof Image | typeof Article> = {
  thought: Note,
  quote: Note,
  photo: Image,
  article: Article,
  link: Article,
  book: Article,
  music: Article,
};

// Shared by the outbox dispatcher (Mastodon reading a site's post history)
// and deliverCreateActivity (pushing a new one to followers) — same
// object, same activity shape, either way.
//
// name/content reuse feedTitle/feedItemContent from render.ts rather than
// the raw title/body columns, so a federated post gets the same treatment
// as its RSS entry: a real title even for types with no `title` column
// (thought, quote), plus cover image, rating, byline, and the buy/listen
// links list baked into the HTML — not just bare text.
async function buildCreateActivity(ctx: Context<void>, site: Site, object: ContentObject): Promise<Create> {
  const ObjectClass = AP_TYPE_FOR_CONTENT_TYPE[object.type];
  const url = `${siteOrigin(site)}/${objectPath(object)}`;
  const published = object.publishedAt ?? object.createdAt;

  const apObject = new ObjectClass({
    id: new URL(url),
    url: new URL(url),
    name: feedTitle(object, site.locale),
    content: await feedItemContent(object, site.locale),
    attribution: ctx.getActorUri(site.subdomain),
    published: Temporal.Instant.fromEpochMilliseconds(published.getTime()),
    to: PUBLIC_COLLECTION,
    cc: ctx.getFollowersUri(site.subdomain),
  });

  return new Create({
    id: new URL(`${url}#create`),
    actor: ctx.getActorUri(site.subdomain),
    object: apObject,
    to: PUBLIC_COLLECTION,
    cc: ctx.getFollowersUri(site.subdomain),
  });
}

// Delivers a Create activity to a site's followers when a post is
// published — called from routes/objects.ts on both the create-published
// and become-published paths.
export async function deliverCreateActivity(site: Site, object: ContentObject): Promise<void> {
  if (!site.federationEnabled) return;
  const ctx = federation.createContext(new URL(siteOrigin(site)), undefined);
  const activity = await buildCreateActivity(ctx, site, object);
  await ctx.sendActivity({ identifier: site.subdomain }, "followers", activity);
}
