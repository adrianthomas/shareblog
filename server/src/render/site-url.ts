import type { Site } from "./templates/types.js";

export function siteOrigin(site: Site): string {
  const host = site.customDomain || `${site.subdomain}.${process.env.BASE_DOMAIN ?? "localhost:3000"}`;
  const hostname = host.replace(/:\d+$/, "");
  const scheme = hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" ? "http" : "https";
  return `${scheme}://${host}`;
}

export function absoluteSiteUrl(site: Site, path = "/"): string {
  return new URL(path, `${siteOrigin(site)}/`).href;
}
