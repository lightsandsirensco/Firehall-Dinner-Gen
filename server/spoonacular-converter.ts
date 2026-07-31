import { log, logVerbose, clip } from "./logger";
import {
  applyCrewPortionFloors,
  buildHallWhyItFits,
  hallCleanupTip,
  hallProTips,
} from "./firehall-voice";
import { searchRecipes, getRecipeById, SpoonacularRecipeDetail } from "./spoonacular";
import { attachImportedRecipeMeta } from "../shared/imported-recipe.js";
import { publisherNameFromSourceUrl } from "../shared/canonical-recipe.js";
import type {
  GenerateRequest,
  GenerateResponse,
  IngredientItem,
  RecipeStep,
  ProteinSafetyItem,
  RecipeTiming,
  MacrosPerServing,
  RecipeTags,
} from "../shared/schema";

const CUISINE_MAP: Record<string, string> = {
  "mediterranean": "mediterranean",
  "mexican": "mexican",
  "italian": "italian",
  "asian": "chinese",
  "korean": "korean",
  "thai": "thai",
  "indian": "indian",
  "middle_eastern": "middle eastern",
  "bbq": "",
  "cajun": "cajun",
  "canadian": "",
  "any": "",
};

const FORMAT_MAP: Record<string, { type: string; keyword: string }> = {
  "burger": { type: "main course", keyword: "burger" },
  "tacos": { type: "main course", keyword: "tacos" },
  "wrap": { type: "main course", keyword: "wrap" },
  "bowl": { type: "main course", keyword: "bowl" },
  "pasta": { type: "main course", keyword: "pasta" },
  "salad": { type: "salad", keyword: "" },
  "sheet_pan": { type: "main course", keyword: "sheet pan baked" },
  "skillet": { type: "main course", keyword: "skillet" },
  "stir_fry": { type: "main course", keyword: "stir fry" },
  "soup_chili": { type: "soup", keyword: "" },
  "breakfast": { type: "breakfast", keyword: "" },
  "loaded_fries": { type: "main course", keyword: "loaded" },
  "sandwich": { type: "main course", keyword: "sandwich" },
  "casserole": { type: "main course", keyword: "casserole baked" },
  "plated_main": { type: "main course", keyword: "" },
  "random": { type: "main course", keyword: "" },
};

const ALLERGEN_INTOLERANCE_MAP: Record<string, string> = {
  "gluten": "gluten",
  "wheat": "wheat",
  "dairy": "dairy",
  "eggs": "egg",
  "peanuts": "peanut",
  "shellfish": "shellfish",
  "soy": "soy",
  "tree-nuts": "tree nut",
  "sesame": "sesame",
  "fish": "seafood",
  "seafood": "seafood",
  "sulphites": "sulfite",
};

const TIME_MAP: Record<string, number> = {
  "15-25": 25,
  "20-30": 30,
  "25-40": 40,
  "30-45": 45,
  "45-60": 60,
  "60-90": 90,
};

const PROTEIN_SAFETY_TABLE: Record<string, { temp_f: number; temp_c: number; rest_min: number; probe: string }> = {
  "chicken": { temp_f: 165, temp_c: 74, rest_min: 0, probe: "thickest part of breast or thigh, away from bone" },
  "turkey": { temp_f: 165, temp_c: 74, rest_min: 0, probe: "thickest part of the breast or thigh" },
  "beef": { temp_f: 145, temp_c: 63, rest_min: 3, probe: "thickest part, away from bone" },
  "pork": { temp_f: 145, temp_c: 63, rest_min: 3, probe: "thickest part of the cut" },
  "fish": { temp_f: 145, temp_c: 63, rest_min: 0, probe: "thickest part of the fillet" },
  "seafood": { temp_f: 145, temp_c: 63, rest_min: 0, probe: "thickest part" },
  "lamb": { temp_f: 145, temp_c: 63, rest_min: 3, probe: "thickest part, away from bone" },
  "vegetarian": { temp_f: 0, temp_c: 0, rest_min: 0, probe: "N/A" },
};

