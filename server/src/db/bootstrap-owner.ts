// Creates the single owner account for a fresh self-hosted instance and
// mints a session token for it directly in the DB — the SSH-provisioning
// alternative to the email magic-link flow, meant to be run once over the
// same SSH session that does the rest of first-time setup (see
// UBERSPACE.md). Prints the raw token on a line by itself so a deploy
// script/app driving this over SSH can grab it straight from stdout; the
// token is never stored in cleartext server-side (only its hash is), so
// this is the only place it's ever printed.
//
// Idempotent by design: this instance is single-tenant (see the TODO on
// `sites.ownerUserId` in schema.ts), so if any user already exists, this
// is a no-op — running it again on every deploy must never mint a second
// owner or a stray extra token.
import "dotenv/config";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { users, apiTokens } from "./schema.js";
import { generateApiToken, hashToken } from "../auth/tokens.js";

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
  const db = drizzle(sqlite, { schema: { users, apiTokens } });

  const [existing] = await db.select().from(users).limit(1);
  if (existing) {
    console.log(`Owner already provisioned: ${existing.email}`);
    sqlite.close();
    return;
  }

  // No real inbox is required for this: every Uberspace account already
  // has a working <username>@uber.space address (see UBERSPACE.md), which
  // is a fine placeholder identity even though this flow never emails it.
  const email = (parseEmailArg() ?? `${process.env.USER}@uber.space`).toLowerCase();
  if (!email.includes("@")) {
    throw new Error(`Not a usable email: "${email}" — pass one explicitly with --email <address>`);
  }

  const [user] = await db.insert(users).values({ email }).returning();

  const token = generateApiToken();
  await db.insert(apiTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    deviceName: "bootstrap",
  });

  console.log(`Owner provisioned: ${email}`);
  console.log(`SHAREBLOG_BOOTSTRAP_TOKEN=${token}`);
  sqlite.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
