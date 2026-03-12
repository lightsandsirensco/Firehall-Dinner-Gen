/**
 * V2 Recipe Generation Engine
 *
 * Generation flow:
 *   1. searchRecipes(filters)  — search Spoonacular for 5 candidates
 *   2. Select one candidate    — title-based protein pre-filter, random pick from matches
 *   3. getRecipeDetails(id)    — fetch full detail for the selected recipe ONLY
 *   4. Normalize               — convert Spoonacular shape → Firehall recipe shape
 *
 * Spoonacular is the source of truth for:
 *   title, ingredients, instructions, servings, timing, image, source data
 *
 * Rules:
 *   - No recipe invention in this flow
 *   - No relabeling into different meal types
 *   - Full details fetched for selected recipe only (not all candidates)
 */

import { log } from "./index";
import { searchRecipes, getRecipeDetails, type SpoonacularSearchResult } from "./spoonacular";
import { inferActualProtein, proteinMatchesFilter, convertSpoonacularToGenerateResponse } from "./spoonacular-converter";
import { ensureRiceForRiceDishes } from "./carb-rules";
import type { GenerateRequest, GenerateResponse } from "../shared/schema";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEARCH_CANDIDATES = 5;

// ─── Filter Mapping Tables ────────────────────────────────────────────────────

const CUISINE_MAP: Record<string, string> = {
  mediterranean: "mediterranean",
  mexican: "mexican",
  italian: "italian",
  asian: "chinese",
  korean: "korean",
  thai: "thai",
  indian: "indian",
  middle_eastern: "middle eastern",
  bbq: "",
  cajun: "cajun",
  canadian: "",
  any: "",
};

const FORMAT_TYPE_MAP: Record<string, { type: string; keyword: string }> = {
  burger:      { type: "main course", keyword: "burger" },
  tacos:       { type: "main course", keyword: "tacos" },
  wrap:        { type: "main course", keyword: "wrap" },
  bowl:        { type: "main course", keyword: "bowl" },
  pasta:       { type: "main course", keyword: "pasta" },
  salad:       { type: "salad",       keyword: "" },
  sheet_pan:   { type: "main course", keyword: "sheet pan" },
  skillet:     { type: "main course", keyword: "skillet" },
  stir_fry:    { type: "main course", keyword: "stir fry" },
  soup_chili:  { type: "soup",        keyword: "" },
  breakfast:   { type: "breakfast",   keyword: "" },
  loaded_fries:{ type: "main course", keyword: "loaded" },
  sandwich:    { type: "main course", keyword: "sandwich" },
  casserole:   { type: "main course", keyword: "casserole" },
  plated_main: { type: "main course", keyword: "" },
  random:      { type: "main course", keyword: "" },
};

const ALLERGEN_INTOLERANCE_MAP: Record<string, string> = {
  gluten:     "gluten",
  wheat:      "wheat",
  dairy:      "dairy",
  eggs:       "egg",
  peanuts:    "peanut",
  shellfish:  "shellfish",
  soy:        "soy",
  "tree-nuts":"tree nut",
  sesame:     "sesame",
  fish:       "seafood",
  seafood:    "seafood",
  sulphites:  "sulfite",
};

const TIME_MAP: Record<string, number> = {
  "15-25": 25,
  "20-30": 30,
  "25-40": 40,
  "30-45": 45,
  "45-60": 60,
  "60-90": 90,
};

// ─── Result Type ──────────────────────────────────────────────────────────────