function getProteinSafety(protein: string): ProteinSafetyItem {
  const safe = PROTEIN_SAFETY_TABLE[protein.toLowerCase()] || PROTEIN_SAFETY_TABLE["beef"];
  if (safe.temp_f === 0) {
    return {
      protein: "Vegetables / Plant Protein",
      target_temp_f: 0,
      target_temp_c: 0,
      rest_minutes: 0,
      probe_where: "N/A",
      notes: "No meat temperature required. Wash all produce before use.",
    };
  }
  return {
    protein: protein.charAt(0).toUpperCase() + protein.slice(1),
    target_temp_f: safe.temp_f,
    target_temp_c: safe.temp_c,
    rest_minutes: safe.rest_min,
    probe_where: safe.probe,
    notes: `Cook to ${safe.temp_f}°F (${safe.temp_c}°C) internal temperature${safe.rest_min > 0 ? ` and rest ${safe.rest_min} minutes before serving` : ""}.`,
  };
}

function formatScaledAmount(amount: number, unit: string): string {
  const u = (unit || "").toLowerCase().trim();
  const roundQ = (n: number, q: number) => Math.round(n / q) * q;

  if (["lb", "lbs", "pound", "pounds"].includes(u)) {
    const r = roundQ(amount, 0.25);
    return `${r} lb${r !== 1 ? "s" : ""}`;
  }
  if (["oz", "ounce", "ounces"].includes(u)) {
    return `${Math.round(amount)} oz`;
  }
  if (["cup", "cups"].includes(u)) {
    const r = roundQ(amount, 0.25);
    return `${r} ${r === 1 ? "cup" : "cups"}`;
  }
  if (["tbsp", "tablespoon", "tablespoons"].includes(u)) {
    return `${Math.round(amount)} tbsp`;
  }
  if (["tsp", "teaspoon", "teaspoons"].includes(u)) {
    const r = roundQ(amount, 0.25);
    return `${r} tsp`;
  }
  if (["clove", "cloves"].includes(u)) {
    return `${Math.round(amount)} cloves`;
  }
  if (["slice", "slices"].includes(u)) {
    return `${Math.round(amount)} slices`;
  }
  if (["can", "cans"].includes(u)) {
    const r = Math.round(amount);
    return `${r} can${r !== 1 ? "s" : ""}`;
  }
  if (u === "" || ["serving", "servings", "portion", "portions"].includes(u)) {
    return `${Math.round(amount)}`;
  }

  const r = Math.round(amount * 10) / 10;
  return `${r}${u ? " " + u : ""}`.trim();
}

function extractMacros(detail: SpoonacularRecipeDetail): MacrosPerServing {
  if (!detail.nutrition?.nutrients) {
    return { calories: 550, protein_g: 40, carbs_g: 35, fat_g: 20 };
  }
  const nutrients = detail.nutrition.nutrients;
  const get = (name: string) =>
    nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase())?.amount || 0;

  return {
    calories: Math.round(get("calories")),
    protein_g: Math.round(get("protein")),
    carbs_g: Math.round(get("carbohydrates") || get("net carbohydrates")),
    fat_g: Math.round(get("fat")),
  };
}

function inferBaseCarb(detail: SpoonacularRecipeDetail): string {
  const combined = (detail.title + " " + detail.extendedIngredients.map((i) => i.name).join(" ")).toLowerCase();
  if (/pasta|spaghetti|penne|fettuccine|rigatoni|linguine|macaroni|lasagna/.test(combined)) return "pasta";
  if (/\brice\b|fried rice|risotto|pilaf|stir.fry/.test(combined)) return "rice";
  if (/\bbread\b|\bbun\b|sandwich|burger|toast|roll|hoagie/.test(combined)) return "bread";
  if (/tortilla|taco|wrap|burrito|quesadilla/.test(combined)) return "tortilla";
  if (/potato|fries|mash/.test(combined)) return "potato";
  if (/quinoa/.test(combined)) return "quinoa";
  if (/noodle|ramen|lo mein|udon|soba/.test(combined)) return "noodles";
  return "none";
}

