/**
 * Rank and select catalog recipes for /api/generate (catalog-before-Spoonacular).
 */

import { log } from "./index";
import type { GenerateRequest, GenerateResponse } from "../shared/schema.js";
import type { CanonicalRecipe, RecipeSourceAttribution } from "../shared/canonical-recipe.js";
import { mealFormatToArchetype } from "../shared/canonical-recipe.js";
import { applyCrewPortionFloors, hallProTips } from "./firehall-voice.js";
import { proteinMatchesFilter } from "./spoonacular-converter.js";
import { computeSignature } from "./validateRecipe.js";
import { listCatalogCandidates } from "./recipe-catalog.js";

const TIME_MAX_MINUTES: Record<string, number> = {
  "15-25": 25,
  "20-30": 30,
  "25-40": 40,
  "30-45": 45,
  "45-60": 60,
  "60-90": 90,
};

const MIN_QUALITY_SCORE = 35;
const MIN_QUALITY_SCORE_RELAXED = 22;
const CANDIDATE_POOL_LIMIT = 80;

export interface CatalogPickOptions {
  recentSignatures?: string[];
  currentRecipeSignature?: string;
  /** Skip strict meal_format match and lower quality bar — used before template fallback. */
  relaxed?: boolean;
  /** Rotates among top catalog matches (e.g. hash of request_id). */
  varietySeed?: number;
  /** Session Spoonacular IDs to deprioritize (same as V2). */
  recentSpoonacularIds?: number[];
}

export interface CatalogGenerateHit {
  catalogId: string;
  spoonacularId?: number;
  originalTitle: string;
  protein: string;
  recipe: GenerateResponse;
  recipeSource?: RecipeSourceAttribution;
}

function normCuisine(c: string): string {
  return (c || "any").toLowerCase().replace(/\s+/g, "_");
}

function cuisineMatches(requestCuisine: string, catalogCuisine: string): boolean {
  const req = normCuisine(requestCuisine);
  if (req === "any") return true;
  const cat = normCuisine(catalogCuisine);
  if (cat === "any" || !cat) return true;
  if (req === cat) return true;
  if (req === "asian" && ["chinese", "korean", "thai", "japanese", "vietnamese"].includes(cat)) {
    return true;
  }
  if (req === "middle_eastern" && ["mediterranean", "greek", "middle eastern"].includes(cat)) {
    return true;
  }
  return false;
}

function signatureIsBlocked(
  sig: string,
  protein: string,
  options: CatalogPickOptions,
): boolean {
  if (options.currentRecipeSignature && sig === options.currentRecipeSignature) return true;
  if (options.recentSignatures?.includes(sig)) return true;
  return false;
}

function rescaleCatalogRecipe(canonical: CanonicalRecipe, request: GenerateRequest): GenerateResponse {
  const base = canonical.generateResponse;
  return {
    ...base,
    chosen_protein: canonical.protein,
    ingredients: applyCrewPortionFloors(base.ingredients || [], request.crew_size),
    pro_tips:
      base.pro_tips?.length ? base.pro_tips : hallProTips(request.crew_size, canonical.servingsBase || 4),
  };
}

function rankCatalogEntry(
  entry: CanonicalRecipe,
  request: GenerateRequest,
): number {
  let score = entry.qualityScore + Math.round((entry.appetiteScore || 0) * 0.25);
  const reqFormat = request.meal_format || "random";
  if (reqFormat !== "random" && entry.mealFormat === reqFormat) score += 12;
  const reqArchetype = mealFormatToArchetype(reqFormat);
  if (entry.mealArchetype === reqArchetype) score += 6;
  if (cuisineMatches(request.cuisine_style || "any", entry.cuisine)) score += 8;
  if (request.prefer_different_style && request.recent_meal_styles?.length) {
    const style = (entry.generateResponse.meal_style || "").toLowerCase();
    if (request.recent_meal_styles.some((s) => style.includes(s.toLowerCase()))) {
      score -= 15;
    }
  }
  // Penalize over-served catalog rows so early generations don't lock onto one "winner".
  score -= Math.min(12, Math.floor((entry.servedCount || 1) / 2));
  return score;
}

function hashVarietySeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const CATALOG_PICK_BAND = 8;

function pickFromViableBand(
  viable: Array<{ entry: CanonicalRecipe; rank: number }>,
  varietySeed: number,
): { entry: CanonicalRecipe; rank: number } {
  const band = viable.slice(0, CATALOG_PICK_BAND);
  if (band.length === 1) return band[0]!;
  const idx = varietySeed % band.length;
  return band[idx]!;
}

