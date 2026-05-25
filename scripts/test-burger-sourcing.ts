/**
 * Burger sourcing: imported publisher steps must be preserved (not soup filler).
 */
import { buildGenerateResponseFromDraft } from "../server/ingestion/build-generate-response.js";
import { resolveMealBuildSteps } from "../server/meal-instructions.js";
import type { IngestRecipeDraft } from "../shared/ingestion/recipe-ingest-schema.js";

const draft: IngestRecipeDraft = {
  fingerprint: "test-burger-fp",
  source: "publisher",
  title: "Classic Hall Burgers",
  summary: "Real blog recipe for burger night.",
  heroImage: "https://example.com/burger.jpg",
  imageAlt: "Burgers",
  ingredients: [
    { name: "Ground beef", amount: 2, unit: "lb", original: "2 lb ground beef" },
    { name: "Burger buns", amount: 6, unit: "", original: "6 buns" },
  ],
  steps: [
    { number: 1, step: "Form ground beef into patties slightly wider than the buns." },
    { number: 2, step: "Grill patties over medium-high heat 4 minutes per side until 160°F inside." },
    { number: 3, step: "Toast buns on the grill, then assemble burgers with cheese." },
  ],
  cuisine: "american",
  protein: "beef",
  mealFormat: "burger",
  mealArchetype: "sandwich_night",
  prepMinutes: 10,
  totalMinutes: 25,
  cleanupDifficulty: 2,
  servingsBase: 6,
  exploreCategories: ["crew_favorite"],
  tags: ["burger"],
  comfortScore: 70,
  healthyScore: 40,
  firehallSuitabilityScore: 80,
  appetiteScore: 75,
  qualityScore: 72,
  trendScore: 60,
  sourceName: "Serious Eats",
  sourceUrl: "https://www.seriouseats.com/burger-recipe",
  license: "partner",
  curatedSlug: "classic-hall-burgers-test",
};

const recipe = buildGenerateResponseFromDraft(draft);
if (!recipe._imported || !recipe._preserve_source_steps) {
  throw new Error("Publisher draft must be marked imported with preserved steps");
}

const steps = resolveMealBuildSteps(recipe, "burger", 6, recipe._recipe_source);
const text = steps.map((s) => `${s.heading} ${s.body}`).join(" ");

if (/gentle bubble/i.test(text)) throw new Error("Publisher burger must not get soup filler");
if (!/\b(patt|burger|grill|160)/i.test(text)) {
  throw new Error("Publisher burger steps must mention patty/burger/grill");
}
if (!/Ground beef/i.test(text)) throw new Error("Must reference ground beef from import");

console.log("[test-burger-sourcing] OK — preserved imported burger flow");
