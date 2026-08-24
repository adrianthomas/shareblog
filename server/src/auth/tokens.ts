import { randomBytes, createHash } from "node:crypto";

export function generateApiToken(): string {
  return `sbk_${randomBytes(32).toString("base64url")}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateMagicLinkToken(): string {
  return randomBytes(32).toString("base64url");
}

/** 6-digit numeric code for the mobile app's short-code auth flow. */
export function generateMobileCode(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, "0");
}

// Excludes visually-ambiguous characters (0/O, 1/I/L) — this code is
// primarily scanned from a QR code, but needs to stay legible for the
// type-it-by-hand fallback. 8 chars from this 32-symbol alphabet is ~40 bits
// of entropy, well beyond what a rate-limited, short-lived, single-use code
// needs (see POST /auth/claim-owner).
const CLAIM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Pairing code for the QR/manual-entry owner-claim flow — see bootstrap-owner.ts. */
export function generateClaimCode(length = 8): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CLAIM_CODE_ALPHABET[bytes[i] % CLAIM_CODE_ALPHABET.length];
  }
  return code;
}