function filterCatalogEntry(
  entry: CanonicalRecipe,
  request: GenerateRequest,
  relaxed: boolean,
): boolean {
  const minQuality = relaxed ? MIN_QUALITY_SCORE_RELAXED : MIN_QUALITY_SCORE;
  if (entry.qualityScore < minQuality) return false;
  if (!entry.generateResponse?.title?.trim()) return false;
  const hasCuratedId = Boolean(entry.curatedSlug || entry.catalogId?.startsWith("curated:"));
  if ((!entry.spoonacularId || entry.spoonacularId <= 0) && !hasCuratedId) return false;

  const selectedProtein = request.protein || "any";
  if (!proteinMatchesFilter(entry.protein, selectedProtein)) return false;

  if (request.vegetarian_swap_needed && entry.protein !== "vegetarian") return false;

  const reqFormat = request.meal_format || "random";
  if (!relaxed && reqFormat !== "random" && entry.mealFormat !== reqFormat) return false;

  if (!relaxed && !cuisineMatches(request.cuisine_style || "any", entry.cuisine)) return false;

  const maxMin = TIME_MAX_MINUTES[request.time_available];
  const timeSlack = relaxed ? 20 : 10;
  if (maxMin && entry.totalMinutes > 0 && entry.totalMinutes > maxMin + timeSlack) return false;

  return true;
}

/**
 * Pick the best catalog recipe for this generate request, or null to fall through to live V2.
 */
export function pickCatalogRecipeForGenerate(
  request: GenerateRequest,
  options: CatalogPickOptions = {},
): CatalogGenerateHit | null {
  const relaxed = options.relaxed === true;
  const pool = listCatalogCandidates(CANDIDATE_POOL_LIMIT, request.protein);
  if (pool.length === 0) {
    log(`[catalog] generate miss: empty catalog${relaxed ? " (relaxed)" : ""}`, "catalog");
    return null;
  }

  const filtered = pool.filter((e) => filterCatalogEntry(e, request, relaxed));
  if (filtered.length === 0) {
    log(
      `[catalog] generate miss: no match (${pool.length} rows, protein=${request.protein} format=${request.meal_format}${relaxed ? ", relaxed" : ""})`,
      "catalog",
    );
    return null;
  }

  const ranked = filtered
    .map((entry) => ({ entry, rank: rankCatalogEntry(entry, request) }))
    .sort((a, b) => b.rank - a.rank);

  const recentSpoonIds = new Set(options.recentSpoonacularIds || []);
  const viable: Array<{ entry: CanonicalRecipe; rank: number }> = [];

  for (const item of ranked) {
    const { entry } = item;
    if (entry.spoonacularId && recentSpoonIds.has(entry.spoonacularId)) continue;

    const recipe = rescaleCatalogRecipe(entry, request);
    const sig = computeSignature(recipe);
    if (signatureIsBlocked(sig, entry.protein, options)) continue;

    viable.push(item);
    if (viable.length >= 24) break;
  }

  if (viable.length === 0) {
    log(`[catalog] generate miss: ${filtered.length} matched but all blocked by variety`, "catalog");
    return null;
  }

  const seedInput =
    options.varietySeed !== undefined
      ? String(options.varietySeed)
      : `${request.protein}:${(options.recentSignatures || []).length}`;
  const varietySeed = hashVarietySeed(seedInput);
  const { entry, rank } = pickFromViableBand(viable, varietySeed);

  log(
    `[catalog] generate hit id=${entry.catalogId} title="${entry.title.slice(0, 48)}" quality=${entry.qualityScore} rank=${rank} pick=${(varietySeed % Math.min(viable.length, CATALOG_PICK_BAND)) + 1}/${Math.min(viable.length, CATALOG_PICK_BAND)}${relaxed ? " (relaxed)" : ""}`,
    "catalog",
  );

  return {
    catalogId: entry.catalogId,
    spoonacularId: entry.spoonacularId,
    originalTitle: entry.title,
    protein: entry.protein,
    recipe: rescaleCatalogRecipe(entry, request),
    recipeSource: entry.source,
  };
}

/** Explore search last resort — any catalog row with a hero image (real recipe). */
export function pickCatalogExploreFallback(): {
  catalogId: string;
  spoonacularId: number;
  title: string;
  heroImage: string;
  readyInMinutes: number;
  summary: string;
  sourceName: string;
} | null {
  const pool = listCatalogCandidates(40).filter(
    (e) =>
      e.qualityScore >= MIN_QUALITY_SCORE_RELAXED &&
      e.spoonacularId &&
      e.spoonacularId > 0 &&
      !!e.heroImage?.trim(),
  );
  if (pool.length === 0) return null;

  const entry = pool[Math.floor(Math.random() * Math.min(pool.length, 8))];
  const base = entry.generateResponse;
  return {
    catalogId: entry.catalogId,
    spoonacularId: entry.spoonacularId!,
    title: entry.title,
    heroImage: entry.heroImage,
    readyInMinutes: entry.totalMinutes || base.timing?.total_min || 30,
    summary: base.why_it_fits_tonight || `A crew-tested ${entry.protein} meal from the Firehall catalog.`,
    sourceName: entry.source?.name || "Firehall catalog",
  };
}
