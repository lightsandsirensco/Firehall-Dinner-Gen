import type { CuisineKind, ProteinKind } from "./taxonomy.js";
import { CUISINE_KINDS, PROTEIN_KINDS } from "./taxonomy.js";

const PROTEIN_ALIASES: Record<string, ProteinKind> = {
  chicken: "chicken",
  beef: "beef",
  pork: "pork",
  turkey: "turkey",
  seafood: "seafood",
  fish: "fish",
  salmon: "seafood",
  shrimp: "seafood",
  lamb: "lamb",
  vegetarian: "vegetarian",
  veggie: "vegetarian",
  vegan: "vegan",
  mixed: "mixed",
  any: "mixed",
};

const CUISINE_ALIASES: Record<string, CuisineKind> = {
  american: "american",
  mexican: "mexican",
  italian: "italian",
  bbq: "bbq",
  barbecue: "bbq",
  southern: "southern",
  mediterranean: "mediterranean",
  asian: "asian",
  indian: "indian",
  greek: "greek",
  cajun: "cajun",
  japanese: "japanese",
  thai: "thai",
  moroccan: "moroccan",
  argentinian: "argentinian",
  comfort: "comfort",
};

export function normalizeProteinKind(raw: string | undefined | null): ProteinKind {
  const k = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if ((PROTEIN_KINDS as readonly string[]).includes(k)) return k as ProteinKind;
  return PROTEIN_ALIASES[k] ?? "other";
}

export function normalizeCuisineKind(raw: string | undefined | null): CuisineKind {
  const k = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if ((CUISINE_KINDS as readonly string[]).includes(k)) return k as CuisineKind;
  return CUISINE_ALIASES[k] ?? "other";
}
