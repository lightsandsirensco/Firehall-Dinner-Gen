/**
 * V2 Recipe Generation Engine
 *
 * Generation flow:
 *   1. buildSearchParams(request)  — map all Firehall filters → Spoonacular params
 *   2. searchRecipes(params)       — search Spoonacular for 5 candidates (cached 1h)
 *   3. Select one candidate        — title-based protein pre-filter → shuffle → pick first
 *   4. getRecipeDetails(id)        — fetch full detail for that ONE candidate (cached 1h)
 *   5. Normalize                   — convert Spoonacular shape → Firehall recipe shape
 *   6. Polish                      — gpt-4o-mini lightly fixes title wording + writes description (cached 1h, 2s timeout)
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
 *   - One getRecipeDetails call per request (selected candidate only)
 *   - No default rice / no forced carbs
 */

import { log } from "./index";
import { searchRecipes, getRecipeDetails, type SpoonacularSearchResult } from "./spoonacular";
import { inferActualProtein, proteinMatchesFilter, convertSpoonacularToGenerateResponse } from "./spoonacular-converter";
import { validateV2Candidate } from "./v2-validator";
import { ensureRiceForRiceDishes } from "./carb-rules";
import { polishRecipeCopy } from "./recipe-polish";
import type { GenerateRequest, GenerateResponse } from "../shared/schema";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEARCH_CANDIDATES = 5;

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectProtein(proteins: string[], healthiness: string): string {
  if (proteins.length === 1) return proteins[0];

  const LEAN_WEIGHTS:    Record<string, number> = { chicken: 4, turkey: 3, fish: 3, seafood: 3, vegetarian: 2, beef: 1, pork: 1 };
  const COMFORT_WEIGHTS: Record<string, number> = { beef: 4, pork: 3, chicken: 2, turkey: 2, seafood: 1, fish: 1, vegetarian: 1 };
  const weights = healthiness === "lean" ? LEAN_WEIGHTS : healthiness === "comfort" ? COMFORT_WEIGHTS : {};

  const pool: string[] = [];
  for (const p of proteins) {
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

  // ── Log selected filters ─────────────────────────────────────────────────
  log(
    `[v2] Selected filters | protein="${chosenProtein}" cuisine="${cuisineKey}" format="${formatKey}" time="${request.time_available}" crew=${crewSize} allergens=[${allergens.join(", ") || "none"}] pantry=[${(request.ingredients_on_hand || []).slice(0, 5).join(", ") || "none"}]`,
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
  // Only apply competing-protein exclusions when a single protein is selected
  if (request.proteins.length === 1) {
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
    sort:              "popularity",
  };

  // ── Log mapped Spoonacular parameters ────────────────────────────────────
  log(
    `[v2] Mapped Spoonacular params | query="${params.query}" cuisine="${params.cuisine || "any"}" type="${params.type}" maxReadyTime=${params.maxReadyTime} intolerances="${params.intolerances || "none"}" excludeIngredients="${params.excludeIngredients || "none"}" includeIngredients="${params.includeIngredients || "none"}" diet="${params.diet || "none"}" minServings=${params.minServings}`,
    "v2",
  );

  return params;
}

// ─── Step 3 / Step 4 ──────────────────────────────────────────────────────────
//
// Candidate selection + strict validation live in the main runV2Generate flow below.
// The old single-pick selectCandidate() and light formatMatchesRequest() are replaced
// by validateV2Candidate() (v2-validator.ts) which iterates every candidate.

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function runV2Generate(
  request: GenerateRequest,
): Promise<V2GenerateResult | null> {
  if (!process.env.SPOONACULAR_API_KEY) {
    log("[v2] SPOONACULAR_API_KEY not set — V2 engine unavailable", "v2");
    return null;
  }

  const chosenProtein = selectProtein(request.proteins, request.healthiness_preference);
  const allergens = request.allergens_to_avoid || [];

  // ── Step 1: Build search params ──────────────────────────────────────────
  const params = buildSearchParams(request, chosenProtein);

  // ── Step 2: searchRecipes(filters) ──────────────────────────────────────
  log(`[v2] Spoonacular search called | query="${params.query}" cuisine="${params.cuisine || "any"}" type="${params.type}" maxTime=${params.maxReadyTime} allergens="${params.intolerances || "none"}"`, "v2");

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
  const proteinMatched = results.filter((c) => {
    const quick = inferActualProtein(c.title, []);
    return quick === "unknown" || proteinMatchesFilter(quick, chosenProtein);
  });
  const pool = proteinMatched.length > 0 ? proteinMatched : results;
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);

  log(`[v2] Candidate pool: ${shuffled.length} after title-level filter (from ${results.length} total)`, "v2");

  // ── Step 4: Select one candidate — fetch its detail — validate once ──────
  //   We pick a single candidate (first after protein-title-filter + shuffle).
  //   getRecipeDetails is called ONLY for that one recipe — one API call max.
  //   If validation fails we go straight to fallback without retrying others.
  //   (Subsequent requests for the same candidate ID hit the 1-hour cache.)
  const formatInfo = FORMAT_MAP[request.meal_format || "random"] ?? FORMAT_MAP.random;

  const selected = shuffled[0];
  log(`[v2] Selected candidate: id=${selected.id} title="${selected.title}" (pool size=${shuffled.length})`, "v2");

  let detail;
  try {
    detail = await getRecipeDetails(selected.id);
  } catch (err: any) {
    log(`[v2] getRecipeDetails failed id=${selected.id}: ${err.message} — caller will use fallback`, "v2");
    return null;
  }

  // ── Strict Validation ────────────────────────────────────────────────────
  const validation = validateV2Candidate(
    detail,
    chosenProtein,
    request.meal_format || "random",
    allergens,
  );

  if (!validation.accepted) {
    log(`[v2] Candidate REJECTED (${validation.rejectionReason}) — caller will use fallback`, "v2");
    return null;
  }

  // ── Normalize to Firehall shape ──────────────────────────────────────────
  const recipe = convertSpoonacularToGenerateResponse(detail, request, chosenProtein);

  let withCarbs = recipe;
  if (!formatInfo.carb_free) {
    const riceResult = ensureRiceForRiceDishes(recipe, request.meal_format, request.crew_size, allergens);
    withCarbs = riceResult.recipe || recipe;
  }

  log(`[v2] ✓ Accepted "${detail.title}" | protein=${validation.inferredProtein} | ingredients=${withCarbs.ingredients?.length} | steps=${withCarbs.steps?.length} | source=spoonacular_v2`, "v2");

  // ── Step 5: Polish + step improvement ────────────────────────────────────
  //   Single gpt-4o-mini call: polishes title/description AND rewrites steps to
  //   be beginner-friendly (heat level, time range, doneness cues, safe temps).
  //   Hard 5-second timeout; falls back to original title/description/steps.
  //   Results cached per Spoonacular ID for 1 hour (zero repeat AI calls).
  const cuisine = detail.cuisines?.[0] || withCarbs.tags?.cuisine || "any";
  const keyIngredients = (withCarbs.ingredients || []).slice(0, 5).map((i) => i.name);
  const polish = await polishRecipeCopy(
    detail.id,
    detail.title,
    chosenProtein,
    cuisine,
    withCarbs.timing?.total_minutes ?? 0,
    request.crew_size,
    keyIngredients,
    withCarbs.steps ?? [],
  );

  const finalRecipe: GenerateResponse = {
    ...withCarbs,
    title: polish.title,
    why_it_fits_tonight: polish.why_it_fits_tonight,
    steps: polish.steps,
  };
  const acceptedTitle = polish.title;

  return {
    recipe: finalRecipe,
    originalTitle: acceptedTitle,
    protein: chosenProtein,
    source: "spoonacular_v2",
  };
}
