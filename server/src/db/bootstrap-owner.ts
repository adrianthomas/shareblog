// Creates the single owner account for a fresh self-hosted instance and, on
// an interactive run, mints a short-lived pairing code the iOS app can scan
// (or type in) to connect and sign in — no working mailbox needed just to
// get started. Meant to be run once over the same SSH session that does the
// rest of first-time setup (see UBERSPACE.md), and safe to re-run any time
// afterward to pair a new device.
//
// Idempotent for the owner-creation part: this instance is single-tenant
// (see the TODO on `sites.ownerUserId` in `schema.ts`), so if a user already
// exists, that part is a no-op — running it again on every deploy must
// never mint a second owner.
import "dotenv/config";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import QRCode from "qrcode";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { users, apiTokens, ownerClaims } from "./schema.js";
import { generateApiToken, generateClaimCode, hashToken } from "../auth/tokens.js";
import { CLAIM_CODE_TTL_MINUTES } from "../auth/owner-claim.js";

function parseEmailArg(): string | undefined {
  const flag = process.argv.indexOf("--email");
  return flag !== -1 ? process.argv[flag + 1] : undefined;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  mkdirSync(dirname(process.env.DATABASE_URL), { recursive: true });

  const sqlite = new Database(process.env.DATABASE_URL);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema: { users, apiTokens, ownerClaims } });

  let [user] = await db.select().from(users).limit(1);

  if (!user) {
    // No real inbox is required for this: every Uberspace account already
    // has a working <username>@uber.space address (see UBERSPACE.md), which
    // is a fine placeholder identity even though this flow never emails it.
    const email = (parseEmailArg() ?? `${process.env.USER}@uber.space`).toLowerCase();
    if (!email.includes("@")) {
      throw new Error(`Not a usable email: "${email}" — pass one explicitly with --email <address>`);
    }

    [user] = await db.insert(users).values({ email }).returning();

    const token = generateApiToken();
    await db.insert(apiTokens).values({
      userId: user.id,
      tokenHash: hashToken(token),
      deviceName: "bootstrap",
    });

    console.log(`Owner provisioned: ${email}`);
    // Kept for scripted/manual use (e.g. curl) — the QR/code flow below is
    // the one the iOS app can actually act on today.
    console.log(`SHAREBLOG_BOOTSTRAP_TOKEN=${token}`);
  } else {
    console.log(`Owner already provisioned: ${user.email}`);
  }

  // Only mint a pairing code on an interactive run — stdout isn't a TTY when
  // this runs unattended via deploy.sh over SSH (`ssh ... bash -s`), and
  // printing (and storing) a fresh one on every automated deploy would just
  // be noise nobody's there to scan.
  if (!process.stdout.isTTY) {
    sqlite.close();
    return;
  }

  const apiBaseURL = process.env.API_BASE_URL;
  if (!apiBaseURL) {
    console.log("\nSet API_BASE_URL in .env to enable scan-to-connect pairing.");
    sqlite.close();
    return;
  }

  const code = generateClaimCode();
  await db.insert(ownerClaims).values({
    userId: user.id,
    codeHash: hashToken(code),
    expiresAt: new Date(Date.now() + CLAIM_CODE_TTL_MINUTES * 60_000),
  });

  const pairingPayload = `shareblog://pair?api=${encodeURIComponent(apiBaseURL)}&code=${code}`;
  const qr = await QRCode.toString(pairingPayload, { type: "terminal", small: true });

  console.log("\nScan this in the Shareblog app to connect and sign in:\n");
  console.log(qr);
  console.log(`Can't scan? Enter this code by hand: ${code}`);
  console.log(`Expires in ${CLAIM_CODE_TTL_MINUTES} minutes, single use — re-run this command any time to get a new one.\n`);

  sqlite.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
