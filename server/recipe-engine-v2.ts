/**
 * V2 Recipe Generation Engine
 *
 * Generation flow:
 *   1. buildSearchParams(request)  — map all Firehall filters → Spoonacular params
 *   2. searchRecipes(params)       — search Spoonacular for 5 candidates (cached 1h)
 *   3. Order candidates            — protein title filter → deprioritize recent session IDs → shuffle
 *   4. getRecipeDetails + validate — try up to 5 candidates; stop on first pass (cached 1h)
 *   5. Normalize                   — convert Spoonacular shape → Firehall recipe shape
 *   6. Polish                      — copy-only polish with safety guard (cached 1h, 6s timeout)
 *
 * Protein is a hard constraint enforced at three levels:
 *   - query keyword (e.g., "chicken skillet")
 *   - includeIngredients (forces protein to appear in recipe)
 *   - excludeIngredients for competing proteins (keeps cross-contamination out)
 *
 * Spoonacular is the source of truth for:
 *   title, ingredients, instructions, servings, timing, image, source data
 *
 * Rules:
 *   - No recipe invention in this flow
 *   - No relabeling into different meal types
 *   - Up to 5 getRecipeDetails attempts only when earlier candidates fail validation
 *   - No default rice / no forced carbs
 */

import { log, logVerbose, clip } from "./logger";
import { searchRecipes, getRecipeDetails, type SpoonacularSearchResult } from "./spoonacular";
import { inferActualProtein, proteinMatchesFilter, convertSpoonacularToGenerateResponse } from "./spoonacular-converter";
import { validateV2Candidate } from "./v2-validator";
import { shouldTryNextCandidate } from "./meal-composition";
import { applyCrewPortionFloors, hallCleanupTip, hallProTips } from "./firehall-voice";
import { isWeakTitle, resolvePolishTitle } from "./meal-plate";
import { normalizeIngredientsUsed } from "../shared/generation-reliability.js";
import { polishRecipeCopy } from "./recipe-polish";
import { normalizeRecipeTags } from "@shared/recipe-tags.js";
import { getRecentSpoonacularIds, addRecentSpoonacularId } from "./cache-store";
import type { GenerateRequest, GenerateResponse } from "../shared/schema";
import type { RecipeSourceAttribution } from "../shared/canonical-recipe.js";
import { upsertCatalogFromV2 } from "./recipe-catalog.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEARCH_CANDIDATES = 8;

// ─── Filter Mapping Tables ────────────────────────────────────────────────────

/**
 * Firehall cuisine_style → Spoonacular cuisine param.
 * Styles with no direct Spoonacular equivalent use "" (omitted from search)
 * and are handled via query keywords instead.
 */
const CUISINE_MAP: Record<string, string> = {
  mediterranean: "mediterranean",
  mexican:       "mexican",
  italian:       "italian",
  asian:         "chinese",
  korean:        "korean",
  thai:          "thai",
  indian:        "indian",
  middle_eastern:"middle eastern",
  bbq:           "",   // handled via query keyword "bbq"
  cajun:         "cajun",
  canadian:      "",   // handled via query keyword "canadian style"
  any:           "",
};

/**
 * Firehall meal_format → Spoonacular type + query keyword.
 * keyword is appended to the protein query to direct Spoonacular toward
 * the right structure. type narrows the Spoonacular dish category.
 * carb_free: true means no starchy carb should be assumed.
 */
