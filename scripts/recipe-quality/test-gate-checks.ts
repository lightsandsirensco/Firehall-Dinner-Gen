#!/usr/bin/env tsx
/**
 * Quality gate unit tests: each check must catch its known-bad fixture and
 * pass a clean recipe.
 *
 *   npx tsx scripts/recipe-quality/test-gate-checks.ts
 */
import assert from "node:assert/strict";
import {
  checkFoodSafety,
  checkImages,
  checkIngredientInstructionConsistency,
  checkNutrition,
  checkPresentation,
  checkQuantities,
  checkRequiredFields,
  checkServingScaling,
  internalTemps,
  isTechnicallyValidated,
  parseQuantity,
  type GateFinding,
  type QualityRecipe,
} from "./gate-checks.js";
import { resolveReviewState, resolveReviewStatus } from "./review-status.js";

const clean: QualityRecipe = {
  slug: "lemon-chicken-tray",
  title: "Sheet-Pan Lemon Chicken",
  description: "Juicy lemon-garlic chicken thighs roasted with potatoes on one pan — easy to scale for the whole crew.",
  mealType: "dinner",
  baseServings: 8,
  crewSize: 8,
  prepTime: 15,
  cookTime: 40,
  ingredients: [
    { name: "Boneless chicken thighs", quantity: "4", unit: "lb" },
    { name: "Yukon Gold potatoes", quantity: "3", unit: "lb" },
    { name: "Garlic", quantity: "6", unit: "cloves" },
    { name: "Lemons", quantity: "2", unit: "whole" },
    { name: "Olive oil", quantity: "1/4", unit: "cup" },
    { name: "Kosher salt", quantity: "1 1/2", unit: "tsp" },
  ],
  steps: [
    { title: "Heat oven", instruction: "Heat the oven to 425°F (220°C). Cut potatoes into 1-inch chunks." },
    { title: "Season", instruction: "Toss chicken and potatoes with olive oil, garlic, lemon juice and salt on two sheet pans." },
    { title: "Roast", instruction: "Roast 35–40 minutes until the potatoes are golden and the chicken reads 165°F (74°C) in the thickest piece." },
  ],
  heroImage: "/images/lemon-chicken.jpg",
  nutrition: { calories: 520, protein: 42, carbs: 30, fat: 26, source: "calculated" },
};

const codes = (f: GateFinding[]) => f.map((x) => x.code);
let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

console.log("recipe quality gate");

test("clean recipe passes every check and is technically validated", () => {
  const all = [
    ...checkRequiredFields(clean),
    ...checkIngredientInstructionConsistency(clean),
    ...checkQuantities(clean),
    ...checkServingScaling(clean),
    ...checkNutrition(clean, { numericFilterEligible: true, labeledHighProtein: true }),
    ...checkFoodSafety(clean),
    ...checkImages({ heroExists: true, width: 1536, height: 1024 }),
    ...checkPresentation(clean, { titleScore: 90 }),
  ];
  assert.deepEqual(codes(all), []);
  assert.equal(isTechnicallyValidated(all), true);
});

test("parseQuantity handles fractions, unicode, ranges and units", () => {
  assert.equal(parseQuantity("1 1/2"), 1.5);
  assert.equal(parseQuantity("1½"), 1.5);
  assert.equal(parseQuantity("2-3"), 3);
  assert.equal(parseQuantity("3 cups"), 3);
  assert.equal(parseQuantity("a few"), null);
});

test("required fields: missing servings, times, hero", () => {
  const f = checkRequiredFields({ ...clean, baseServings: undefined, prepTime: undefined, heroImage: undefined, steps: clean.steps.slice(0, 2) });
  assert.ok(codes(f).includes("missing_servings"));
  assert.ok(codes(f).includes("missing_prep_time"));
  assert.ok(codes(f).includes("missing_hero_image"));
  assert.ok(codes(f).includes("too_few_steps"));
});