function inferCookingMethod(steps: RecipeStep[]): string {
  const all = steps.map((s) => s.body.toLowerCase()).join(" ");
  if (/grill|grilled|barbecue/.test(all)) return "grill";
  if (/slow cooker|crock.?pot|braise/.test(all)) return "braise";
  if (/\boven\b|bake|baked|roast|roasted/.test(all)) return "oven";
  if (/stir.fry|wok/.test(all)) return "stir-fry";
  if (/instant pot|pressure cooker/.test(all)) return "pressure";
  return "stovetop";
}

// ─── Protein Audit System ────────────────────────────────────────────────────

const PROTEIN_KEYWORD_GROUPS: Record<string, string[]> = {
  chicken: ["chicken", "hen", "poultry", "rotisserie"],
  turkey: ["turkey", "ground turkey"],
  beef: [
    "beef", "steak", "brisket", "sirloin", "ribeye", "chuck", "ground beef",
    "meatball", "meatballs", "hamburger", "short rib", "short ribs",
  ],
  pork: [
    "pork", "ham", "bacon", "prosciutto", "pancetta", "sausage", "chorizo",
    "carnitas", "pulled pork", "ribs", "spare rib", "bratwurst", "kielbasa",
    "salami", "pepperoni",
  ],
  fish: [
    "salmon", "cod", "tilapia", "tuna", "halibut", "trout", "bass", "snapper",
    "mahi", "haddock", "flounder", "catfish", "pollock", "swordfish", "branzino",
    "sea bass", "mackerel", "sardine", "anchovy", "ahi",
  ],
  seafood: [
    "shrimp", "prawn", "crab", "lobster", "scallop", "clam", "mussel",
    "oyster", "squid", "calamari", "octopus", "langoustine",
  ],
};

const ALL_MEAT_SEAFOOD_WORDS = Object.values(PROTEIN_KEYWORD_GROUPS).flat();

/**
 * Infer the actual protein type from a recipe's title and ingredient list.
 * Returns "chicken" | "turkey" | "beef" | "pork" | "fish" | "seafood" | "vegetarian" | "unknown"
 */
