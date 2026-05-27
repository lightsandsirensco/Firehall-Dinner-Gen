/**
 * Canonical recipe catalog — internal source-of-truth for real, attributed meals.
 * Populated via Spoonacular V2 write-through (not AI invention).
 *
 * Platform recipe document schema (identity, ingredients, media, scoring):
 * @see `./recipe/index.js` — `FirehallRecipe` + Zod validators + legacy adapters.
 */

import type { GenerateResponse } from "./schema.js";

export type CatalogSourceKind = "spoonacular" | "curated" | "publisher" | "template";

export type MealArchetype =
  | "pasta_night"
  | "taco_night"
  | "bbq_night"
  | "sandwich_night"
  | "healthy_bowl"
  | "slow_cooker"
  | "grill_night"
  | "comfort_night"
  | "breakfast_dinner"
  | "station_classic"
  | "plated_main";

export interface RecipeSourceAttribution {
  kind: CatalogSourceKind;
  name: string;
  url: string;
  license: "aggregator" | "owned" | "partner" | "internal";
}

/** Full persisted catalog row (payload includes scaled GenerateResponse). */
export interface CanonicalRecipe {
  catalogId: string;
  spoonacularId?: number;
  curatedSlug?: string;

  title: string;
  heroImage: string;
  imageAlt: string;

  protein: string;
  cuisine: string;
  mealFormat: string;
  mealArchetype: MealArchetype;
  cookingStyle: string;

  prepMinutes: number;
  totalMinutes: number;
  cleanupDifficulty: 1 | 2 | 3 | 4 | 5;
  servingsBase: number;

  tags: string[];
  comfortScore: number;
  healthyScore: number;
  firehallSuitabilityScore: number;
  appetiteScore: number;
  qualityScore: number;

  source: RecipeSourceAttribution;

  /** Final hall-scaled recipe as served to the client */
  generateResponse: GenerateResponse;

  catalogVersion: number;
  servedCount: number;
  createdAt: string;
  updatedAt: string;
}

export function catalogIdFromSpoonacularId(spoonacularId: number): string {
  return `spoonacular:${spoonacularId}`;
}

export function catalogIdFromCuratedSlug(slug: string): string {
  return `curated:${slug}`;
}

export function parseSpoonacularIdFromCatalogId(catalogId: string): number | null {
  const m = catalogId.match(/^spoonacular:(\d+)$/);
  if (!m) return null;
  const id = parseInt(m[1], 10);
  return Number.isFinite(id) ? id : null;
}

/** Map generator meal_format → editorial archetype */
export function mealFormatToArchetype(mealFormat: string): MealArchetype {
  const map: Record<string, MealArchetype> = {
    pasta: "pasta_night",
    tacos: "taco_night",
    wrap: "taco_night",
    burger: "sandwich_night",
    sandwich: "sandwich_night",
    bowl: "healthy_bowl",
    salad: "healthy_bowl",
    sheet_pan: "grill_night",
    grill: "grill_night",
    skillet: "grill_night",
    stir_fry: "healthy_bowl",
    soup_chili: "slow_cooker",
    stew: "slow_cooker",
    one_pot: "comfort_night",
    casserole: "comfort_night",
    breakfast: "breakfast_dinner",
    loaded_fries: "bbq_night",
    plated_main: "plated_main",
    random: "plated_main",
  };
  return map[mealFormat] || "plated_main";
}

const PUBLISHER_HOST_LABELS: Record<string, string> = {
  "damndelicious.net": "Damn Delicious",
  "halfbakedharvest.com": "Half Baked Harvest",
  "budgetbytes.com": "Budget Bytes",
  "cafedelites.com": "Cafe Delites",
  "allrecipes.com": "AllRecipes",
  "seriouseats.com": "Serious Eats",
  "cooking.nytimes.com": "NYT Cooking",
  "bonappetit.com": "Bon Appétit",
  "foodnetwork.com": "Food Network",
  "tasty.co": "Tasty",
  "mob.co.uk": "Mob Kitchen",
};

/** Best-effort publisher label from original recipe URL */
export function publisherNameFromSourceUrl(sourceUrl: string): string {
  if (!sourceUrl?.trim()) return "Recipe source";
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./i, "").toLowerCase();
    if (PUBLISHER_HOST_LABELS[host]) return PUBLISHER_HOST_LABELS[host];
    const parts = host.split(".");
    const base = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    if (!base) return "Recipe source";
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "Recipe source";
  }
}

export function inferCleanupDifficulty(
  mealFormat: string,
  title: string,
  stepsCount: number,
): 1 | 2 | 3 | 4 | 5 {
  const t = `${mealFormat} ${title}`.toLowerCase();
  if (/one[- ]?pot|sheet pan|slow cooker|crock/i.test(t)) return 2;
  if (/stir fry|skillet|taco|burger|sandwich/i.test(t)) return 3;
  if (/fry|deep fry|battered/i.test(t)) return 4;
  if (stepsCount > 12) return 4;
  return 3;
}
