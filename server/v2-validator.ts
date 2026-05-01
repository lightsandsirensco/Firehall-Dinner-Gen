/**
 * V2 Spoonacular Candidate Validator
 *
 * Runs before any recipe is returned to the user.
 * Each check is independent. The first failure short-circuits and returns a rejection.
 *
 * Checks (in order):
 *   1. Parsed steps present
 *   2. Protein inference matches selected protein filter
 *   3. Meal format structural rules
 *   4. Title alignment (key title words appear in ingredients)
 *   5. Allergen scan (secondary safety net beyond Spoonacular intolerances)
 *   6. Carb logic (rice not present in non-rice formats)
 *   7. Cuisine guard (no cross-cuisine ingredient contamination; score ≥ 6)
 */

import { log } from "./index";
import { inferActualProtein, proteinMatchesFilter } from "./spoonacular-converter";
import { ALLERGEN_KEYWORDS } from "./allergens";
import { scoreCuisineMatch } from "./cuisine-guard";
import type { SpoonacularRecipeDetail } from "./spoonacular";

// ─── Result Types ─────────────────────────────────────────────────────────────

export interface CandidateValidationResult {
  accepted: boolean;
  inferredProtein: string;
  rejectionReason?: string;
}

// ─── Format Rules ─────────────────────────────────────────────────────────────

interface FormatRule {
  // Ingredient keyword required (any one match = pass)
  requiredIngredient?: RegExp;
  requiredIngredientLabel?: string;
  // Step keyword required (any one match = pass)
  requiredStep?: RegExp;
  requiredStepLabel?: string;
  // Either ingredient OR step must match (soft structural check)
  requiredEither?: RegExp;
  requiredEitherLabel?: string;
  // Ingredient or step keyword forbidden
  forbiddenCarb?: RegExp;
  forbiddenCarbLabel?: string;
}

const FORMAT_RULES: Record<string, FormatRule> = {
  pasta: {
    requiredIngredient: /\b(pasta|spaghetti|penne|rigatoni|fusilli|linguine|fettuccine|rotini|farfalle|ziti|macaroni|orzo|noodle|cavatappi|bucatini|lasagna|gnocchi)\b/i,
    requiredIngredientLabel: "pasta/noodles ingredient",
  },
  burger: {
    requiredEither: /\b(burger|burgers|hamburger|patty|patties|bun|brioche)\b/i,
    requiredEitherLabel: "burger/patty/bun",
    forbiddenCarb: /\b(rice)\b/i,
    forbiddenCarbLabel: "rice (not appropriate for burgers)",
  },
  tacos: {
    requiredIngredient: /\b(tortilla|taco shell|corn tortilla|flour tortilla)\b/i,
    requiredIngredientLabel: "tortilla/taco shell",
    forbiddenCarb: /\b(rice)\b/i,
    forbiddenCarbLabel: "rice (not appropriate for tacos)",
  },
  wrap: {
    requiredEither: /\b(tortilla|wrap|lavash|flatbread|pita)\b/i,
    requiredEitherLabel: "tortilla/wrap/lavash/pita",
    forbiddenCarb: /\b(rice)\b/i,
    forbiddenCarbLabel: "rice (not appropriate for wraps)",
  },
  stew: {
    requiredEither: /\b(broth|stock|simmer|stew)\b/i,
    requiredEitherLabel: "broth/stock/simmer (stew structure)",
    forbiddenCarb: /\b(pasta|spaghetti|penne|noodles)\b/i,
    forbiddenCarbLabel: "pasta/noodles in stew",
  },
  soup_chili: {
    requiredEither: /\b(broth|stock|simmer|chili|soup)\b/i,
    requiredEitherLabel: "broth/stock/simmer (soup structure)",
  },
  stir_fry: {
    requiredStep: /\b(stir.?fry|stir fry|wok|toss|high.?heat)\b/i,
    requiredStepLabel: "stir-fry/wok/high-heat technique in steps",
    forbiddenCarb: /\b(pasta|spaghetti|penne)\b/i,
    forbiddenCarbLabel: "pasta in stir fry",
  },
  sheet_pan: {
    requiredStep: /\b(oven|bake|baked|roast|roasted|preheat)\b/i,
    requiredStepLabel: "oven/bake/roast step",
    forbiddenCarb: /\b(rice)\b/i,
    forbiddenCarbLabel: "rice (not appropriate for sheet pan)",
  },
  grill: {
    requiredEither: /\b(grill|grilled|grilling|barbecue|bbq|char|charred)\b/i,
    requiredEitherLabel: "grill/barbecue cooking method",
  },
  sandwich: {
    requiredIngredient: /\b(bread|roll|hoagie|ciabatta|sourdough|baguette|sub|focaccia|bun|brioche)\b/i,
    requiredIngredientLabel: "bread/roll/bun ingredient",
  },
  salad: {
    requiredIngredient: /\b(greens|lettuce|spinach|kale|arugula|romaine|mixed greens|spring mix|cabbage|coleslaw)\b/i,
    requiredIngredientLabel: "greens/lettuce ingredient",
  },
  bowl: {
    // Bowls are flexible — rice, quinoa, noodles, or greens all qualify
    requiredEither: /\b(rice|quinoa|noodle|couscous|farro|barley|greens|lettuce|spinach|potato|sweet potato|cauliflower rice)\b/i,
    requiredEitherLabel: "bowl base (rice/quinoa/noodles/greens/potato)",
  },
  casserole: {
    requiredStep: /\b(oven|bake|baked|casserole|preheat)\b/i,
    requiredStepLabel: "oven/bake step",
  },
  skillet: {
    requiredStep: /\b(skillet|pan|sauté|sear|stovetop|stove|heat.*oil)\b/i,
    requiredStepLabel: "skillet/pan/stovetop step",
  },
  one_pot: {
    // One-pot is flexible — just needs some cooking vessel
    requiredStep: /\b(pot|pan|skillet|dutch oven|slow cooker|instant pot|pressure cooker|simmer|sauté)\b/i,
    requiredStepLabel: "pot/pan cooking (one-pot structure)",
  },
};

