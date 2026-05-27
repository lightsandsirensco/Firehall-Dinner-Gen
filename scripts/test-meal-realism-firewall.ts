/**
 * Meal realism firewall — reject fake AI meals, accept recognizable dishes.
 */

import { evaluateMealRealismFirewall } from "../shared/meal-realism-firewall.js";
import type { GenerateResponse } from "../shared/schema.js";

function stub(title: string, ingredients: string[] = [], mealStyle = "bowl"): GenerateResponse {
  return {
    template_id: 0,
    chosen_protein: "chicken",
    title,
    meal_style: mealStyle,
    why_it_fits_tonight: "",
    timing: { prep_minutes: 10, cook_minutes: 20, total_minutes: 30 },
    protein_safety: [],
    ingredients: ingredients.map((item) => ({ item, amount: "1 cup" })),
    steps: [
      { heading: "Cook", body: `Prepare ${title} until done.` },
      { heading: "Serve", body: "Plate and serve hot." },
    ],
    cleanup_tip: "",
    macros_per_serving: { calories: 400, protein_g: 30, carbs_g: 40, fat_g: 12 },
    budget_level: "standard",
    budget_tips: [],
    pro_tips: [],
    tags: { cuisine: "American", cooking_method: "skillet", base_carb: "rice", key_ingredients: [] },
    ingredients_used: [],
    extra_items_needed: [],
  };
}

const BAD: Array<{ name: string; recipe: GenerateResponse }> = [
  { name: "fireball chickpea plates", recipe: stub("Fireball Chickpea Plates", ["chickpeas", "broccoli", "quinoa"]) },
  {
    name: "cajun chickpea wrap mashup",
    recipe: stub("Cajun Chickpea Wraps with Broccoli Rice", ["chickpea", "broccoli", "rice", "wrap"], "wrap"),
  },
  {
    name: "protein bowl slop",
    recipe: stub("High-Protein Wellness Bowl", ["oats", "chia", "kale", "quinoa"], "bowl"),
  },
  {
    name: "teriyaki burger mash",
    recipe: stub("Teriyaki Smash Burgers with Mashed Potatoes", ["ground beef", "bun", "mashed potatoes", "teriyaki"], "burger"),
  },
];

const GOOD: Array<{ name: string; recipe: GenerateResponse }> = [
  { name: "smash burgers", recipe: stub("Smash Burgers with Dirty Fries", ["ground beef", "brioche bun", "american cheese", "fries"], "burger") },
  { name: "nashville hot", recipe: stub("Nashville Hot Chicken Sandwiches", ["chicken breast", "brioche bun", "pickles", "hot oil"], "sandwich") },
  { name: "birria tacos", recipe: stub("Birria Tacos with Consommé", ["beef chuck", "corn tortillas", "queso", "onion"], "tacos") },
  { name: "bbq mac", recipe: stub("BBQ Pulled Pork Mac and Cheese", ["pulled pork", "macaroni", "cheddar", "bbq sauce"], "pasta") },
  { name: "cajun alfredo", recipe: stub("Cajun Chicken Alfredo", ["chicken", "penne", "cream", "cajun seasoning"], "pasta") },
];

let failed = 0;

for (const { name, recipe } of BAD) {
  const r = evaluateMealRealismFirewall(recipe);
  if (r.pass) {
    console.error(`FAIL: should reject "${name}" but passed (score=${r.score})`);
    failed++;
  } else {
    console.log(`OK reject: ${name} → ${r.logTags.join(" ")}`);
  }
}

for (const { name, recipe } of GOOD) {
  const r = evaluateMealRealismFirewall(recipe);
  if (!r.pass) {
    console.error(`FAIL: should pass "${name}" but rejected (score=${r.score}) ${r.logTags.join(" ")}`);
    failed++;
  } else {
    console.log(`OK pass: ${name} (score=${r.score})`);
  }
}

if (failed > 0) {
  process.exit(1);
}
console.log("[test-meal-realism-firewall] All checks passed.");