export interface V2GenerateResult {
  recipe: GenerateResponse;
  originalTitle: string;
  protein: string;
  source: "spoonacular_v2";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectProtein(proteins: string[], healthiness: string): string {
  if (proteins.length === 1) return proteins[0];

  const LEAN_WEIGHTS:    Record<string, number> = { chicken: 4, turkey: 3, fish: 3, seafood: 3, vegetarian: 2, beef: 1, pork: 1 };
  const COMFORT_WEIGHTS: Record<string, number> = { beef: 4, pork: 3, chicken: 2, turkey: 2, seafood: 1, fish: 1, vegetarian: 1 };

  const weights = healthiness === "lean"    ? LEAN_WEIGHTS
                : healthiness === "comfort" ? COMFORT_WEIGHTS
                : {};

  const pool: string[] = [];
  for (const p of proteins) {
    const w = weights[p] ?? 2;
    for (let i = 0; i < w; i++) pool.push(p);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildIntolerances(allergens: string[]): string {
  return allergens
    .map((a) => ALLERGEN_INTOLERANCE_MAP[a.toLowerCase()] || "")
    .filter(Boolean)
    .join(",");
}

// ─── Step 2: Select one candidate from search results ────────────────────────
//
// Selection is done from the lightweight search result data only (title + metadata).
// No extra API call is made here — detail fetch happens after selection.

function selectCandidate(
  candidates: SpoonacularSearchResult[],
  chosenProtein: string,
): SpoonacularSearchResult | null {
  if (candidates.length === 0) return null;

  // Title-based protein pre-filter (zero API cost)
  const proteinMatches = candidates.filter((c) => {
    const quick = inferActualProtein(c.title, []);
    // "unknown" = no clear protein word in title → let the result through
    return quick === "unknown" || proteinMatchesFilter(quick, chosenProtein);
  });

  const pool = proteinMatches.length > 0 ? proteinMatches : candidates;

  // Random pick from the filtered pool for variety on repeated requests
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function runV2Generate(
  request: GenerateRequest,
): Promise<V2GenerateResult | null> {
  if (!process.env.SPOONACULAR_API_KEY) {
    log("[v2] SPOONACULAR_API_KEY not set — V2 engine unavailable", "v2");
    return null;
  }

  const allergens = request.allergens_to_avoid || [];
  const chosenProtein = selectProtein(request.proteins, request.healthiness_preference);
  const intolerances = buildIntolerances(allergens);
  const cuisineKey = request.cuisine_style || "any";
  const spoonacularCuisine = CUISINE_MAP[cuisineKey] ?? "";
  const formatInfo = FORMAT_TYPE_MAP[request.meal_format || "random"] ?? { type: "main course", keyword: "" };
  const maxReadyTime = TIME_MAP[request.time_available] || 60;
  const diet = request.proteins.length === 1 && request.proteins[0] === "vegetarian" ? "vegetarian" : undefined;

  // Build query: protein + optional format keyword + inline cuisine keyword
  const queryParts = [chosenProtein];
  if (formatInfo.keyword) queryParts.push(formatInfo.keyword);
  if (cuisineKey === "bbq")      queryParts.push("bbq");
  if (cuisineKey === "cajun")    queryParts.push("cajun");
  if (cuisineKey === "canadian") queryParts.push("canadian style");
  const query = queryParts.filter(Boolean).join(" ");

  // ── Step 1: searchRecipes(filters) ──────────────────────────────────────────
  log(
    `[v2] Spoonacular search called | query="${query}" cuisine="${spoonacularCuisine || "any"}" type="${formatInfo.type}" maxTime=${maxReadyTime} allergens="${intolerances || "none"}"`,
    "v2",
  );

  let searchResult;
  try {
    searchResult = await searchRecipes(query, {
      cuisine: spoonacularCuisine || undefined,
      type: formatInfo.type,
      maxReadyTime,
      intolerances: intolerances || undefined,
      diet,
      number: SEARCH_CANDIDATES,
      sort: "popularity",
    });
  } catch (err: any) {
    log(`[v2] Spoonacular search error: ${err.message}`, "v2");
    return null;
  }

  const results = searchResult?.results || [];
  log(`[v2] Recipe candidates returned: ${results.length}`, "v2");

  if (results.length === 0) {
    log("[v2] No candidates found — caller will use fallback", "v2");
    return null;
  }

  // ── Step 2: Select one candidate ────────────────────────────────────────────
  const selected = selectCandidate(results, chosenProtein);
  if (!selected) {
    log("[v2] No suitable candidate — caller will use fallback", "v2");
    return null;
  }

  log(`[v2] Selected recipe id=${selected.id}`, "v2");
  log(`[v2] Selected recipe title="${selected.title}"`, "v2");

  // ── Step 3: getRecipeDetails(recipeId) ───────────────────────────────────────
  //   Fetches full detail for the selected recipe ONLY — not for all candidates.
  let detail;
  try {
    detail = await getRecipeDetails(selected.id);
  } catch (err: any) {
    log(`[v2] getRecipeDetails failed for id=${selected.id}: ${err.message}`, "v2");
    return null;
  }

  // Verify the recipe has usable parsed steps
  const hasSteps = detail.analyzedInstructions?.[0]?.steps?.length > 0;
  if (!hasSteps) {
    log(`[v2] id=${selected.id} "${selected.title}" has no parsed steps — caller will use fallback`, "v2");
    return null;
  }

  // ── Step 4: Normalize to Firehall recipe shape ───────────────────────────────
  //   convertSpoonacularToGenerateResponse scales to crew size, maps macros,
  //   maps cuisines and cooking methods from Spoonacular metadata.
  //   It does NOT invent content or relabel meal types.
  const recipe = convertSpoonacularToGenerateResponse(detail, request, chosenProtein);

  // Inject rice only when the recipe genuinely requires it (e.g., stir fry, teriyaki)
  const riceResult = ensureRiceForRiceDishes(recipe, request.meal_format, request.crew_size, allergens);
  const finalRecipe = riceResult.recipe || recipe;

  log(`[v2] ✓ Normalized "${detail.title}" | protein=${chosenProtein} | ingredients=${finalRecipe.ingredients.length} | steps=${finalRecipe.steps.length} | source=spoonacular_v2`, "v2");

  return {
    recipe: finalRecipe,
    originalTitle: detail.title,
    protein: chosenProtein,
    source: "spoonacular_v2",
  };
}
