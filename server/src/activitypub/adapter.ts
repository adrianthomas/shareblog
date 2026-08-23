import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { federation } from "./federation.js";

// A hand-rolled Fastify<->Fedify bridge, registered only on the exact
// paths Federation owns — deliberately NOT using the official
// @fedify/fastify plugin. That plugin installs a global onRequest hook
// (via fastify-plugin, which breaks Fastify's normal encapsulation) that
// runs on every request in the app, not just ActivityPub ones, and
// converts each one to a Web Request. Since onRequest fires before
// Fastify has parsed the body, request.body is always undefined there, so
// it always takes the "stream the raw body" branch — which throws
// ("duplex option is required when sending a body") on literally any
// POST/PATCH/PUT/DELETE with a body anywhere in the app, federation-
// related or not. Confirmed by testing: it 500'd POST /api/v1/sites.
//
// Registering real routes instead avoids all of that: these paths never
// touch the rest of the app's body parsing, and vice versa.
const AP_CONTENT_TYPES = ["application/activity+json", "application/ld+json"];

async function handle(request: FastifyRequest, reply: FastifyReply, body?: Buffer): Promise<void> {
  const url = `${request.protocol}://${request.headers.host}${request.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  // A plain Buffer (not a stream) needs no `duplex` option — this is the
  // fix for the bug described above.
  const webRequest = new Request(url, { method: request.method, headers, body });
  const response = await federation.fetch(webRequest, { contextData: undefined });

  reply.code(response.status);
  response.headers.forEach((value, key) => reply.header(key, value));
  reply.send(Buffer.from(await response.arrayBuffer()));
}

export async function activityPubRoutes(app: FastifyInstance) {
  // ActivityPub inbox POSTs use application/activity+json or
  // application/ld+json, which Fastify has no built-in parser for; read
  // them as a raw buffer rather than trying to JSON-parse (Fedify does
  // its own JSON-LD parsing internally).
  app.addContentTypeParser(AP_CONTENT_TYPES, { parseAs: "buffer" }, (_req, body, done) => done(null, body));

  app.get("/.well-known/webfinger", (request, reply) => handle(request, reply));
  app.get("/users/:identifier", (request, reply) => handle(request, reply));
  app.get("/users/:identifier/followers", (request, reply) => handle(request, reply));
  app.get("/users/:identifier/outbox", (request, reply) => handle(request, reply));
  app.post("/users/:identifier/inbox", (request, reply) => handle(request, reply, request.body as Buffer));
  app.post("/inbox", (request, reply) => handle(request, reply, request.body as Buffer));
}
