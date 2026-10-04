#!/usr/bin/env tsx
/**
 * Generated-meal consistency regression:
 *  - deterministic fallback titles only name ingredients the recipe contains
 *  - meal image signature keys never alias different dishes
 *  - recipe card chips never show internal values ("random", "Hall")
 *
 *   npx tsx scripts/test-fallback-title-consistency.ts
 */
import type { GenerateRequest, TemplateRow } from "../shared/schema.js";
import { buildFallbackRecipe } from "../server/fallback-recipe.js";
import { buildEmergencyFallbackRecipe } from "../server/generation/emergency-fallback.js";
import { STRUCTURE_TYPES, STRUCTURE_DISPLAY } from "../server/structure-variety.js";
import { mealImageryKeyFromSignature } from "../server/food-imagery/context-builders.js";
import {
  customerCuisineLabel,
  customerMealFormatLabel,
  customerProteinLabel,
} from "../shared/customer-facing.js";

let failures = 0;
function check(ok: boolean, label: string): void {
  if (!ok) {
    failures++;
    console.error(`FAIL ${label}`);
  }
}

/** Title word → ingredient pattern that must be present for the claim to be honest. */
const TITLE_CLAIMS: Array<{ title: RegExp; ingredient: RegExp }> = [
  { title: /\btacos\b|\btortilla|\benchilada|\bburrito|\bfajita|\bquesadilla/i, ingredient: /tortilla/i },
  { title: /\btaco\b/i, ingredient: /tortilla|taco seasoning/i },
  { title: /\bburgers?\b|\bsubs?\b|\bsandwich|\bbánh mì|\bbanh mi/i, ingredient: /\bbun|roll|bread|baguette/i },
  { title: /\bpasta\b|\bmac\b|\bbolognese|\bragu|\bmarinara/i, ingredient: /pasta|macaroni|spaghetti|penne/i },
  { title: /\bnoodles?\b/i, ingredient: /noodle/i },
  { title: /\bflatbreads?\b/i, ingredient: /flatbread|naan|pita/i },
  { title: /\bcreamy\b|\bcream\b/i, ingredient: /cream/i },
  { title: /\bcheesy\b|\bcheese\b|\bfeta\b|\bhalloumi\b/i, ingredient: /cheese|feta|halloumi/i },
  { title: /\bbutter\b/i, ingredient: /butter/i },
  { title: /\bteriyaki\b|\bsoy\b/i, ingredient: /soy sauce|teriyaki/i },
  { title: /\bbbq\b|\bbarbecue\b/i, ingredient: /bbq|barbecue/i },
  { title: /\bquinoa\b/i, ingredient: /quinoa/i },
  { title: /\brice\b/i, ingredient: /\brice\b/i },
  { title: /\bfries\b|\bnacho/i, ingredient: /fries|chips/i },
  { title: /\bblack beans?\b/i, ingredient: /black beans/i },
  { title: /\bcorn\b/i, ingredient: /\bcorn\b/i },
  { title: /\bpotato/i, ingredient: /potato/i },
  { title: /\basparagus\b/i, ingredient: /asparagus/i },
  { title: /\bshrimp\b/i, ingredient: /shrimp/i },
  { title: /\bsalmon\b/i, ingredient: /salmon/i },
  { title: /\begg\b|\beggs\b/i, ingredient: /\beggs?\b/i },
  { title: /\bcurry\b/i, ingredient: /curry/i },
  { title: /\bpesto\b/i, ingredient: /pesto/i },
];

function unsupportedClaims(title: string, ingredientItems: string[]): string[] {
  const blob = ingredientItems.join(" | ");
  return TITLE_CLAIMS.filter((c) => c.title.test(title) && !c.ingredient.test(blob)).map((c) => String(c.title));
}

const STUB: TemplateRow = {
  template_id: "0", template_name: "t", style: "", base_idea_description: "", appliances_needed: "",
  time_range_minutes: "", busy_level_fit: "", healthiness_level: "", proteins_allowed: "",
  allergens_possible: "", mess_level: "", reheat_friendly: "",
};

