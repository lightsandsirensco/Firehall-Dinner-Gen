/**
 * Canonical recipe schema — parse, normalize, adapter round-trip.
 */
import {
  firehallRecipeFromGenerateResponse,
  firehallRecipeToGenerateResponse,
  parseFirehallRecipe,
  scoreFirehallRecipeQuality,
  normalizeTitle,
  coerceProtein,
} from "../shared/recipe/index.js";
import type { GenerateResponse } from "../shared/schema.js";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const legacy: GenerateResponse = {
  template_id: 1,
  chosen_protein: "beef",
  primary_protein_source: "beef",
  title: "Asian Beef Plated Main",
  meal_style: "bowl",
  why_it_fits_tonight: "Feeds the crew after a long shift with bold flavors.",
  timing: { prep_minutes: 15, cook_minutes: 25, total_minutes: 40 },
  protein_safety: [],
  ingredients: [
    { item: "Flank steak", amount: "2 lb", notes: "" },
    { item: "Garlic cloves", amount: "6", notes: "" },
    { item: "Jasmine rice", amount: "2 cups", notes: "" },
  ],
  steps: [
    {
      heading: "Sear steak",
      body: "Pat steak dry and sear in a hot skillet 4 minutes per side until browned.",
    },
    {
      heading: "Finish rice",
      body: "Simmer jasmine rice until fluffy and serve with sliced steak and garlic.",
    },
  ],
  cleanup_tip: "Wipe the skillet while warm.",
  macros_per_serving: { calories: 520, protein_g: 38, carbs_g: 42, fat_g: 18 },
  tags: {
    cuisine: "asian",
    cooking_method: "stovetop",
    base_carb: "rice",
    key_ingredients: ["garlic", "steak"],
    high_protein: true,
    high_fiber: false,
    quick_cleanup: true,
  },
};

const parsed = firehallRecipeFromGenerateResponse(legacy, { crewSize: 8 });
assert(parsed.ok, `parse failed: ${!parsed.ok ? parsed.errors.join("; ") : ""}`);
const canonical = parsed.data;

assert(!/plated main/i.test(canonical.identity.title), "title should be normalized");
assert(canonical.classification.protein === "beef", "protein coerced");
assert(canonical.ingredients.length >= 3, "ingredients preserved");
assert(canonical.system.schemaVersion === 1, "schema version");

const roundTrip = firehallRecipeToGenerateResponse(canonical);
assert(roundTrip.title === canonical.identity.title, "round-trip title");
assert(roundTrip.ingredients.length === canonical.ingredients.length, "round-trip ingredients");

const quality = scoreFirehallRecipeQuality({ recipe: canonical });
assert(quality.composite > 0, "quality composite computed");
assert(typeof quality.titleQuality === "number", "title dimension");

const bad = parseFirehallRecipe({ title: "x" });
assert(!bad.ok, "malformed input should fail safely");

assert(normalizeTitle("  protein   bowl  ") !== "protein bowl", "normalizeTitle improves weak titles");
assert(coerceProtein("ground beef") === "beef", "coerceProtein");

console.log("[test-canonical-recipe-schema] OK", canonical.identity.title);