const FORMAT_MAP: Record<string, { type: string; keyword: string; carb_free?: boolean }> = {
  burger:       { type: "main course", keyword: "burger",    carb_free: false },
  tacos:        { type: "main course", keyword: "tacos",     carb_free: false },
  wrap:         { type: "main course", keyword: "wrap",      carb_free: false },
  bowl:         { type: "main course", keyword: "bowl",      carb_free: false },
  pasta:        { type: "main course", keyword: "pasta",     carb_free: false },
  salad:        { type: "salad",       keyword: "",          carb_free: true  },
  sheet_pan:    { type: "main course", keyword: "sheet pan", carb_free: true  },
  skillet:      { type: "main course", keyword: "skillet",   carb_free: true  },
  stir_fry:     { type: "main course", keyword: "stir fry",  carb_free: false },
  soup_chili:   { type: "soup",        keyword: "",          carb_free: true  },
  stew:         { type: "soup",        keyword: "stew",      carb_free: true  },
  grill:        { type: "main course", keyword: "grilled",   carb_free: true  },
  one_pot:      { type: "main course", keyword: "one pot",   carb_free: true  },
  breakfast:    { type: "breakfast",   keyword: "",          carb_free: false },
  loaded_fries: { type: "main course", keyword: "loaded",    carb_free: false },
  sandwich:     { type: "main course", keyword: "sandwich",  carb_free: false },
  casserole:    { type: "main course", keyword: "casserole", carb_free: false },
  plated_main:  { type: "main course", keyword: "",          carb_free: true  },
  random:       { type: "main course", keyword: "",          carb_free: false },
};

/**
 * Allergen → Spoonacular intolerance param value.
 * These are passed as the `intolerances` search param.
 */
const ALLERGEN_INTOLERANCE_MAP: Record<string, string> = {
  gluten:      "gluten",
  wheat:       "wheat",
  dairy:       "dairy",
  eggs:        "egg",
  peanuts:     "peanut",
  shellfish:   "shellfish",
  soy:         "soy",
  "tree-nuts": "tree nut",
  sesame:      "sesame",
  fish:        "seafood",
  seafood:     "seafood",
  sulphites:   "sulfite",
};

/**
 * Allergen → specific ingredients to exclude.
 * Supplements intolerances with explicit excludeIngredients for extra safety.
 */
const ALLERGEN_EXCLUDE_MAP: Record<string, string[]> = {
  gluten:      ["wheat flour", "breadcrumbs", "soy sauce"],
  wheat:       ["wheat flour", "breadcrumbs"],
  dairy:       ["milk", "cheese", "butter", "cream", "yogurt"],
  eggs:        ["eggs", "egg"],
  peanuts:     ["peanuts", "peanut butter", "peanut oil"],
  shellfish:   ["shrimp", "lobster", "crab", "scallops", "clams", "oysters"],
  soy:         ["soy sauce", "tofu", "edamame", "miso"],
  "tree-nuts": ["almonds", "cashews", "walnuts", "pecans", "pistachios"],
  sesame:      ["sesame seeds", "sesame oil", "tahini"],
  fish:        ["tuna", "salmon", "cod", "tilapia", "anchovies", "sardines"],
};

/**
 * Protein → competing protein ingredient keywords to exclude.
 * Prevents cross-contamination (e.g. chicken-only recipes should not contain beef).
 * Only applied when a single protein is selected.
 */
const PROTEIN_EXCLUDE_MAP: Record<string, string[]> = {
  chicken:     ["beef", "ground beef", "steak", "pork", "bacon", "ham", "sausage", "shrimp", "salmon", "tuna"],
  beef:        ["chicken", "pork", "bacon", "ham", "shrimp", "salmon", "tuna"],
  pork:        ["chicken", "beef", "ground beef", "steak", "shrimp", "salmon", "tuna"],
  turkey:      ["chicken", "beef", "ground beef", "steak", "pork", "bacon", "ham", "shrimp", "salmon"],
  fish:        ["chicken", "beef", "ground beef", "pork", "bacon", "shrimp"],
  seafood:     ["chicken", "beef", "ground beef", "pork", "bacon"],
  vegetarian:  [],  // handled by diet=vegetarian
};

/**
 * Protein → Spoonacular includeIngredients keyword.
 * Forces the chosen protein to appear in the recipe.
 */
const PROTEIN_INCLUDE_MAP: Record<string, string> = {
  chicken:    "chicken",
  beef:       "beef",
  pork:       "pork",
  turkey:     "turkey",
  fish:       "fish",
  seafood:    "shrimp",   // broadest seafood keyword that Spoonacular indexes
  vegetarian: "",
};

