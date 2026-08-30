import type { FastifyInstance } from "fastify";
import { themeValues, type Theme } from "../db/schema.js";

interface ThemeOption {
  id: Theme;
  name: string;
  description: string;
}

const themeOptions = [
  {
    id: "classic",
    name: "Classic",
    description: "A simple chronological site with clean typography and article-style posts.",
  },
  {
    id: "cards",
    name: "Cards",
    description: "A visual, full-bleed card layout where posts expand into detail views when tapped.",
  },
  {
    id: "washi",
    name: "Washi",
    description: "A calmer paper-and-ink look with warm tones and serif headings.",
  },
  {
    id: "prism",
    name: "Prism",
    description: "A bright, playful theme with crisp cards, rounded typography, and blue-pink accents.",
  },
  {
    id: "ledger",
    name: "Ledger",
    description: "A polished index-style theme with clean rows, type labels, and iOS-style push detail views.",
  },
  {
    id: "cabinet",
    name: "Cabinet",
    description: "An editorial cabinet of photos, notes, books, music, and essays, wired together as one living personal index.",
  },
] satisfies ThemeOption[];

const missingThemeMetadata = themeValues.filter((theme) => !themeOptions.some((option) => option.id === theme));
if (missingThemeMetadata.length > 0) {
  throw new Error(`Missing theme metadata for: ${missingThemeMetadata.join(", ")}`);
}

export async function themeRoutes(app: FastifyInstance) {
  app.get("/themes", async (_request, reply) => {
    return reply.send({ themes: themeOptions });
  });
}
