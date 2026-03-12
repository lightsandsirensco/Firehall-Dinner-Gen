/**
 * V2 Recipe Generation Engine
 *
 * Spoonacular is the sole authoritative recipe source.
 *
 * Guarantees:
 *  - Original Spoonacular title is NEVER changed by validation or label audit
 *  - Protein in returned recipe always matches the selected filter (two-layer audit)
 *  - Allergen-flagged recipes are rejected outright, not patched
 *  - Rice is only present when the recipe actually uses it
 *  - No meal_style relabeling — meal style is inferred from the real recipe content
 *  - All fields (title, ingredients, steps, macros, timing) come from Spoonacular
 */

import { log } from "./index";
import { searchRecipes, getRecipeById, type SpoonacularRecipeDetail } from "./spoonacular";
import { inferActualProtein, proteinMatchesFilter, convertSpoonacularToGenerateResponse } from "./spoonacular-converter";
import { scanRecipeForAllergens } from "./allergens";
import { ensureRiceForRiceDishes } from "./carb-rules";
import type { GenerateRequest, GenerateResponse } from "../shared/schema";

// ─── Filter Mapping Tables ──────────────────────────────────────────────────

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
  burger: { type: "main course", keyword: "burger" },
  tacos: { type: "main course", keyword: "tacos" },
  wrap: { type: "main course", keyword: "wrap" },
  bowl: { type: "main course", keyword: "bowl" },
  pasta: { type: "main course", keyword: "pasta" },
  salad: { type: "salad", keyword: "" },
  sheet_pan: { type: "main course", keyword: "sheet pan" },
  skillet: { type: "main course", keyword: "skillet" },
  stir_fry: { type: "main course", keyword: "stir fry" },
  soup_chili: { type: "soup", keyword: "" },
  breakfast: { type: "breakfast", keyword: "" },
  loaded_fries: { type: "main course", keyword: "loaded" },
  sandwich: { type: "main course", keyword: "sandwich" },
  casserole: { type: "main course", keyword: "casserole" },
  plated_main: { type: "main course", keyword: "" },
  random: { type: "main course", keyword: "" },
};

const ALLERGEN_INTOLERANCE_MAP: Record<string, string> = {
  gluten: "gluten",
  wheat: "wheat",
  dairy: "dairy",
  eggs: "egg",
  peanuts: "peanut",
  shellfish: "shellfish",
  soy: "soy",
  "tree-nuts": "tree nut",
  sesame: "sesame",
  fish: "seafood",
  seafood: "seafood",
  sulphites: "sulfite",
};

const TIME_MAP: Record<string, number> = {
  "15-25": 25,
  "20-30": 30,
  "25-40": 40,
  "30-45": 45,
  "45-60": 60,
  "60-90": 90,
};

// ─── Result Type ─────────────────────────────────────────────────────────────

export interface V2GenerateResult {
  recipe: GenerateResponse;
  originalTitle: string;
  protein: string;
  source: "spoonacular_v2";
}

// ─── Protein Selection ───────────────────────────────────────────────────────

