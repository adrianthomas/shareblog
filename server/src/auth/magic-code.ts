import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "../db/client.js";
import { magicTokens, users } from "../db/schema.js";
import { generateMagicLinkToken, generateMobileCode, hashToken } from "./tokens.js";
import { sendEmail } from "./email.js";

const CODE_TTL_MINUTES = 10;

// When set, only these emails can sign in or create an account — without it,
// anyone who finds the API can request a code, verify it, and create their
// own site on this box (real risk for a self-hosted single-tenant instance,
// none for local dev, so it's opt-in via env rather than hardcoded).
function isAllowedEmail(email: string): boolean {
  const allowlist = process.env.ALLOWED_SIGNUP_EMAILS;
  if (!allowlist) return true;
  return allowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export async function requestAuthCode(email: string, context: "web" | "mobile") {
  // No token is issued and no email is sent for a disallowed address, but the
  // route still replies 202 either way so this can't be used to probe which
  // emails are allowlisted.
  if (!isAllowedEmail(email)) return;

  const purpose = context === "mobile" ? "mobile_code" : "web_session";
  const secret = context === "mobile" ? generateMobileCode() : generateMagicLinkToken();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

  await db.insert(magicTokens).values({
    email,
    tokenHash: hashToken(secret),
    purpose,
    expiresAt,
  });

  if (context === "mobile") {
    await sendEmail({
      to: email,
      subject: "Your Shareblog sign-in code",
      text: `Your sign-in code is ${secret}. It expires in ${CODE_TTL_MINUTES} minutes.`,
    });
  } else {
    const link = `${process.env.API_BASE_URL}/api/v1/auth/magic/${secret}`;
    await sendEmail({
      to: email,
      subject: "Your Shareblog sign-in link",
      text: `Sign in: ${link}\n\nThis link expires in ${CODE_TTL_MINUTES} minutes.`,
    });
  }
}

async function consumeToken(email: string, secret: string, purpose: "web_session" | "mobile_code") {
  const tokenHash = hashToken(secret);
  const [row] = await db
    .select()
    .from(magicTokens)
    .where(
      and(
        eq(magicTokens.email, email),
        eq(magicTokens.tokenHash, tokenHash),
        eq(magicTokens.purpose, purpose),
        isNull(magicTokens.consumedAt),
        gt(magicTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) return null;

  await db.update(magicTokens).set({ consumedAt: new Date() }).where(eq(magicTokens.id, row.id));
  return row;
}

async function findOrCreateUser(email: string) {
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(users).values({ email }).returning();
  return created;
}

export async function verifyMobileCode(email: string, code: string) {
  const consumed = await consumeToken(email, code, "mobile_code");
  if (!consumed) return null;
  return findOrCreateUser(email);
}

export async function verifyWebMagicLink(secret: string) {
  const tokenHash = hashToken(secret);
  const [row] = await db
    .select()
    .from(magicTokens)
    .where(
      and(
        eq(magicTokens.tokenHash, tokenHash),
        eq(magicTokens.purpose, "web_session"),
        isNull(magicTokens.consumedAt),
        gt(magicTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) return null;
  await db.update(magicTokens).set({ consumedAt: new Date() }).where(eq(magicTokens.id, row.id));
  return findOrCreateUser(row.email);
}
