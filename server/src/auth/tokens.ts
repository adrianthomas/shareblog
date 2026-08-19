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