function selectProtein(proteins: string[], healthiness: string): string {
  if (proteins.length === 1) return proteins[0];

  const LEAN_WEIGHTS: Record<string, number> = {
    chicken: 4, turkey: 3, fish: 3, seafood: 3, vegetarian: 2, beef: 1, pork: 1,
  };
  const COMFORT_WEIGHTS: Record<string, number> = {
    beef: 4, pork: 3, chicken: 2, turkey: 2, seafood: 1, fish: 1, vegetarian: 1,
  };

  const weights = healthiness === "lean" ? LEAN_WEIGHTS
    : healthiness === "comfort" ? COMFORT_WEIGHTS
    : {};

  const pool: string[] = [];
  for (const p of proteins) {
    const w = weights[p] ?? 2;
    for (let i = 0; i < w; i++) pool.push(p);
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Allergen Intolerances ───────────────────────────────────────────────────

function buildIntolerances(allergens: string[]): string {
  return allergens
    .map((a) => ALLERGEN_INTOLERANCE_MAP[a.toLowerCase()] || "")
    .filter(Boolean)
    .join(",");
}

// ─── Candidate Validation ────────────────────────────────────────────────────

interface ValidatedCandidate {
  detail: SpoonacularRecipeDetail;
  reason?: string;
}

async function validateCandidate(
  candidate: { id: number; title: string },
  chosenProtein: string,
  allergens: string[],
): Promise<ValidatedCandidate | null> {
  // Step 1: fetch full recipe detail
  let detail: SpoonacularRecipeDetail;
  try {
    detail = await getRecipeById(candidate.id, true);
  } catch (err: any) {
    log(`[v2] id=${candidate.id} fetch error: ${err.message}`, "v2");
    return null;
  }

  // Step 2: require parsed steps
  const hasSteps =
    detail.analyzedInstructions?.[0]?.steps?.length > 0;
  if (!hasSteps) {
    log(`[v2] id=${candidate.id} "${candidate.title}" — no parsed steps, skip`, "v2");
    return null;
  }

  // Step 3: full protein audit using title + all ingredient names
  const ingredientNames = detail.extendedIngredients.map((i) => i.name);
  const inferred = inferActualProtein(detail.title, ingredientNames);
  const proteinOk = proteinMatchesFilter(inferred, chosenProtein);

  if (proteinOk) {
    log(`[proteinAudit] selected=${chosenProtein} inferred=${inferred} result=accepted title="${detail.title}"`, "v2");
  } else {
    log(`[proteinAudit] selected=${chosenProtein} inferred=${inferred} result=rejected title="${detail.title}"`, "v2");
    return null;
  }

  // Step 4: allergen scan — reject if contaminated (do not patch)
  if (allergens.length > 0) {
    const scanIngredients = ingredientNames.map((n) => ({ item: n, amount: "", notes: "" }));
    const scanSteps = (detail.analyzedInstructions?.[0]?.steps || []).map((s) => ({
      heading: "",
      body: s.step,
    }));
    const scan = scanRecipeForAllergens(scanIngredients, scanSteps, detail.title, allergens);
    if (scan.violations.length > 0) {
      log(`[v2] id=${candidate.id} allergen violations [${scan.violations.join(", ")}] — rejected`, "v2");
      return null;
    }
  }

  return { detail };
}

// ─── Search Pass ─────────────────────────────────────────────────────────────

interface SearchPassParams {
  query: string;
  cuisine?: string;
  type?: string;
  maxReadyTime?: number;
  intolerances?: string;
  diet?: string;
  number: number;
}

async function runSearchPass(
  params: SearchPassParams,
  chosenProtein: string,
  allergens: string[],
  passLabel: string,
): Promise<V2GenerateResult | null> {
  log(`[v2] ${passLabel} — query="${params.query}" cuisine="${params.cuisine || "any"}" type="${params.type || "any"}" maxTime=${params.maxReadyTime ?? "∞"} intolerances="${params.intolerances || "none"}" diet="${params.diet || "none"}"`, "v2");

  let searchResult;
  try {
    searchResult = await searchRecipes(params.query, {
      cuisine: params.cuisine,
      type: params.type,
      maxReadyTime: params.maxReadyTime,
      intolerances: params.intolerances,
      diet: params.diet,
      number: params.number,
      sort: "popularity",
    });
  } catch (err: any) {
    log(`[v2] ${passLabel} search error: ${err.message}`, "v2");
    return null;
  }

  const results = searchResult?.results || [];
  if (results.length === 0) {
    log(`[v2] ${passLabel} — 0 results`, "v2");
    return null;
  }

  // Title-level protein pre-filter (no API call)
  const titlePassing = results.filter((r) => {
    const quick = inferActualProtein(r.title, []);
    // "unknown" means no clear protein word in title → let full audit decide
    return quick === "unknown" || proteinMatchesFilter(quick, chosenProtein);
  });

  const candidates = titlePassing.length > 0 ? titlePassing : results;
  log(`[v2] ${passLabel} — ${results.length} results, ${candidates.length} pass title check`, "v2");

  // Shuffle top-6 for variety on repeated requests
  const pool = candidates.slice(0, 6);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  for (const candidate of pool) {
    log(`[v2] ${passLabel} — trying id=${candidate.id} "${candidate.title}"`, "v2");
    const validated = await validateCandidate(candidate, chosenProtein, allergens);
    if (!validated) continue;

    // Convert to GenerateResponse (request is not available here; caller provides it)
    return { _detail: validated.detail, _protein: chosenProtein } as any;
  }

  log(`[v2] ${passLabel} — no valid candidate found`, "v2");
  return null;
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

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

  const diet =
    request.proteins.length === 1 && request.proteins[0] === "vegetarian"
      ? "vegetarian"
      : undefined;

  // Build base query: protein keyword + optional cuisine/format extras
  const queryParts = [chosenProtein];
  if (formatInfo.keyword) queryParts.push(formatInfo.keyword);
  if (cuisineKey === "bbq") queryParts.push("bbq");
  if (cuisineKey === "canadian") queryParts.push("canadian style");
  if (cuisineKey === "cajun") queryParts.push("cajun");
  const query = queryParts.filter(Boolean).join(" ");

  // Helper: convert raw search result (with detail) to full V2GenerateResult
  async function attemptPass(passParams: SearchPassParams, label: string): Promise<V2GenerateResult | null> {
    const raw = await runSearchPass(passParams, chosenProtein, allergens, label);
    if (!raw) return null;

    const detail: SpoonacularRecipeDetail = (raw as any)._detail;
    const protein: string = (raw as any)._protein;

    // Convert to GenerateResponse (scales to crew_size, infers style/tags etc.)
    const recipe = convertSpoonacularToGenerateResponse(detail, request, protein);

    // Apply rice injection only when the recipe actually needs it
    const riceResult = ensureRiceForRiceDishes(recipe, request.meal_format, request.crew_size, allergens);
    const finalRecipe = riceResult.recipe || recipe;

    log(`[v2] ✓ Selected: "${detail.title}" | protein=${protein} | ings=${finalRecipe.ingredients.length} | steps=${finalRecipe.steps.length} | source=spoonacular_v2`, "v2");

    return {
      recipe: finalRecipe,
      originalTitle: detail.title,
      protein,
      source: "spoonacular_v2",
    };
  }

  // ── Pass 1: Full constraints (protein + cuisine + format + time + allergens) ──
  const pass1 = await attemptPass({
    query,
    cuisine: spoonacularCuisine || undefined,
    type: formatInfo.type,
    maxReadyTime,
    intolerances: intolerances || undefined,
    diet,
    number: 10,
  }, "pass1[full]");
  if (pass1) return pass1;

  // ── Pass 2: Relax format constraint (keep cuisine + time + allergens) ────────
  log("[v2] Pass 1 failed — relaxing format constraint for pass 2", "v2");
  const pass2 = await attemptPass({
    query: chosenProtein + (cuisineKey === "bbq" ? " bbq" : cuisineKey === "cajun" ? " cajun" : ""),
    cuisine: spoonacularCuisine || undefined,
    maxReadyTime,
    intolerances: intolerances || undefined,
    diet,
    number: 10,
  }, "pass2[no-format]");
  if (pass2) return pass2;

  // ── Pass 3: Relax time constraint (keep allergens + diet strict) ─────────────
  log("[v2] Pass 2 failed — relaxing time constraint for pass 3", "v2");
  const pass3 = await attemptPass({
    query: chosenProtein,
    cuisine: spoonacularCuisine || undefined,
    intolerances: intolerances || undefined,
    diet,
    number: 10,
  }, "pass3[no-time]");
  if (pass3) return pass3;

  // ── Pass 4: Drop cuisine constraint (keep allergens + protein) ───────────────
  if (spoonacularCuisine) {
    log("[v2] Pass 3 failed — dropping cuisine constraint for pass 4", "v2");
    const pass4 = await attemptPass({
      query: chosenProtein,
      intolerances: intolerances || undefined,
      diet,
      number: 10,
    }, "pass4[no-cuisine]");
    if (pass4) return pass4;
  }

  log(`[v2] All passes exhausted for protein=${chosenProtein} — returning null (caller will use fallback)`, "v2");
  return null;
}
