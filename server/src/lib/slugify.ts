export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** First few words of a body, used as a slug basis for types with no title (Thought). */
export function slugFromBody(body: string): string {
  const words = body.trim().split(/\s+/).slice(0, 8).join(" ");
  return slugify(words) || "post";
}
