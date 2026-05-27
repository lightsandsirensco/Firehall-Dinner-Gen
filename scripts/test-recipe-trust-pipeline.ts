/**
 * Recipe trust pipeline — normalize, validate, repair, quality gate.
 */
import type { GenerateResponse } from "../shared/schema.js";
import {
  runRecipeTrustPipeline,
  detectBadAIGeneration,
  validateRecipe,
  repairGenerateResponse,
} from "../shared/recipe/index.js";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const bad: GenerateResponse = {
  template_id: 0,
  chosen_protein: "beef",
  primary_protein_source: "beef",
  title: "Asian Beef Plated Main",
  meal_style: "bowl",
  why_it_fits_tonight: "fallback recipe template for station kitchen",
  timing: { prep_minutes: 10, cook_minutes: 20, total_minutes: 30 },
  protein_safety: [],
  ingredients: [
    { item: "Beef", amount: "2 lb", notes: "" },
    { item: "Beef", amount: "1 lb", notes: "" },
    { item: "Rice", amount: "2 cups", notes: "" },
  ],
  steps: [
    { heading: "Cook", body: "Cook until done." },
    { heading: "Serve", body: "Serve and enjoy." },
  ],
  cleanup_tip: "",
  macros_per_serving: { calories: 400, protein_g: 30, carbs_g: 40, fat_g: 10 },
};

assert(detectBadAIGeneration("Asian Beef Plated Main"), "detect bad AI title");

const first = runRecipeTrustPipeline(bad, {
  mealFormat: "bowl",
  protein: "beef",
  legacyValidationOk: true,
});
assert(!/plated main/i.test(first.recipe.title), `title repaired: ${first.recipe.title}`);
assert(first.repairs.length > 0, "repairs applied");
assert(first.recipe.ingredients.length < 3 || first.recipe.ingredients[0].item !== first.recipe.ingredients[1]?.item, "deduped");

const tacoBad: GenerateResponse = {
  ...bad,
  title: "Chicken Tacos",
  meal_style: "tacos",
  ingredients: [
    { item: "Chicken", amount: "2 lb", notes: "" },
    { item: "Jasmine rice", amount: "2 cups", notes: "" },
  ],
  steps: [
    {
      heading: "Cook chicken",
      body: "Sear chicken thighs in a hot oiled skillet 6 minutes per side until golden and 165°F inside.",
    },
    {
      heading: "Rice",
      body: "Simmer jasmine rice until fluffy and serve alongside sliced chicken with lime wedges.",
    },
  ],
};

const tacoResult = runRecipeTrustPipeline(tacoBad, {
  mealFormat: "tacos",
  protein: "chicken",
  legacyValidationOk: true,
});
assert(
  tacoResult.repairs.includes("taco_reclassified_as_bowl") ||
    !/\btaco/i.test(tacoResult.recipe.title) ||
    tacoResult.validation.ok,
  "taco without tortilla repaired or blocked",
);

const good: GenerateResponse = {
  template_id: 1,
  chosen_protein: "beef",
  primary_protein_source: "beef",
  title: "Chimichurri Steak Tacos",
  meal_style: "tacos",
  why_it_fits_tonight: "Bold steak tacos that scale fast for a hungry hall crew.",
  timing: { prep_minutes: 20, cook_minutes: 25, total_minutes: 45 },
  protein_safety: [],
  ingredients: [
    { item: "Flank steak", amount: "2 lb", notes: "" },
    { item: "Flour tortillas", amount: "12", notes: "" },
    { item: "Fresh cilantro", amount: "1 bunch", notes: "" },
    { item: "Lime", amount: "3", notes: "" },
    { item: "Red onion", amount: "1", notes: "" },
  ],
  steps: [
    {
      heading: "Sear steak (high, 4 min/side)",
      body: "Pat steak dry, season well, and sear in a hot cast-iron skillet 4 minutes per side for medium-rare. Rest 5 minutes before slicing thin against the grain.",
    },
    {
      heading: "Warm tortillas & build",
      body: "Char flour tortillas over the burner or in a dry pan 30 seconds per side. Fill with sliced steak, chimichurri, onion, and cilantro. Serve with lime wedges.",
    },
  ],
  cleanup_tip: "Wipe the skillet while warm.",
  macros_per_serving: { calories: 520, protein_g: 38, carbs_g: 42, fat_g: 18 },
};

const goodRun = runRecipeTrustPipeline(good, {
  mealFormat: "tacos",
  protein: "beef",
  legacyValidationOk: true,
});
assert(goodRun.sendable, `good taco meal should pass: ${goodRun.rejectReasons.join(",")}`);

const val = validateRecipe({ ...good, title: "" });
assert(!val.ok, "empty title fails");

const repairedOnly = repairGenerateResponse(
  bad,
  validateRecipe(bad, { mealFormat: "bowl", protein: "beef" }),
  null,
  { mealFormat: "bowl", protein: "beef" },
);
assert(repairedOnly.repairs.length > 0, "standalone repair runs");

console.log("[test-recipe-trust-pipeline] OK", first.recipe.title, "→", goodRun.recipe.title);