const PROTEINS = ["chicken", "beef", "pork", "turkey", "fish", "seafood", "vegetarian"];
const APPLIANCE_SETS = [["stove", "oven"], ["stove"], ["oven"]];
const DISPLAY_VALUES = new Set(Object.values(STRUCTURE_DISPLAY));

let built = 0;
for (const protein of PROTEINS) {
  for (const appliances of APPLIANCE_SETS) {
    for (const structure of STRUCTURE_TYPES) {
      for (let i = 0; i < 3; i++) {
        const request = { protein, appliances, crew_size: 6, meal_format: "random" } as unknown as GenerateRequest;
        const r = buildFallbackRecipe(STUB, request, protein, structure);
        built++;
        const items = r.ingredients.map((x) => x.item);
        const bad = unsupportedClaims(r.title, items);
        check(bad.length === 0, `fallback "${r.title}" (${protein}/${structure}) claims ${bad.join(", ")} not in ingredients`);
        check(DISPLAY_VALUES.has(r.meal_style), `fallback "${r.title}" meal_style "${r.meal_style}" is not a structure label`);
      }
    }
  }
}

for (const protein of ["chicken", "beef", "pork", "turkey", "fish", "vegetarian"]) {
  for (const fmt of ["random", "skillet", "tacos", "burger"]) {
    const request = { protein, appliances: ["stove", "oven"], crew_size: 6, meal_format: fmt, time_available: "25-40" } as unknown as GenerateRequest;
    const { recipe } = buildEmergencyFallbackRecipe(request, `${protein}-${fmt}`);
    const bad = unsupportedClaims(recipe.title, recipe.ingredients.map((x) => x.item));
    check(bad.length === 0, `emergency "${recipe.title}" (${protein}/${fmt}) claims ${bad.join(", ")} not in ingredients`);
  }
}

const sigA = "skillet|chicken|american|potato|stovetop|boneless skinless chicken breasts,heavy cream,yukon gold potatoes";
const sigB = "skillet|chicken|american|potato|stovetop|boneless skinless chicken thighs,black beans,corn,enchilada sauce";
check(sigA.slice(0, 48) === sigB.slice(0, 48), "fixture: signatures share the old 48-char prefix");
check(mealImageryKeyFromSignature(sigA) !== mealImageryKeyFromSignature(sigB), "image keys differ for different dishes with a shared prefix");
check(mealImageryKeyFromSignature(sigA) === mealImageryKeyFromSignature(sigA), "image key is stable for the same signature");
check(mealImageryKeyFromSignature(sigA).startsWith("meal:sig:"), "image key keeps meal:sig: prefix");

check(customerMealFormatLabel({ meal_format: "random", meal_style: "" } as never) === null, 'format chip hides "random"');
check(customerMealFormatLabel({ meal_format: "random", meal_style: "Skillet" } as never) === "Skillet", "format chip uses built meal_style");
check(customerMealFormatLabel({ meal_format: "tacos", meal_style: "Skillet" } as never) === "Skillet", "format chip prefers built dish over request");
check(customerMealFormatLabel({ meal_format: "plated_main", meal_style: "Plated Main" } as never) === null, 'format chip hides "Plated Main"');
check(customerMealFormatLabel({ meal_format: "stir_fry", meal_style: "" } as never) === "Stir-Fry", "format chip humanizes stir_fry");
check(customerProteinLabel("chicken") === "Chicken", "protein chip is title case");
check(customerProteinLabel("any") === null, 'protein chip hides "any"');
check(customerCuisineLabel("Hall") === null, 'cuisine caption hides "Hall"');
check(customerCuisineLabel("any") === null, 'cuisine caption hides "any"');
check(customerCuisineLabel("Italian") === "Italian", "cuisine caption keeps real cuisine");

if (failures > 0) {
  console.error(`[test-fallback-title-consistency] ${failures} failure(s)`);
  process.exit(1);
}
console.log(`[test-fallback-title-consistency] PASS — ${built} fallback builds + emergency meals, image keys, chips`);
process.exit(0);