// ─── Carb Rules ───────────────────────────────────────────────────────────────

// Formats where rice appearing as a primary ingredient is a mistake
const RICE_FORBIDDEN_FORMATS = new Set([
  "burger", "wrap", "tacos", "sandwich", "salad", "grill", "sheet_pan", "loaded_fries",
]);

// Detect rice as a primary ingredient (not just in a title word or trace mention)
function hasRiceAsMainIngredient(ingredientNames: string[]): boolean {
  return ingredientNames.some((n) => /^(rice|jasmine rice|brown rice|white rice|basmati|fried rice|arborio)\b/i.test(n.trim()));
}

// ─── Title Alignment Check ────────────────────────────────────────────────────

// Key ingredient words that should appear in the actual ingredients if they're in the title.
// We focus on proteins and notable ingredients that would be misleading if absent.
const TITLE_ALIGNMENT_KEYWORDS: Array<{ pattern: RegExp; check: RegExp; label: string }> = [
  { pattern: /\blemon\b/i,    check: /\blemon\b/i,                    label: "lemon" },
  { pattern: /\bgarlic\b/i,   check: /\bgarlic\b/i,                   label: "garlic" },
  { pattern: /\bteriyaki\b/i, check: /\b(teriyaki|soy sauce|mirin)\b/i, label: "teriyaki sauce" },
  { pattern: /\bpesto\b/i,    check: /\b(pesto|basil)\b/i,            label: "pesto/basil" },
  { pattern: /\bparmesan\b/i, check: /\b(parmesan|parmigiano)\b/i,    label: "parmesan" },
  { pattern: /\bbacon\b/i,    check: /\b(bacon|pancetta)\b/i,         label: "bacon" },
  { pattern: /\bmushroom\b/i, check: /\b(mushroom|fungi)\b/i,         label: "mushroom" },
  { pattern: /\bspinach\b/i,  check: /\bspinach\b/i,                  label: "spinach" },
  { pattern: /\bavocado\b/i,  check: /\bavocado\b/i,                  label: "avocado" },
  { pattern: /\bchorizo\b/i,  check: /\bchorizo\b/i,                  label: "chorizo" },
  { pattern: /\bshrimp\b/i,   check: /\b(shrimp|prawn)\b/i,          label: "shrimp" },
  { pattern: /\bsalmon\b/i,   check: /\bsalmon\b/i,                   label: "salmon" },
];

