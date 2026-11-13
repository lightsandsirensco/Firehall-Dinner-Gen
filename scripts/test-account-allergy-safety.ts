#!/usr/bin/env tsx
/**
 * Saved profile allergies / dietary restrictions are enforced for signed-in
 * generation: every PROFILE_ALLERGY_OPTIONS key maps to a real scanner rule,
 * the server merge unions (never replaces) client choices, the generator chips
 * include account restrictions, and every allergy still leaves a usable pool.
 */
import assert from "node:assert/strict";
import { PROFILE_ALLERGY_OPTIONS, PROFILE_DIETARY_OPTIONS } from "../shared/auth/constants.js";
import { containsAllergen, scanRecipeForAllergens } from "../server/allergens.js";
import {
  accountSafetyFromPreferences,
  mergeAccountSafetyIntoBody,
} from "../server/generation/account-dietary-safety.js";
import { resolveGeneratorFilters } from "../shared/generator-personalization.js";
import { getApprovedCatalog } from "../server/approved-catalog-cache.js";
import { resolveShoppingRecipe } from "../server/shift-plan/routes.js";
import type { UserPreferences } from "../shared/auth/types.js";

// ---- Scanner understands every profile allergy key ----
const POSITIVE: Record<(typeof PROFILE_ALLERGY_OPTIONS)[number], string> = {
  peanuts: "2 tbsp creamy peanut butter",
  tree_nuts: "1/2 cup basil pesto",
  shellfish: "1 lb shrimp",
  dairy: "1 cup shredded cheddar",
  eggs: "2 large eggs",
  soy: "3 tbsp soy sauce",
  gluten: "8 oz penne pasta",
  sesame: "2 tbsp tahini",
};
for (const key of PROFILE_ALLERGY_OPTIONS) {
  const safety = accountSafetyFromPreferences([key], []);
  assert.equal(safety.allergens.length, 1, `${key} maps to a scanner key`);
  assert.ok(containsAllergen(POSITIVE[key], safety.allergens[0]!), `${key} detects "${POSITIVE[key]}"`);
}
assert.equal(containsAllergen("1 can coconut milk", "tree_nuts"), false, "coconut is not a tree nut here");
assert.equal(containsAllergen("2 tbsp peanut butter", "tree_nuts"), false, "peanut is not a tree nut");
assert.equal(containsAllergen("1 cup almonds", "peanuts"), false);
assert.equal(containsAllergen("chicken satay skewers", "peanuts"), true);
assert.equal(containsAllergen("toasted sesame oil", "nuts"), false, "sesame stays out of the nut rule");
for (const key of PROFILE_DIETARY_OPTIONS) {
  const s = accountSafetyFromPreferences([], [key]);
  assert.ok(s.allergens.length + s.dietary.length > 0, `dietary restriction ${key} is enforced`);
}

// ---- Server merge unions and never drops account entries ----
const safety = accountSafetyFromPreferences(["peanuts", "sesame"], ["vegetarian"]);
assert.deepEqual(safety, { allergens: ["peanut", "sesame"], dietary: ["peanutFree", "vegetarian"] });
const merged = mergeAccountSafetyIntoBody(
  { crew_size: 6, allergens_to_avoid: ["dairy"], dietary_restrictions: ["dairyFree", "bogus"] },
  safety,
) as Record<string, unknown>;
assert.deepEqual(merged.allergens_to_avoid, ["peanut", "sesame", "dairy"]);
assert.deepEqual(merged.dietary_restrictions, ["peanutFree", "vegetarian", "dairyFree"]);
assert.equal(merged.crew_size, 6);
const noClient = mergeAccountSafetyIntoBody({}, safety) as Record<string, unknown>;
assert.deepEqual(noClient.allergens_to_avoid, ["peanut", "sesame"], "missing client list still gets account allergens");
const flood = mergeAccountSafetyIntoBody({ allergens_to_avoid: Array.from({ length: 20 }, (_, i) => `x${i}`) }, safety) as {
  allergens_to_avoid: string[];
};
assert.equal(flood.allergens_to_avoid.length, 12);
assert.deepEqual(flood.allergens_to_avoid.slice(0, 2), ["peanut", "sesame"], "account entries survive the cap");
const empty = { a: 1 };
assert.equal(mergeAccountSafetyIntoBody(empty, { allergens: [], dietary: [] }), empty);

// ---- Generator chips include account restrictions even with device prefs ----
const prefs = { dietary_restrictions: ["gluten", "vegan"], allergies: ["dairy", "peanuts"] } as unknown as UserPreferences;
const filters = resolveGeneratorFilters({
  personal: { allergens: ["shellfish"] } as never,
  session: null,
  preferences: prefs,
  hall: null,
  hallLinked: false,
});
assert.deepEqual([...filters.allergens].sort(), ["dairy", "gluten", "shellfish"]);
assert.ok(filters.diets.includes("vegan"));

// ---- Every allergy leaves a usable catalog pool ----
const recipes = getApprovedCatalog()
  .recipes.map((r) => resolveShoppingRecipe(r.slug))
  .filter((r): r is NonNullable<typeof r> => Boolean(r));
assert.ok(recipes.length > 300, `catalog loaded (${recipes.length})`);
const pools: Record<string, number> = {};
for (const key of PROFILE_ALLERGY_OPTIONS) {
  const allergen = accountSafetyFromPreferences([key], []).allergens;
  pools[key] = recipes.filter(
    (r) =>
      !scanRecipeForAllergens(
        r.ingredients.map((i) => ({ item: i.name, amount: String(i.quantity ?? ""), notes: i.notes })),
        [],
        r.title,
        allergen,
      ).found,
  ).length;
  assert.ok(pools[key]! >= 40, `${key} leaves at least 40 recipes (got ${pools[key]})`);
}
console.log(`[test-account-allergy-safety] pool sizes of ${recipes.length}:`, pools);
console.log("[test-account-allergy-safety] OK");
process.exit(0);