export function inferActualProtein(
  title: string,
  ingredientNames: string[],
): string {
  const combined = [title, ...ingredientNames].join(" ").toLowerCase();

  for (const [protein, keywords] of Object.entries(PROTEIN_KEYWORD_GROUPS)) {
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw.replace(/ /g, "\\s+")}`, "i");
      if (regex.test(combined)) return protein;
    }
  }

  const hasMeat = ALL_MEAT_SEAFOOD_WORDS.some((kw) =>
    new RegExp(`\\b${kw.replace(/ /g, "\\s+")}`, "i").test(combined),
  );
  if (!hasMeat) return "vegetarian";

  return "unknown";
}

/**
 * Canonical protein-group synonyms. Recipe `protein` fields across the Golden
 * 100 / Performance 50 / Hall Expansion / BBQ manifests are curated editorial
 * strings, not always one of the 6 Generator UI filter values (chicken, beef,
 * pork, turkey, seafood, vegetarian) — an audit found values like "salmon",
 * "shrimp", "fish", "bacon", "sausage", and "plant" that a strict `===` check
 * silently excluded from every matching filter (e.g. every salmon/shrimp
 * recipe never matched the "Seafood" filter). This map is the single place
 * synonyms are declared so every one of proteinMatchesFilter's callers (hard
 * filters, scoring, fallback pools, v2 validation) stays in sync.
 */
const PROTEIN_FILTER_SYNONYMS: Record<string, readonly string[]> = {
  seafood: ["seafood", "fish", "salmon", "shrimp", "tuna", "cod", "shellfish", "crab", "lobster"],
  pork: ["pork", "bacon", "sausage", "ham"],
  vegetarian: ["vegetarian", "plant", "vegan"],
  beef: ["beef"],
  chicken: ["chicken"],
  turkey: ["turkey"],
};

/**
 * Check whether the inferred protein satisfies the selected protein filter.
 * Uses PROTEIN_FILTER_SYNONYMS so species-specific / editorial values (salmon,
 * shrimp, bacon, sausage, plant, ...) correctly match their parent filter
 * group instead of only matching an exact string.
 */
export function proteinMatchesFilter(
  inferred: string,
  selected: string,
): boolean {
  if (selected === "any") return true;
  const inferredNorm = (inferred || "").trim().toLowerCase();
  const selectedNorm = (selected || "").trim().toLowerCase();
  const synonyms = PROTEIN_FILTER_SYNONYMS[selectedNorm];
  if (synonyms) return synonyms.includes(inferredNorm);
  return inferredNorm === selectedNorm;
}

function inferMealStyle(dishTypes: string[], title: string, mealFormat?: string): string {
  const types = (dishTypes || []).map((d) => d.toLowerCase());
  const t = title.toLowerCase();

  if (mealFormat && mealFormat !== "random") {
    const formatToStyle: Record<string, string> = {
      burger: "burger",
      tacos: "tacos",
      wrap: "wrap",
      bowl: "bowl",
      pasta: "pasta",
      salad: "salad",
      sheet_pan: "sheet pan",
      skillet: "skillet",
      stir_fry: "stir fry",
      soup_chili: "soup/chili",
      breakfast: "breakfast",
      loaded_fries: "loaded fries",
      sandwich: "sandwich",
      casserole: "casserole",
      plated_main: "plated main",
    };
    if (formatToStyle[mealFormat]) return formatToStyle[mealFormat];
  }

  if (types.includes("soup") || types.includes("stew") || t.includes("soup") || t.includes("stew") || t.includes("chili")) return "soup/chili";
  if (types.includes("salad") || t.includes("salad")) return "salad";
  if (types.includes("breakfast") || t.includes("breakfast")) return "breakfast";
  if (t.includes("burger")) return "burger";
  if (t.includes("taco")) return "tacos";
  if (t.includes("wrap")) return "wrap";
  if (t.includes("stir") || t.includes("stir-fry")) return "stir fry";
  if (t.includes("casserole")) return "casserole";
  if (t.includes("skillet")) return "skillet";
  if (t.includes("sandwich") || t.includes("sub") || t.includes("hoagie")) return "sandwich";
  if (types.includes("pasta") || t.includes("pasta") || t.includes("spaghetti") || t.includes("penne")) return "pasta";
  return "plated main";
}

export function convertSpoonacularToGenerateResponse(
  detail: SpoonacularRecipeDetail,
  request: GenerateRequest,
  chosenProtein: string,
): GenerateResponse {
  const baseServings = detail.servings || 4;
  const scaleFactor = request.crew_size / baseServings;

  const rawIngredients: IngredientItem[] = detail.extendedIngredients.map((ing) => ({
    item: ing.name,
    amount: formatScaledAmount(ing.amount * scaleFactor, ing.unit),
    notes: ing.original !== ing.name ? ing.original : "",
  }));

  const ingMap = new Map<string, IngredientItem>();
  for (const ing of rawIngredients) {
    const key = ing.item.toLowerCase().trim();
    if (!ingMap.has(key)) {
      ingMap.set(key, ing);
    }
  }
  let ingredients: IngredientItem[] = Array.from(ingMap.values());
  ingredients = applyCrewPortionFloors(ingredients, request.crew_size);

  const rawSteps = detail.analyzedInstructions?.[0]?.steps || [];
  let steps: RecipeStep[] =
    rawSteps.length > 0
      ? rawSteps.map((s, i) => ({
          heading: `Step ${s.number || i + 1}`,
          body: s.step,
        }))
      : [
          {
            heading: "Prepare and Cook",
            body: detail.instructions || "Follow recipe instructions, scaling for your crew size.",
          },
        ];

  const macros = extractMacros(detail);

  const totalMin = detail.readyInMinutes || 30;
  const prepMin = detail.preparationMinutes ?? Math.round(totalMin * 0.35);
  const cookMin = detail.cookingMinutes ?? totalMin - prepMin;
  const timing: RecipeTiming = {
    prep_minutes: Math.max(5, prepMin),
    cook_minutes: Math.max(5, cookMin),
    total_minutes: Math.max(10, totalMin),
  };

  const protein_safety: ProteinSafetyItem[] = [getProteinSafety(chosenProtein)];

  const mealStyle = inferMealStyle(detail.dishTypes, detail.title, request.meal_format);
  const cuisine = detail.cuisines?.[0] || request.cuisine_style || "american";

  const recipeTags: RecipeTags = {
    cuisine: cuisine.toLowerCase(),
    cooking_method: inferCookingMethod(steps),
    base_carb: inferBaseCarb(detail),
    key_ingredients: detail.extendedIngredients.slice(0, 5).map((i) => i.name),
    high_protein: macros.protein_g >= 30,
    high_fiber: false,
    quick_cleanup: totalMin <= 30,
  };

  const cuisineLabel = detail.cuisines?.[0] || cuisine;
  const why = buildHallWhyItFits(
    detail.title,
    request.crew_size,
    cuisineLabel,
    chosenProtein,
    totalMin,
    request.meal_format,
  );

  const sourceUrl = detail.sourceUrl || "";
  const base: GenerateResponse = {
    template_id: 0,
    chosen_protein: chosenProtein,
    primary_protein_source: chosenProtein,
    title: detail.title,
    meal_style: mealStyle,
    why_it_fits_tonight: why,
    timing,
    protein_safety,
    ingredients,
    steps,
    cleanup_tip: hallCleanupTip(),
    macros_per_serving: macros,
    pro_tips: hallProTips(request.crew_size, baseServings),
    tags: recipeTags,
  };

  return attachImportedRecipeMeta(
    base,
    {
      kind: "spoonacular",
      name: publisherNameFromSourceUrl(sourceUrl),
      url: sourceUrl,
      license: "aggregator",
    },
    { preserveSteps: rawSteps.length >= 3 },
  );
}

async function tryConvertCandidate(
  candidate: { id: number; title: string },
  request: GenerateRequest,
  chosenProtein: string,
): Promise<GenerateResponse | null> {
  const detail = await getRecipeById(candidate.id, true);

  const hasSteps =
    detail.analyzedInstructions &&
    detail.analyzedInstructions.length > 0 &&
    detail.analyzedInstructions[0].steps.length > 0;

  if (!hasSteps) {
    log(
      `[spoonacular-generator] id=${candidate.id} "${candidate.title}" — no parsed steps, skipping`,
      "spoonacular",
    );
    return null;
  }

  const ingredientNames = detail.extendedIngredients.map((i) => i.name);
  const inferred = inferActualProtein(detail.title, ingredientNames);
  const matches = proteinMatchesFilter(inferred, chosenProtein);

  if (matches) {
    logVerbose(
      `[proteinAudit] accepted selected=${chosenProtein} inferred=${inferred} id=${candidate.id}`,
      "spoonacular",
    );
  } else {
    logVerbose(
      `[proteinAudit] rejected selected=${chosenProtein} inferred=${inferred} id=${candidate.id}`,
      "spoonacular",
    );
    return null;
  }

  return convertSpoonacularToGenerateResponse(detail, request, chosenProtein);
}

export async function fetchBestSpoonacularRecipe(
  request: GenerateRequest,
  chosenProtein: string,
): Promise<GenerateResponse | null> {
  try {
    const proteinQuery =
      chosenProtein === "pantry" ? (request.protein || "chicken") : chosenProtein;

    const formatInfo =
      FORMAT_MAP[request.meal_format || "random"] || { type: "main course", keyword: "" };
    const cuisineKey = request.cuisine_style || "any";
    const spoonacularCuisine = CUISINE_MAP[cuisineKey] || "";

    const queryParts = [proteinQuery];
    if (formatInfo.keyword) queryParts.push(formatInfo.keyword);
    if (cuisineKey === "bbq") queryParts.push("bbq");
    if (cuisineKey === "canadian") queryParts.push("canadian style");
    if (cuisineKey === "asian" && !spoonacularCuisine) queryParts.push("asian");
    const query = queryParts.filter(Boolean).join(" ");

    const intolerances = (request.allergens_to_avoid || [])
      .map((a) => ALLERGEN_INTOLERANCE_MAP[a.toLowerCase()] || "")
      .filter(Boolean)
      .join(",");

    const maxReadyTime = TIME_MAP[request.time_available] || 60;

    let diet: string | undefined;
    if (request.protein === "vegetarian") {
      diet = "vegetarian";
    }

    log(
      `[spoonacular-generator] Searching: query="${query}" cuisine="${spoonacularCuisine || "any"}" type="${formatInfo.type}" maxTime=${maxReadyTime} intolerances="${intolerances || "none"}" diet="${diet || "none"}"`,
      "spoonacular",
    );

    let searchResult = await searchRecipes(query, {
      cuisine: spoonacularCuisine || undefined,
      type: formatInfo.type,
      maxReadyTime,
      intolerances: intolerances || undefined,
      diet,
      number: 10,
      sort: "popularity",
    });

    if (!searchResult.results || searchResult.results.length === 0) {
      log(
        `[spoonacular-generator] 0 results for query="${query}" — relaxing format constraint`,
        "spoonacular",
      );
      searchResult = await searchRecipes(query, {
        cuisine: spoonacularCuisine || undefined,
        maxReadyTime: Math.min(maxReadyTime + 20, 120),
        intolerances: intolerances || undefined,
        diet,
        number: 10,
        sort: "popularity",
      });
    }

    if (!searchResult.results || searchResult.results.length === 0) {
      log(
        `[spoonacular-generator] Still 0 results after relaxation — falling back to AI`,
        "spoonacular",
      );
      return null;
    }

    // --- Pre-filter candidates by title protein match (cheap, no API call) ---
    const titlePassing = searchResult.results.filter((r) => {
      const inferred = inferActualProtein(r.title, []);
      // If title gives a clear mismatch, skip early. If title is ambiguous ("unknown"), let detail check decide.
      if (inferred === "unknown") return true;
      return proteinMatchesFilter(inferred, chosenProtein);
    });

    const candidates =
      titlePassing.length > 0 ? titlePassing : searchResult.results;

    log(
      `[spoonacular-generator] ${searchResult.results.length} results, ${candidates.length} pass title protein check for selected="${chosenProtein}"`,
      "spoonacular",
    );

    // Shuffle top-5 candidates so we get variety on repeated requests
    const pool = candidates.slice(0, 5);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Try each candidate in order — return first that passes protein audit + has steps
    for (const candidate of pool) {
      logVerbose(
        `[spoonacular-generator] try id=${candidate.id} title="${clip(candidate.title, 40)}"`,
        "spoonacular",
      );
      const recipe = await tryConvertCandidate(candidate, request, chosenProtein);
      if (recipe) {
        log(
          `[spoonacular-generator] converted id=${candidate.id} title="${clip(recipe.title, 50)}" ings=${recipe.ingredients.length} steps=${recipe.steps.length}`,
          "spoonacular",
        );
        return recipe;
      }
    }

    log(
      `[spoonacular-generator] No protein-matching candidates found among ${pool.length} tried — falling back to AI`,
      "spoonacular",
    );
    return null;
  } catch (err: any) {
    log(
      `[spoonacular-generator] Error: ${err.message} — falling back to AI`,
      "spoonacular",
    );
    return null;
  }
}