function validateTitleAlignment(
  title: string,
  ingredientNames: string[],
): { ok: boolean; reason?: string } {
  const allIngredients = ingredientNames.join(" ").toLowerCase();

  for (const { pattern, check, label } of TITLE_ALIGNMENT_KEYWORDS) {
    if (pattern.test(title) && !check.test(allIngredients)) {
      return { ok: false, reason: `title mentions "${label}" but ingredient not found` };
    }
  }

  return { ok: true };
}

// ─── Allergen Scan ────────────────────────────────────────────────────────────

function validateAllergens(
  ingredientNames: string[],
  steps: { step: string }[],
  title: string,
  allergens: string[],
): { ok: boolean; violations: string[] } {
  if (allergens.length === 0) return { ok: true, violations: [] };

  const violations: string[] = [];

  for (const allergen of allergens) {
    const normalizedAllergen = allergen.toLowerCase();
    const pattern = ALLERGEN_KEYWORDS[normalizedAllergen] || ALLERGEN_KEYWORDS[normalizedAllergen.replace(/s$/, "")];
    if (!pattern) continue;

    // Check ingredient names
    for (const name of ingredientNames) {
      if (pattern.test(name)) {
        // Skip substitutable ingredients — they'll be swapped later if recipe is accepted
        const isSubstitutable = isEasilySubstitutable(name, normalizedAllergen);
        if (!isSubstitutable) {
          violations.push(`ingredient "${name}" violates ${allergen}`);
        }
      }
    }

    // Check title
    if (pattern.test(title)) {
      violations.push(`title "${title.substring(0, 40)}" references ${allergen}`);
    }
  }

  return { ok: violations.length === 0, violations };
}

// Ingredients that can be trivially swapped without fundamentally changing the recipe
const EASILY_SUBSTITUTABLE: Record<string, RegExp> = {
  dairy:    /\b(butter|cream|milk|cheese|parmesan|mozzarella|cheddar|sour cream|yogurt|ghee)\b/i,
  soy:      /\b(soy sauce|tamari|miso)\b/i,
  gluten:   /\b(soy sauce|breadcrumbs?|panko|flour)\b/i,
  eggs:     /\b(egg|eggs)\b/i,
  peanuts:  /\b(peanut butter|peanut oil)\b/i,
};

function isEasilySubstitutable(ingredientName: string, allergen: string): boolean {
  const pattern = EASILY_SUBSTITUTABLE[allergen];
  if (!pattern) return false;
  return pattern.test(ingredientName);
}

// ─── Main Validator ───────────────────────────────────────────────────────────

