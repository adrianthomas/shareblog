import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local, fc00::/7
  if (normalized.startsWith("fe80")) return true; // link-local
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    if (isIP(mapped) === 4) return isPrivateIPv4(mapped);
  }
  return false;
}

function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // not a literal IP we recognize — refuse rather than guess
}

/**
 * Blocks the SSRF pivot resolvers/article.ts (and resolveMusic's fallback)
 * are exposed to: both fetch a user-supplied URL server-side with no other
 * restriction. Without this, an authenticated caller could point either
 * endpoint at Uberspace's internal network — other tenants' local services,
 * the box's own admin ports — or use the server as a port scanner.
 *
 * Must be re-run per redirect hop, not just on the original URL — got
 * follows redirects by default, and a public URL redirecting to a private
 * one is the standard way to smuggle a blocked target past a check that
 * only looks at the request as given.
 */
export async function assertSafeFetchTarget(rawUrl: string | URL): Promise<void> {
  const url = typeof rawUrl === "string" ? new URL(rawUrl) : rawUrl;
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Refusing to fetch unsupported protocol: ${url.protocol}`);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (hostname.toLowerCase() === "localhost") {
    throw new Error("Refusing to fetch a local/internal address.");
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error("Refusing to fetch a private/internal address.");
    }
    return;
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error("Refusing to fetch a private/internal address.");
  }
}
