import type { Site } from "./templates/types.js";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderFavicon(site: Site): string {
  const identity = site.profileName?.trim() || site.title.trim() || "Shareblog";
  const initial = escapeXml(Array.from(identity)[0]?.toLocaleUpperCase(site.locale) ?? "S");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>
    .background { fill: #111827; }
    .initial { fill: #fff; font: 700 40px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    @media (prefers-color-scheme: dark) {
      .background { fill: #f8fafc; }
      .initial { fill: #111827; }
    }
  </style>
  <rect class="background" width="64" height="64" rx="14" />
  <text class="initial" x="32" y="45" text-anchor="middle">${initial}</text>
</svg>`;
}
