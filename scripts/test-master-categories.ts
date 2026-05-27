/**
 * Master category system — definitions, assignment, indexing, imagery, explore bridge.
 */
import {
  validateAllMasterCategoryDefinitions,
  assignMasterCategories,
  assignFromGenerateResponse,
  buildStarterAssignmentsForClassics,
  rankCategoriesForRecipe,
  buildRecommendationIndexEntry,
  getDiscoverySectionsWithMasterCategories,
  enrichImageryContextFromCategories,
  imageMatchConfidence,
  MASTER_CATEGORY_IDS,
} from "../shared/categories/index.js";
import { buildFoodImageryPromptSpec } from "../shared/food-imagery/prompt-builder.js";
import type { GenerateResponse } from "../shared/schema.js";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const defs = validateAllMasterCategoryDefinitions();
assert(defs.ok, `definitions invalid: ${defs.errors.join("; ")}`);
assert(MASTER_CATEGORY_IDS.length === 12, "12 master categories");

const classics = buildStarterAssignmentsForClassics();
assert(classics.length >= 10, "hall classics starter assignments");
assert(
  classics.every((c) => c.classification.assignment.source === "curated"),
  "classics use curated source",
);
assert(
  classics.find((c) => c.meal.slug === "steak-tacos")?.classification.primary === "firehall_classics",
  "steak tacos primary is classics",
);

const quick = rankCategoriesForRecipe({
  title: "Garlic Ginger Chicken Stir-Fry",
  mealFormat: "stir_fry",
  totalMinutes: 28,
  protein: "chicken",
});
assert(
  quick[0]?.categoryId === "quick_shift_meals" || quick[1]?.categoryId === "quick_shift_meals",
  `quick meal ranks quick_shift: top=${quick[0]?.categoryId}`,
);

const badTitle: GenerateResponse = {
  template_id: 0,
  chosen_protein: "beef",
  primary_protein_source: "beef",
  title: "Asian Beef Plated Main",
  meal_style: "bowl",
  why_it_fits_tonight: "test",
  timing: { prep_minutes: 10, cook_minutes: 20, total_minutes: 30 },
  protein_safety: [],
  ingredients: [
    { item: "Beef", amount: "2 lb", notes: "" },
    { item: "Rice", amount: "2 cups", notes: "" },
    { item: "Broccoli", amount: "1 head", notes: "" },
    { item: "Garlic", amount: "4 cloves", notes: "" },
  ],
  steps: [
    { heading: "Cook", body: "Sear beef in a hot skillet until browned and cooked through, then serve over rice with broccoli." },
    { heading: "Serve", body: "Plate for the crew and serve hot while the garlic and sauce still smell incredible." },
  ],
  cleanup_tip: "",
  macros_per_serving: { calories: 400, protein_g: 30, carbs_g: 40, fat_g: 10 },
};

const assigned = assignFromGenerateResponse(badTitle, "test:bad");
assert(assigned.primary !== "comfort_food" || assigned.scores[0].score > 0, "bad title still classifies");

const index = buildRecommendationIndexEntry({
  recipeKey: "curated:steak-tacos",
  curatedSlug: "steak-tacos",
  title: "Chimichurri Steak Tacos",
  mealFormat: "tacos",
  protein: "beef",
});
assert(index.vector.length === 12, "12-dim recommendation vector");
assert(index.primaryCategoryId === "firehall_classics", "steak-tacos index primary");

const sections = getDiscoverySectionsWithMasterCategories();
assert(sections.length > 0, "explore sections enriched");
assert(sections.every((s) => s.masterCategoryId), "each section has master category");

const imagery = buildFoodImageryPromptSpec({
  recipeKey: "curated:smash-burgers",
  title: "Double Smash Burgers",
  mealFormat: "burger",
  protein: "beef",
  cuisine: "american",
});
assert(imagery.mood.length > 10, "category mood in spec");
assert(/burger|grill|game/i.test(imagery.positive.toLowerCase()), "imagery prompt reflects category");

const imgMatch = imageMatchConfidence(
  "Chimichurri Steak Tacos",
  "tacos",
  "/images/classics/steak-tacos.jpg",
  "firehall_classics",
);
assert(imgMatch.pass, "taco hero matches taco title");

const mismatch = imageMatchConfidence(
  "Garlic Butter Skillet With Quinoa",
  "skillet",
  "/images/classics/steak-tacos.jpg",
  "quick_shift_meals",
);
assert(!mismatch.pass, "taco image conflicts with skillet title");

console.log("[test-master-categories] OK", classics.length, "classics indexed");
