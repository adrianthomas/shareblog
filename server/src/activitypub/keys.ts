import type { webcrypto } from "node:crypto";
import { generateCryptoKeyPair, exportJwk, importJwk } from "@fedify/fedify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { sites, type ApKeyPairJwk } from "../db/schema.js";

const ALGORITHMS = ["RSASSA-PKCS1-v1_5", "Ed25519"] as const satisfies readonly ApKeyPairJwk["alg"][];

// A site's actor key pairs (RSA for HTTP Signatures, Ed25519 for Object
// Integrity Proofs) are generated on first use and stored as JWK on the
// site row, rather than backfilled for every site up front.
export async function getOrCreateKeyPairs(site: typeof sites.$inferSelect): Promise<webcrypto.CryptoKeyPair[]> {
  if (site.apKeys && site.apKeys.length === ALGORITHMS.length) {
    return Promise.all(
      site.apKeys.map(async (pair): Promise<webcrypto.CryptoKeyPair> => ({
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

  await db.update(sites).set({ apKeys: stored }).where(eq(sites.id, site.id));

  return pairs;
}
