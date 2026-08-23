import type { webcrypto } from "node:crypto";
import { generateCryptoKeyPair, exportJwk, importJwk } from "@fedify/fedify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { sites, siteActorKeys, type ApKeyPairJwk } from "../db/schema.js";

const ALGORITHMS = ["RSASSA-PKCS1-v1_5", "Ed25519"] as const satisfies readonly ApKeyPairJwk["alg"][];

// A site's actor key pairs (RSA for HTTP Signatures, Ed25519 for Object
// Integrity Proofs) are generated on first use and stored as JWK in
// site_actor_keys — its own table, not a column on `sites` (see the
// comment on that table in schema.ts for why: private keys must never
// end up in a plain `sites` row returned to a client).
export async function getOrCreateKeyPairs(site: typeof sites.$inferSelect): Promise<webcrypto.CryptoKeyPair[]> {
  const [existing] = await db.select().from(siteActorKeys).where(eq(siteActorKeys.siteId, site.id)).limit(1);
  if (existing && existing.keys.length === ALGORITHMS.length) {
    return Promise.all(
      existing.keys.map(async (pair): Promise<webcrypto.CryptoKeyPair> => ({
        publicKey: await importJwk(pair.publicKeyJwk, "public"),
        privateKey: await importJwk(pair.privateKeyJwk, "private"),
      })),
    );
  }

  const pairs: webcrypto.CryptoKeyPair[] = await Promise.all(ALGORITHMS.map((alg) => generateCryptoKeyPair(alg)));
  const stored: ApKeyPairJwk[] = await Promise.all(
    pairs.map(async (pair: webcrypto.CryptoKeyPair, i: number) => ({
      alg: ALGORITHMS[i],
      publicKeyJwk: await exportJwk(pair.publicKey),
      privateKeyJwk: await exportJwk(pair.privateKey),
    })),
  );

  await db
    .insert(siteActorKeys)
    .values({ siteId: site.id, keys: stored })
    .onConflictDoUpdate({ target: siteActorKeys.siteId, set: { keys: stored } });

  return pairs;
}