/**
 * Time range → maxReadyTime in minutes.
 */
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
  spoonacularId: number;
  catalogId?: string;
  recipeSource?: RecipeSourceAttribution;
}

export interface V2GenerateOptions {
  /** `${ipHash}:${sessionId}` — used to deprioritize recently served Spoonacular IDs */
  sessionKey?: string;
  /** Looser validation (format/cuisine/plate completeness) — pre–template-fallback tier only */
  relaxed?: boolean;
}

// ─── Spoonacular Params Type ──────────────────────────────────────────────────

interface SpoonacularSearchParams {
  query: string;
  cuisine?: string;
  type: string;
  maxReadyTime: number;
  intolerances?: string;
  excludeIngredients?: string;
  includeIngredients?: string;
  diet?: string;
  minServings?: number;
  number: number;
  sort: string;
  offset: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_PROTEINS = ["chicken", "beef", "pork", "turkey", "seafood", "vegetarian"];

/** Resolve "any" to a single concrete protein using health-based weighting. */
function resolveProtein(protein: string, healthiness: string): string {
  if (protein !== "any") return protein;

  const LEAN_WEIGHTS:    Record<string, number> = { chicken: 4, turkey: 3, seafood: 3, vegetarian: 2, beef: 1, pork: 1 };
  const COMFORT_WEIGHTS: Record<string, number> = { beef: 4, pork: 3, chicken: 2, turkey: 2, seafood: 1, vegetarian: 1 };
  const weights = healthiness === "lean" ? LEAN_WEIGHTS : healthiness === "comfort" ? COMFORT_WEIGHTS : {};

  const pool: string[] = [];
  for (const p of ALL_PROTEINS) {
    const w = weights[p] ?? 2;
    for (let i = 0; i < w; i++) pool.push(p);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Step 1: Build Search Params ─────────────────────────────────────────────
//
// Maps all Firehall Meals filters into Spoonacular API parameters.
// Logs both the raw filter selection and the resulting mapped params.

function buildSearchParams(request: GenerateRequest, chosenProtein: string): SpoonacularSearchParams {
  const allergens = request.allergens_to_avoid || [];
  const cuisineKey = request.cuisine_style || "any";
  const formatKey = request.meal_format || "random";
  const formatInfo = FORMAT_MAP[formatKey] ?? FORMAT_MAP.random;
  const crewSize = request.crew_size || 4;

  logVerbose(
    `[v2] filters protein=${chosenProtein} cuisine=${cuisineKey} format=${formatKey} time=${request.time_available} crew=${crewSize} allergens=${allergens.length}`,
    "v2",
  );

  // ── Query: protein keyword + format keyword + cuisine inline keyword ──────
  const queryParts: string[] = [chosenProtein];
  if (formatInfo.keyword) queryParts.push(formatInfo.keyword);
  if (cuisineKey === "bbq")      queryParts.push("bbq");
  if (cuisineKey === "cajun")    queryParts.push("cajun");
  if (cuisineKey === "canadian") queryParts.push("canadian style");
  const query = queryParts.filter(Boolean).join(" ");

  // ── Cuisine ───────────────────────────────────────────────────────────────
  const spoonacularCuisine = CUISINE_MAP[cuisineKey] ?? "";

  // ── Allergen intolerances ─────────────────────────────────────────────────
  const intolerances = allergens
    .map((a) => ALLERGEN_INTOLERANCE_MAP[a.toLowerCase()] || "")
    .filter(Boolean)
    .join(",");

  // ── Exclude ingredients: allergens + competing proteins ───────────────────
  //   Allergen exclusions supplement intolerances for extra safety.
  //   Competing protein exclusions enforce the hard protein constraint.
  const excludeSet = new Set<string>();
  for (const allergen of allergens) {
    const extras = ALLERGEN_EXCLUDE_MAP[allergen.toLowerCase()] || [];
    for (const e of extras) excludeSet.add(e);
  }
  // Only apply competing-protein exclusions when a specific (non-"any") protein was requested
  if (request.protein !== "any") {
    const competingExcludes = PROTEIN_EXCLUDE_MAP[chosenProtein] || [];
    for (const e of competingExcludes) excludeSet.add(e);
  }
  const excludeIngredients = [...excludeSet].join(",");

  // ── Include ingredients: protein enforcement + pantry items ──────────────
  //   includeIngredients forces the chosen protein to appear in results.
  //   Pantry items are added when the user has specified what's on hand.
  const includeSet = new Set<string>();
  const proteinInclude = PROTEIN_INCLUDE_MAP[chosenProtein] || "";
  if (proteinInclude) includeSet.add(proteinInclude);

  const pantryItems = request.ingredients_on_hand || [];
  // Add up to 3 pantry items as include hints (more than 3 makes results too narrow)
  for (const item of pantryItems.slice(0, 3)) {
    if (item.trim()) includeSet.add(item.trim());
  }
  const includeIngredients = [...includeSet].join(",");

  // ── Diet ──────────────────────────────────────────────────────────────────
  //   Vegetarian diet param is set whenever vegetarian is the chosen (or only) protein.
  const diet = chosenProtein === "vegetarian" ? "vegetarian" : undefined;

  // ── Time ──────────────────────────────────────────────────────────────────
  const maxReadyTime = TIME_MAP[request.time_available] || 60;

  // ── Servings: prefer recipes that need less scaling ───────────────────────
  //   We always scale locally, so minServings stays low.
  //   For larger crews, nudge toward recipes with more base servings.
  const minServings = crewSize >= 8 ? 4 : 2;

  const params: SpoonacularSearchParams = {
    query,
    cuisine:           spoonacularCuisine || undefined,
    type:              formatInfo.type,
    maxReadyTime,
    intolerances:      intolerances || undefined,
    excludeIngredients:excludeIngredients || undefined,
    includeIngredients:includeIngredients || undefined,
    diet,
    minServings,
    number:            SEARCH_CANDIDATES,
    sort:              "random",
    offset:            Math.floor(Math.random() * 24),
  };

  logVerbose(
    `[v2] spoonacular-params query="${clip(params.query || "", 40)}" cuisine=${params.cuisine || "any"} type=${params.type} maxTime=${params.maxReadyTime}`,
    "v2",
  );

  return params;
}

// ─── Candidate ordering ───────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  return arr.slice().sort(() => Math.random() - 0.5);
}

/** Fresh session IDs first, then shuffled repeats — reduces duplicate meals without extra API calls. */
function orderCandidatePool(
  pool: SpoonacularSearchResult[],
  recentIds: Set<number>,
): SpoonacularSearchResult[] {
  const fresh: SpoonacularSearchResult[] = [];
  const repeat: SpoonacularSearchResult[] = [];
  for (const c of pool) {
    if (recentIds.has(c.id)) repeat.push(c);
    else fresh.push(c);
  }
  return [...shuffle(fresh), ...shuffle(repeat)];
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function runV2Generate(
  request: GenerateRequest,
  options?: V2GenerateOptions,
): Promise<V2GenerateResult | null> {
  if (!process.env.SPOONACULAR_API_KEY) {
    log("[v2] SPOONACULAR_API_KEY not set — V2 engine unavailable", "v2");
    return null;
  }

  const chosenProtein = resolveProtein(request.protein, request.healthiness_preference);
  const allergens = request.allergens_to_avoid || [];
  const cuisineKey = request.cuisine_style || "any";

  // ── Step 1: Build search params ──────────────────────────────────────────
  const params = buildSearchParams(request, chosenProtein);

  // ── Step 2: searchRecipes(filters) ──────────────────────────────────────
  log(
    `[v2] search query="${clip(params.query, 50)}" cuisine=${params.cuisine || "any"} maxTime=${params.maxReadyTime}`,
    "v2",
  );

  let searchResult;
  try {
    searchResult = await searchRecipes(params.query, {
      cuisine:            params.cuisine,
      type:               params.type,
      maxReadyTime:       params.maxReadyTime,
      intolerances:       params.intolerances,
      excludeIngredients: params.excludeIngredients,
      includeIngredients: params.includeIngredients,
      diet:               params.diet,
      minServings:        params.minServings,
      number:             params.number,
      sort:               params.sort,
      offset:             params.offset,
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

  // ── Step 3: Build ordered candidate pool ────────────────────────────────
  //   Title-based protein pre-filter (zero API cost) then shuffle for variety.
  //   Candidates that don't clearly match the protein go to the back of the pool.
  const formatInfo = FORMAT_MAP[request.meal_format || "random"] ?? FORMAT_MAP.random;
  const mealFormat = request.meal_format || "random";
  const relaxed = options?.relaxed === true;
  const validationFormat = relaxed ? "random" : mealFormat;
  const candidateLimit = relaxed ? Math.max(SEARCH_CANDIDATES, 12) : SEARCH_CANDIDATES;

  const proteinMatched = results.filter((c) => {
    const quick = inferActualProtein(c.title, []);
    return quick === "unknown" || proteinMatchesFilter(quick, chosenProtein);
  });
  const pool = proteinMatched.length > 0 ? proteinMatched : results;
  const recentIds = new Set(
    options?.sessionKey ? getRecentSpoonacularIds(options.sessionKey) : [],
  );
  const ordered = orderCandidatePool(pool, recentIds).slice(0, candidateLimit);

  log(
    `[v2] Candidate pool: ${ordered.length} ordered (${recentIds.size} recent IDs deprioritized, from ${results.length} search results)${relaxed ? " [relaxed]" : ""}`,
    "v2",
  );
  const failures: Array<{ id: number; title: string; reason: string }> = [];

  // ── Step 4: Try candidates sequentially — stop on first valid (avg 1 detail call) ──
  for (let i = 0; i < ordered.length; i++) {
    const candidate = ordered[i];
    logVerbose(`[v2] try candidate ${i + 1}/${ordered.length} id=${candidate.id}`, "v2");

    let detail;
    try {
      detail = await getRecipeDetails(candidate.id);
    } catch (err: any) {
      const reason = `detail-fetch:${err.message}`;
      failures.push({ id: candidate.id, title: candidate.title, reason });
      log(`[v2] Candidate ${i + 1} skipped — ${reason}`, "v2");
      continue;
    }

    const validation = validateV2Candidate(
      detail,
      chosenProtein,
      validationFormat,
      allergens,
      relaxed ? "any" : cuisineKey,
      { candidateIndex: i, spoonacularId: detail.id },
    );

    if (!validation.accepted) {
      failures.push({
        id: detail.id,
        title: detail.title,
        reason: validation.rejectionReason || "unknown",
      });
      continue;
    }

    // ── Normalize (Spoonacular = source of truth for ingredients/macros/steps) ──
    const recipe = convertSpoonacularToGenerateResponse(detail, request, chosenProtein);

    if (!relaxed && shouldTryNextCandidate(recipe, i, ordered.length, mealFormat)) {
      failures.push({
        id: detail.id,
        title: detail.title,
        reason: "thin-plate:missing-starch-or-veg",
      });
      log(`[v2] Candidate ${i + 1} skipped — incomplete plate (trying next)`, "v2");
      continue;
    }

    const cuisine = detail.cuisines?.[0] || recipe.tags?.cuisine || cuisineKey || "any";
    const spoonacularTitle = detail.title;
    const keyIngredients = (recipe.ingredients || []).slice(0, 12).map((ing) => ing.item);

    const largeCrew = (request.crew_size ?? 4) >= 10;
    let polishedTitle = spoonacularTitle;
    let polishedWhy = recipe.why_it_fits_tonight || "";

    if (!largeCrew) {
      const polish = await polishRecipeCopy(
        detail.id,
        spoonacularTitle,
        chosenProtein,
        cuisine,
        recipe.timing?.total_minutes ?? 0,
        request.crew_size,
        keyIngredients,
        recipe.steps ?? [],
        request.healthiness_preference || "balanced",
      );
      polishedTitle = resolvePolishTitle(polish.title, recipe.title, spoonacularTitle);
      polishedWhy = polish.why_it_fits_tonight;
    }

    let finalRecipe: GenerateResponse = normalizeIngredientsUsed({
      ...recipe,
      title: polishedTitle,
      why_it_fits_tonight: polishedWhy,
      steps: recipe.steps,
      ingredients: applyCrewPortionFloors(recipe.ingredients || [], request.crew_size),
      cleanup_tip: hallCleanupTip(),
      pro_tips: hallProTips(request.crew_size, detail.servings || 4),
      tags: normalizeRecipeTags(recipe.tags, { cuisine }),
    });

    if (isWeakTitle(finalRecipe.title)) {
      finalRecipe.title = spoonacularTitle;
    }

    const { isRoboticTitle, suggestHumanMealTitle } = await import("../shared/generation-reliability.js");
    if (isRoboticTitle(finalRecipe.title)) {
      finalRecipe.title = suggestHumanMealTitle({
        protein: chosenProtein,
        mealFormat: validationFormat,
        fallbackTitle: spoonacularTitle,
        ingredients: finalRecipe.ingredients,
        cuisine,
      });
    }

    const { runRecipeQualityGate, applyQualityTitleFix } = await import(
      "../shared/recipe-quality-gate.js"
    );
    const { detectMealIdentity } = await import("../shared/meal-semantics.js");
    let q = runRecipeQualityGate(finalRecipe, {
      mealFormat: validationFormat,
      identity: detectMealIdentity(finalRecipe.title, validationFormat),
      protein: chosenProtein,
      crewSize: request.crew_size,
      importedSource: true,
    });
    if (!q.pass) {
      const fixed = applyQualityTitleFix(finalRecipe, validationFormat);
      q = runRecipeQualityGate(fixed, {
        mealFormat: validationFormat,
        identity: detectMealIdentity(fixed.title, validationFormat),
        protein: chosenProtein,
        crewSize: request.crew_size,
        importedSource: true,
      });
      if (
        !q.pass &&
        q.issues.some((i) =>
          i === "taco_with_rice" ||
          i === "title_taco_no_tortilla" ||
          i === "robotic_title",
        )
      ) {
        failures.push({
          id: detail.id,
          title: detail.title,
          reason: `quality-gate:${q.issues.join(",")}`,
        });
        log(`[v2] Candidate ${i + 1} skipped — quality gate ${q.issues.join(",")}`, "v2");
        continue;
      }
      Object.assign(finalRecipe, fixed);
    }

    if (options?.sessionKey) {
      addRecentSpoonacularId(options.sessionKey, detail.id);
    }

    log(
      `[v2] ✓ Accepted candidate ${i + 1}/${ordered.length} id=${detail.id} "${spoonacularTitle}" | protein=${validation.inferredProtein} | tried=${i + 1} detail-call(s)`,
      "v2",
    );

    let catalogId: string | undefined;
    let recipeSource: RecipeSourceAttribution | undefined;
    try {
      const catalogRow = await upsertCatalogFromV2({
        request,
        recipe: finalRecipe,
        spoonacularId: detail.id,
        originalTitle: spoonacularTitle,
        chosenProtein,
        sourceUrl: detail.sourceUrl || "",
        image: detail.image,
        cuisines: detail.cuisines,
        readyInMinutes: detail.readyInMinutes,
        servings: detail.servings,
      });
      catalogId = catalogRow.catalogId;
      recipeSource = catalogRow.source;
    } catch (catalogErr: unknown) {
      const msg = catalogErr instanceof Error ? catalogErr.message : String(catalogErr);
      log(`[catalog] V2 write-through failed id=${detail.id}: ${msg}`, "catalog");
    }

    return {
      recipe: finalRecipe,
      originalTitle: spoonacularTitle,
      protein: chosenProtein,
      source: "spoonacular_v2",
      spoonacularId: detail.id,
      catalogId,
      recipeSource,
    };
  }

  log(
    `[v2] All ${ordered.length} Spoonacular candidates failed${relaxed ? " (relaxed)" : ""} — summary: ${failures.map((f) => `id=${f.id}(${f.reason})`).join("; ")}`,
    "v2",
  );
  return null;
}