test("ingredient/instruction: unused ingredient and step ingredient not listed", () => {
  const f = checkIngredientInstructionConsistency({
    ...clean,
    ingredients: [...clean.ingredients, { name: "Fresh thyme", quantity: "2", unit: "tbsp" }],
    steps: [...clean.steps, { instruction: "Serve over steamed rice with the pan juices spooned over." }],
  });
  assert.ok(codes(f).includes("ingredient_not_in_steps"));
  assert.match(f.find((x) => x.code === "ingredient_not_in_steps")!.evidence!, /thyme/i);
  assert.match(f.find((x) => x.code === "step_ingredient_not_listed")!.evidence!, /rice/);
});

test("quantities: missing, raw decimal, fractional whole items", () => {
  const f = checkQuantities({
    ...clean,
    ingredients: [
      { name: "Hoisin sauce", quantity: "0.33", unit: "cup" },
      { name: "Rotisserie chickens", quantity: "3.2", unit: "each" },
      { name: "Parmesan" },
      { name: "Yellow onion", quantity: "3/4", unit: "whole" },
    ],
  });
  assert.ok(codes(f).includes("awkward_decimal_quantity"));
  assert.ok(codes(f).includes("fractional_count"));
  assert.ok(codes(f).includes("missing_quantity"));
  assert.doesNotMatch(f.find((x) => x.code === "fractional_count")!.evidence!, /onion/);
});

test("scaling: protein portion and rolls per person", () => {
  const heavy = checkServingScaling({ ...clean, ingredients: [{ name: "Chuck roast", quantity: "10", unit: "lb" }, { name: "Hoagie rolls", quantity: "24", unit: "count" }] });
  assert.ok(codes(heavy).includes("protein_portion_high"));
  assert.ok(codes(heavy).includes("count_per_person_high"));
  const tacos = checkServingScaling({ ...clean, ingredients: [{ name: "Corn tortillas", quantity: "24", unit: "whole" }] });
  assert.ok(!codes(tacos).includes("count_per_person_high"), "3 tortillas per person is normal");
});

test("nutrition: macro mismatch, estimate, unverified High Protein", () => {
  const f = checkNutrition({ ...clean, nutrition: { calories: 900, protein: 20, carbs: 30, fat: 10, source: "estimated" } }, { labeledHighProtein: true, numericFilterEligible: false });
  assert.ok(codes(f).includes("nutrition_macro_energy_mismatch"));
  assert.ok(codes(f).includes("nutrition_not_calculated"));
  assert.ok(codes(f).includes("high_protein_claim_unverified"));
  const low = checkNutrition({ ...clean, nutrition: { calories: 300, protein: 12, carbs: 40, fat: 9, source: "calculated" } }, { labeledHighProtein: true, numericFilterEligible: true });
  assert.ok(codes(low).includes("high_protein_claim_below_threshold"));
});

test("food safety: poultry temps, ground meat, vegetarian claim, thawing", () => {
  const noTemp = checkFoodSafety({ ...clean, steps: [{ instruction: "Sear the chicken in olive oil until golden on both sides." }] });
  assert.ok(codes(noTemp).includes("poultry_no_internal_temp"));
  const low = checkFoodSafety({ ...clean, steps: [{ instruction: "Sear in olive oil until golden and 160°F; rest and slice." }] });
  assert.ok(codes(low).includes("poultry_temp_below_165"));
  const ground = checkFoodSafety({ ...clean, ingredients: [{ name: "Ground beef", quantity: "3", unit: "lb" }], steps: [{ instruction: "Brown the beef in a skillet, breaking it up." }] });
  assert.ok(codes(ground).includes("ground_meat_no_safe_temp"));
  const veg = checkFoodSafety({ ...clean, ingredients: [{ name: "Breakfast sausage or chorizo", quantity: "1 1/2", unit: "lb" }] }, { vegetarianClaim: "title" });
  assert.ok(codes(veg).includes("vegetarian_title_contains_meat"));
  const thaw = checkFoodSafety({ ...clean, steps: [...clean.steps, { instruction: "Thaw the chicken on the counter for a few hours." }] });
  assert.ok(codes(thaw).includes("thaw_at_room_temp"));
  const rare = checkFoodSafety({ ...clean, steps: [...clean.steps, { instruction: "Grill the flank steak to 125–130°F for medium-rare." }] });
  assert.ok(codes(rare).includes("doneness_below_usda_default"));
  const pref = checkFoodSafety({ ...clean, steps: [...clean.steps, { instruction: "Grill to 145°F and rest 3 minutes; pull at 130°F for medium-rare." }] });
  assert.ok(!codes(pref).includes("doneness_below_usda_default"));
  const reverseSear = checkFoodSafety({ ...clean, steps: [...clean.steps, { instruction: "Smoke at 225°F until it reaches 130°F." }, { instruction: "Sear hard until it reads 145°F; rest 3 minutes." }] });
  assert.ok(!codes(reverseSear).includes("doneness_below_usda_default"));
  const veggieWorcestershire = checkFoodSafety({ ...clean, ingredients: [{ name: "vegetarian (anchovy-free) Worcestershire sauce", quantity: "1", unit: "tbsp" }] }, { vegetarianClaim: "tag" });
  assert.ok(!codes(veggieWorcestershire).includes("vegetarian_tag_contains_meat"));
});