export function validateV2Candidate(
  detail: SpoonacularRecipeDetail,
  selectedProtein: string,
  formatKey: string,
  allergens: string[],
  cuisineKey: string = "any",
): CandidateValidationResult {
  const ingredientNames = detail.extendedIngredients.map((i) => i.name);
  const ingredientText = ingredientNames.join(" ").toLowerCase();
  const steps = detail.analyzedInstructions?.[0]?.steps || [];
  const stepText = steps.map((s) => s.step).join(" ").toLowerCase();
  const titleLower = detail.title.toLowerCase();

  // ── Check 1: Parsed steps ──────────────────────────────────────────────────
  if (steps.length === 0) {
    const reason = "no-parsed-steps";
    log(`[validator] selectedProtein=${selectedProtein} inferredProtein=unknown mealStyle=${formatKey} result=rejected rejectionReason=${reason}`, "v2");
    return { accepted: false, inferredProtein: "unknown", rejectionReason: reason };
  }

  // ── Check 2: Protein inference ─────────────────────────────────────────────
  const inferredProtein = inferActualProtein(detail.title, ingredientNames);
  const proteinOk = proteinMatchesFilter(inferredProtein, selectedProtein);

  log(`[validator] selectedProtein=${selectedProtein}`, "v2");
  log(`[validator] inferredProtein=${inferredProtein}`, "v2");
  log(`[validator] mealStyle=${formatKey}`, "v2");

  if (!proteinOk) {
    const reason = `protein-mismatch:expected=${selectedProtein},inferred=${inferredProtein}`;
    log(`[validator] result=rejected rejectionReason=${reason}`, "v2");
    return { accepted: false, inferredProtein, rejectionReason: reason };
  }

  // ── Check 3: Meal format structural rules ──────────────────────────────────
  const fmtRules = FORMAT_RULES[formatKey];
  if (fmtRules) {
    // Required ingredient
    if (fmtRules.requiredIngredient && !fmtRules.requiredIngredient.test(ingredientText)) {
      const reason = `format:missing-${fmtRules.requiredIngredientLabel}`;
      log(`[validator] result=rejected rejectionReason=${reason}`, "v2");
      return { accepted: false, inferredProtein, rejectionReason: reason };
    }
    // Required step
    if (fmtRules.requiredStep && !fmtRules.requiredStep.test(stepText)) {
      const reason = `format:missing-step:${fmtRules.requiredStepLabel}`;
      log(`[validator] result=rejected rejectionReason=${reason}`, "v2");
      return { accepted: false, inferredProtein, rejectionReason: reason };
    }
    // Required either (ingredient OR step)
    if (fmtRules.requiredEither) {
      const eitherOk = fmtRules.requiredEither.test(ingredientText) || fmtRules.requiredEither.test(stepText) || fmtRules.requiredEither.test(titleLower);
      if (!eitherOk) {
        const reason = `format:missing:${fmtRules.requiredEitherLabel}`;
        log(`[validator] result=rejected rejectionReason=${reason}`, "v2");
        return { accepted: false, inferredProtein, rejectionReason: reason };
      }
    }
    // Forbidden carb
    if (fmtRules.forbiddenCarb && fmtRules.forbiddenCarb.test(ingredientText)) {
      const reason = `format:forbidden-carb:${fmtRules.forbiddenCarbLabel}`;
      log(`[validator] result=rejected rejectionReason=${reason}`, "v2");
      return { accepted: false, inferredProtein, rejectionReason: reason };
    }
  }

  // ── Check 4: Title alignment ───────────────────────────────────────────────
  const titleCheck = validateTitleAlignment(detail.title, ingredientNames);
  if (!titleCheck.ok) {
    const reason = `title-alignment:${titleCheck.reason}`;
    log(`[validator] result=rejected rejectionReason=${reason}`, "v2");
    return { accepted: false, inferredProtein, rejectionReason: reason };
  }

  // ── Check 5: Allergen scan ─────────────────────────────────────────────────
  if (allergens.length > 0) {
    const allergenCheck = validateAllergens(ingredientNames, steps, detail.title, allergens);
    if (!allergenCheck.ok) {
      const reason = `allergen:${allergenCheck.violations.slice(0, 2).join("|")}`;
      log(`[validator] result=rejected rejectionReason=${reason}`, "v2");
      return { accepted: false, inferredProtein, rejectionReason: reason };
    }
  }

  // ── Check 6: Carb logic ────────────────────────────────────────────────────
  if (RICE_FORBIDDEN_FORMATS.has(formatKey) && hasRiceAsMainIngredient(ingredientNames)) {
    const reason = `carb:rice-in-${formatKey}`;
    log(`[validator] result=rejected rejectionReason=${reason}`, "v2");
    return { accepted: false, inferredProtein, rejectionReason: reason };
  }

  // ── Check 7: Cuisine guard ─────────────────────────────────────────────────
  // Scores 0–10: deducts 2 per cross-cuisine ingredient found in the blocklist.
  // Threshold < 6 = two or more clear violations → reject.
  // "any" cuisine always passes (score = 10).
  if (cuisineKey && cuisineKey !== "any") {
    const cuisineScore = scoreCuisineMatch(ingredientNames, detail.title, cuisineKey);
    log(`[validator] cuisineMatchScore=${cuisineScore} cuisine=${cuisineKey}`, "v2");

    if (cuisineScore < 6) {
      const reason = `cuisine-mismatch:cuisine=${cuisineKey},score=${cuisineScore}`;
      log(`[validator] result=rejected rejectionReason=${reason}`, "v2");
      return { accepted: false, inferredProtein, rejectionReason: reason };
    }

    if (cuisineScore < 8) {
      log(`[validator] cuisine-warning:score=${cuisineScore} cuisine=${cuisineKey} — passing with caution`, "v2");
    }
  }

  // ── Accepted ───────────────────────────────────────────────────────────────
  log(`[validator] result=accepted`, "v2");
  return { accepted: true, inferredProtein };
}
