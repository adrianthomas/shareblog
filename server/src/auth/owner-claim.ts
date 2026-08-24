import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "../db/client.js";
import { ownerClaims, users } from "../db/schema.js";
import { hashToken } from "./tokens.js";

/** How long a pairing code printed by `bootstrap-owner.ts` stays valid. */
export const CLAIM_CODE_TTL_MINUTES = 20;

/**
 * Redeems a pairing code minted by an interactive `npm run bootstrap-owner`
 * run (see db/bootstrap-owner.ts) — the QR/manual-entry alternative to the
 * email code flow for first sign-in. Single-use and short-lived, same shape
 * as the email magic-code flow in magic-code.ts, just keyed by the code
 * itself instead of an email address.
 */
export async function claimOwner(code: string) {
  const codeHash = hashToken(code);
  const [row] = await db
    .select()
    .from(ownerClaims)
    .where(and(eq(ownerClaims.codeHash, codeHash), isNull(ownerClaims.consumedAt), gt(ownerClaims.expiresAt, new Date())))
    .limit(1);

  if (!row) return null;

  await db.update(ownerClaims).set({ consumedAt: new Date() }).where(eq(ownerClaims.id, row.id));

  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  return user ?? null;
}