test("internal temperature detection ignores oven and holding temperatures", () => {
  assert.deepEqual(internalTemps("Bake at 375°F 20 minutes. Hold in a 200°F oven."), []);
  assert.deepEqual(internalTemps("Cook until the chicken reads 165°F."), [165]);
});

test("images: missing hero blocks validation", () => {
  const f = checkImages({ heroExists: false });
  assert.ok(codes(f).includes("hero_file_missing"));
  assert.equal(isTechnicallyValidated(f), false);
});

test("presentation: stated time far shorter than the steps", () => {
  const f = checkPresentation({ ...clean, prepTime: 5, cookTime: 10, steps: [{ instruction: "Roast 45 minutes." }, { instruction: "Rest 15 minutes, then slice." }] });
  assert.ok(codes(f).includes("stated_time_understates_steps"));
});

test("review status: automation stops at technically_validated", () => {
  assert.equal(resolveReviewStatus({ slug: "x", isPublic: true, technicallyValidated: true, log: [] }), "technically_validated");
  assert.equal(resolveReviewStatus({ slug: "x", isPublic: true, technicallyValidated: false, log: [] }), "needs_review");
  assert.equal(resolveReviewStatus({ slug: "x", isPublic: false, technicallyValidated: true, log: [] }), "draft");
});

test("review status: publishing needs culinary review, not kitchen testing", () => {
  const reviewed = [{ slug: "x", status: "culinary_reviewed" as const, by: "Chef R.", date: "2026-11-20", notes: "Checked technique, seasoning, portions" }];
  assert.equal(resolveReviewStatus({ slug: "x", isPublic: true, technicallyValidated: true, log: reviewed }), "culinary_reviewed");
  const approved = [...reviewed, { slug: "x", status: "approved_for_publishing" as const, by: "Editor", date: "2026-11-21", notes: "Signed off" }];
  const state = resolveReviewState({ slug: "x", isPublic: true, technicallyValidated: true, log: approved });
  assert.deepEqual(state, { status: "approved_for_publishing", kitchenTested: false });
  const approvalOnly = [{ slug: "x", status: "approved_for_publishing" as const, by: "Editor", date: "2026-11-21", notes: "Signed off" }];
  assert.equal(resolveReviewStatus({ slug: "x", isPublic: true, technicallyValidated: true, log: approvalOnly }), "technically_validated", "approval without culinary review doesn't count");
  assert.equal(resolveReviewStatus({ slug: "x", isPublic: true, technicallyValidated: false, log: approved }), "needs_review", "a failing recipe drops back regardless of the log");
});

test("review status: kitchen testing is an optional badge", () => {
  const tested = [{ slug: "x", status: "kitchen_tested" as const, by: "Capt. Smith", date: "2026-11-20", notes: "Cooked for 8; 50 min actual" }];
  assert.deepEqual(resolveReviewState({ slug: "x", isPublic: true, technicallyValidated: true, log: tested }), { status: "technically_validated", kitchenTested: true });
});

console.log(`\n${passed} passed`);
