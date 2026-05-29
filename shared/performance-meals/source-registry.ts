/**
 * Internal inspiration registry — 100 candidates, 50 selected for publish.
 * NOT exposed on public recipe pages (copyright + editorial policy).
 */

import type { PerformanceSourceRecord } from "./types.js";
import { PERFORMANCE_CANDIDATE_COUNT, PERFORMANCE_MEAL_COUNT } from "./types.js";

function cand(
  id: string,
  publisher: PerformanceSourceRecord["publisher"],
  sourceUrl: string,
  inspirationTitle: string,
  category: string,
  nutritionProfile: PerformanceSourceRecord["nutritionProfile"],
  adaptationNotes: string,
  selected: boolean,
  firehallSlug?: string,
  selectionScore?: number,
  selectionRationale?: string,
): PerformanceSourceRecord {
  return {
    id,
    publisher,
    sourceUrl,
    inspirationTitle,
    category,
    nutritionProfile,
    adaptationNotes,
    selected,
    firehallSlug,
    selectionScore,
    selectionRationale,
  };
}

/** Phase 1: 100 trusted-source candidates */
export const PERFORMANCE_SOURCE_CANDIDATES: PerformanceSourceRecord[] = [
  // ── Skinnytaste (high protein / practical) ──
  cand("st-01", "Skinnytaste", "https://www.skinnytaste.com/lemon-garlic-chicken/", "Lemon Garlic Chicken", "sheet_pan", "high_protein", "Hall tray bake, hold in oven, crew 8", true, "lemon-garlic-chicken-tray", 92, "One pan, strong flavor, scales"),
  cand("st-02", "Skinnytaste", "https://www.skinnytaste.com/baked-salmon/", "Baked Salmon with Herbs", "sheet_pan", "omega3_forward", "Oven hold, portion on sheet pans", true, "herb-baked-salmon-tray", 90, "Lean protein, low mess"),
  cand("st-03", "Skinnytaste", "https://www.skinnytaste.com/turkey-chili/", "Turkey Chili", "slow_cooker", "high_protein", "Double batch crock, line optional", true, "lean-turkey-bean-chili", 91, "Batch classic, high protein"),
  cand("st-04", "Skinnytaste", "https://www.skinnytaste.com/chicken-fajitas/", "Chicken Fajitas", "sheet_pan", "balanced", "Two half-sheet pans for even char", true, "sheet-pan-chicken-fajitas-lite", 88, "Already hall-adjacent format"),
  cand("st-05", "Skinnytaste", "https://www.skinnytaste.com/stuffed-peppers/", "Stuffed Peppers", "bake", "balanced", "Batch peppers, reheat friendly", false),
  cand("st-06", "Skinnytaste", "https://www.skinnytaste.com/egg-muffins/", "Egg Muffins", "breakfast", "high_protein", "Muffin tin batch", true, "turkey-sausage-egg-muffins", 86, "Grab-and-go shift breakfast"),
  cand("st-07", "Skinnytaste", "https://www.skinnytaste.com/shrimp-scampi/", "Shrimp Scampi", "pasta", "lean_comfort", "Skillet, fast after calls", true, "lemon-garlic-shrimp-pasta", 87, "Quick protein pasta"),
  cand("st-08", "Skinnytaste", "https://www.skinnytaste.com/turkey-meatballs/", "Turkey Meatballs", "bake", "high_protein", "Sheet pan bake + marinara", true, "baked-turkey-meatball-marinara", 89, "Crowd pleaser, lean"),
  cand("st-09", "Skinnytaste", "https://www.skinnytaste.com/cottage-cheese-pasta/", "High Protein Pasta", "pasta", "high_protein", "Baked pasta for tray hold", true, "cottage-cheese-protein-pasta", 85, "Comfort without heavy cream"),
  cand("st-10", "Skinnytaste", "https://www.skinnytaste.com/honey-garlic-chicken/", "Honey Garlic Chicken", "skillet", "balanced", "Skillet + rice line", true, "honey-garlic-chicken-rice-bowls", 88, "Sweet-savory bowl line"),
  cand("st-11", "Skinnytaste", "https://www.skinnytaste.com/white-bean-chicken-chili/", "White Bean Chicken Chili", "soup", "high_protein", "Big pot, cup service", true, "white-bean-chicken-chili", 90, "Sippable high protein"),
  cand("st-12", "Skinnytaste", "https://www.skinnytaste.com/greek-chicken/", "Greek Chicken Bowl", "bowl", "balanced", "Line assembly", false),
  cand("st-13", "Skinnytaste", "https://www.skinnytaste.com/zucchini-boats/", "Zucchini Boats", "bake", "low_glycemic", "Low carb option", false),
  cand("st-14", "Skinnytaste", "https://www.skinnytaste.com/salmon-teriyaki/", "Salmon Teriyaki", "bowl", "omega3_forward", "Grill or oven", false),
  cand("st-15", "Skinnytaste", "https://www.skinnytaste.com/turkey-burgers/", "Turkey Burgers", "burger", "high_protein", "Flat-top night", false),

  // ── Serious Eats (technique-forward) ──
  cand("se-01", "Serious Eats", "https://www.seriouseats.com/bulgogi-recipe", "Bulgogi Beef Bowls", "bowl", "high_protein", "Marinate ahead, grill fast", true, "korean-beef-rice-bowls", 88, "Bold flavor, bowl line"),
  cand("se-02", "Serious Eats", "https://www.seriouseats.com/chicken-souvlaki", "Chicken Souvlaki", "grill", "high_protein", "Skewer + pita line", false),
  cand("se-03", "Serious Eats", "https://www.seriouseats.com/turkey-chili", "Turkey Chili", "soup_chili", "high_protein", "Batch pot", false),
  cand("se-04", "Serious Eats", "https://www.seriouseats.com/shakshuka", "Shakshuka", "skillet", "balanced", "One pan eggs", false, undefined, 84, "Brunch niche — reserve"),
  cand("se-05", "Serious Eats", "https://www.seriouseats.com/fish-tacos", "Fish Tacos", "tacos", "omega3_forward", "Cod or tilapia, slaw", true, "crispy-fish-taco-night", 87, "Handheld line, fresh"),
  cand("se-06", "Serious Eats", "https://www.seriouseats.com/lentil-soup", "Lentil Soup", "soup", "plant_forward", "Big pot vegetarian option", true, "smoky-lentil-kale-soup", 83, "Plant forward backup"),
  cand("se-07", "Serious Eats", "https://www.seriouseats.com/grilled-chicken-thighs", "Grilled Chicken Thighs", "grill", "high_protein", "Bulk grill", false),
  cand("se-08", "Serious Eats", "https://www.seriouseats.com/pasta-primavera", "Pasta Primavera", "pasta", "plant_forward", "Veg heavy pasta", false),
  cand("se-09", "Serious Eats", "https://www.seriouseats.com/barbacoa", "Barbacoa", "slow_cooker", "high_protein", "Crock overnight", true, "crock-barbacoa-chicken", 89, "Shred for tacos/bowls"),
  cand("se-10", "Serious Eats", "https://www.seriouseats.com/meatballs", "Baked Meatballs", "bake", "high_protein", "Sheet pan", false),

  // ── Ambitious Kitchen ──
  cand("ak-01", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/chicken-shawarma/", "Chicken Shawarma Bowls", "bowl", "high_protein", "Sheet pan shawarma + rice", true, "shawarma-chicken-rice-bowls", 91, "Meal prep friendly bowls"),
  cand("ak-02", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/honey-lime-chicken/", "Honey Lime Chicken", "sheet_pan", "balanced", "Tray + peppers", true, "honey-lime-chicken-tray", 87, "Bright, not heavy"),
  cand("ak-03", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/turkey-taco-skillet/", "Turkey Taco Skillet", "skillet", "high_protein", "Skillet for busy night", true, "turkey-taco-skillet", 86, "Fast, high protein"),
  cand("ak-04", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/salmon-bowl/", "Salmon Rice Bowl", "bowl", "omega3_forward", "Grain bowl line", true, "maple-soy-salmon-bowls", 88, "Omega-3 + carbs"),
  cand("ak-05", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/paleo-chili/", "Sweet Potato Chili", "slow_cooker", "lean_comfort", "Crock comfort", true, "turkey-sweet-potato-chili", 85, "Comfort with better balance"),
  cand("ak-06", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/chicken-satay/", "Chicken Satay", "grill", "high_protein", "Skewers + peanut sauce", false),
  cand("ak-07", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/quinoa-salad/", "Quinoa Salad", "salad", "plant_forward", "Cold prep", false),
  cand("ak-08", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/banana-pancakes/", "Protein Pancakes", "breakfast", "high_protein", "Batch griddle", false, undefined, 82, "Breakfast overlap — reserve"),
  cand("ak-09", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/lettuce-wraps/", "Asian Lettuce Cups", "handheld", "low_glycemic", "Line build", true, "asian-chicken-lettuce-cups", 84, "Light but satisfying"),
  cand("ak-10", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/burrito-bowl/", "Burrito Bowl", "bowl", "balanced", "Macro bowl", false),

  // ── The Mediterranean Dish ──
  cand("tmd-01", "The Mediterranean Dish", "https://www.themediterraneandish.com/baked-fish/", "Mediterranean Baked Fish", "sheet_pan", "omega3_forward", "Tomato olive bake", true, "mediterranean-baked-fish-tray", 90, "One tray, hall scale"),
  cand("tmd-02", "The Mediterranean Dish", "https://www.themediterraneandish.com/chicken-shawarma/", "Sheet Pan Shawarma", "sheet_pan", "high_protein", "Spiced thighs", false),
  cand("tmd-03", "The Mediterranean Dish", "https://www.themediterraneandish.com/greek-chicken/", "Greek Lemon Chicken", "roast", "high_protein", "Potatoes under chicken", true, "greek-lemon-chicken-potatoes", 91, "Complete tray dinner"),
  cand("tmd-04", "The Mediterranean Dish", "https://www.themediterraneandish.com/moroccan-chicken/", "Moroccan Chicken", "braise", "balanced", "Warm spices", true, "moroccan-chicken-chickpea-tray", 88, "Big flavor, batch"),
  cand("tmd-05", "The Mediterranean Dish", "https://www.themediterraneandish.com/falafel/", "Baked Falafel Bowls", "bowl", "plant_forward", "Oven falafel + tahini", true, "baked-falafel-hall-bowls", 82, "Plant-forward line option"),
  cand("tmd-06", "The Mediterranean Dish", "https://www.themediterraneandish.com/hummus-plate/", "Hummus Chicken Plate", "plated", "balanced", "Platter service", true, "hummus-chicken-platter", 86, "Shareable platter"),
  cand("tmd-07", "The Mediterranean Dish", "https://www.themediterraneandish.com/tabbouleh/", "Tabbouleh Chicken Bowls", "bowl", "balanced", "Herb salad + chicken", true, "tabbouleh-chicken-bowls", 85, "Fresh bowl night"),
  cand("tmd-08", "The Mediterranean Dish", "https://www.themediterraneandish.com/zaatar-chicken/", "Za'atar Chicken", "roast", "high_protein", "Thigh roast", true, "zaatar-roasted-chicken-thighs", 87, "Minimal ingredients"),
  cand("tmd-09", "The Mediterranean Dish", "https://www.themediterraneandish.com/orzo-salmon/", "Salmon Orzo", "pasta", "omega3_forward", "One pot style", true, "lemon-salmon-orzo-skillet", 88, "Complete skillet meal"),
  cand("tmd-10", "The Mediterranean Dish", "https://www.themediterraneandish.com/lentil-soup/", "Mediterranean Lentil Soup", "soup", "plant_forward", "Pot soup", false),

  // ── Mediterranean Living / evidence-based publishers ──
  cand("ml-01", "Mediterranean Living", "https://www.mediterraneanliving.com/recipe/white-bean-soup/", "White Bean Kale Soup", "soup", "plant_forward", "Pot + hold", true, "white-bean-kale-soup", 84, "Fiber + budget friendly"),
  cand("ml-02", "Mediterranean Living", "https://www.mediterraneanliving.com/recipe/chicken-orzo-soup/", "Lemon Chicken Orzo Soup", "soup", "lean_comfort", "Comfort soup", true, "lemon-chicken-orzo-soup", 86, "Post-call friendly"),
  cand("ml-03", "Mediterranean Living", "https://www.mediterraneanliving.com/recipe/quinoa-bowl/", "Quinoa Veg Bowl", "bowl", "plant_forward", "Veg forward", false),
  cand("ew-01", "EatingWell", "https://www.eatingwell.com/recipe/lean-beef-broccoli/", "Beef Broccoli", "stir_fry", "high_protein", "Wok or flat-top", true, "lean-beef-broccoli-rice", 87, "Classic takeout remake"),
  cand("ew-02", "EatingWell", "https://www.eatingwell.com/recipe/turkey-lettuce-wraps/", "Turkey Lettuce Wraps", "handheld", "low_glycemic", "Low carb handheld", true, "turkey-lettuce-wrap-night", 83, "Light dinner option"),
  cand("ew-03", "EatingWell", "https://www.eatingwell.com/recipe/caprese-chicken/", "Caprese Chicken Bake", "bake", "high_protein", "Sheet pan caprese", true, "caprese-chicken-bake", 85, "Low effort bake"),
  cand("ew-04", "EatingWell", "https://www.eatingwell.com/recipe/blackened-fish/", "Blackened Fish Tacos", "tacos", "omega3_forward", "Spiced fish tacos", true, "blackened-cod-taco-night", 86, "Bold fish tacos"),
  cand("ew-05", "EatingWell", "https://www.eatingwell.com/recipe/tuna-white-bean/", "Tuna White Bean Salad", "salad", "high_protein", "No cook protein", false, undefined, 80, "Cold plate — reserve"),

  // ── Bon Appétit / NYT (technique + flavor) ──
  cand("ba-01", "Bon Appétit", "https://www.bonappetit.com/recipe/pesto-chicken/", "Pesto Chicken Tray", "sheet_pan", "balanced", "Tomato pesto roast", true, "pesto-tomato-chicken-tray", 87, "Oven line, colorful"),
  cand("ba-02", "Bon Appétit", "https://www.bonappetit.com/recipe/coconut-curry/", "Coconut Curry Chicken", "one_pot", "balanced", "One pot curry", true, "coconut-curry-chicken-pot", 88, "One pot, holds well"),
  cand("nyt-01", "NYT Cooking", "https://cooking.nytimes.com/recipes/spanish-chicken-rice", "Spanish Chicken & Rice", "one_pot", "balanced", "Chorizo + rice", true, "spanish-chicken-chorizo-rice", 86, "One pot paella vibe"),
  cand("nyt-02", "NYT Cooking", "https://cooking.nytimes.com/recipes/yogurt-marinated-chicken", "Yogurt Marinated Chicken", "grill", "high_protein", "Grill batch", true, "yogurt-marinated-grill-chicken", 89, "Tender grill chicken"),
  cand("nyt-03", "NYT Cooking", "https://cooking.nytimes.com/recipes/lentil-mushroom-ragu", "Lentil Mushroom Bolognese", "pasta", "plant_forward", "Veg pasta night", true, "lentil-mushroom-bolognese", 84, "Plant pasta with depth"),

  // ── Additional candidates (not selected — reserve pool) ──
  cand("st-16", "Skinnytaste", "https://www.skinnytaste.com/acorn-squash/", "Stuffed Acorn Squash", "bake", "balanced", "Seasonal", false),
  cand("st-17", "Skinnytaste", "https://www.skinnytaste.com/butternut-soup/", "Butternut Soup", "soup", "plant_forward", "Blended soup", false),
  cand("st-18", "Skinnytaste", "https://www.skinnytaste.com/tuna-poke/", "Tuna Poke Bowl", "bowl", "omega3_forward", "Raw fish — station risk", false, undefined, 40, "Raw fish logistics"),
  cand("se-11", "Serious Eats", "https://www.seriouseats.com/sous-vide", "Sous Vide Steak", "grill", "high_protein", "Equipment heavy", false, undefined, 35, "Not station practical"),
  cand("se-12", "Serious Eats", "https://www.seriouseats.com/ramen", "Quick Ramen", "soup", "lean_comfort", "Low protein alone", false),
  cand("ak-11", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/smoothie-bowl/", "Smoothie Bowl", "breakfast", "plant_forward", "Not hearty enough", false, undefined, 45, "Too light for dinner"),
  cand("tmd-11", "The Mediterranean Dish", "https://www.themediterraneandish.com/seafood-paella/", "Seafood Paella", "one_pot", "omega3_forward", "Specialty pan", false, undefined, 55, "Pan constraint"),
  cand("ml-04", "Mediterranean Living", "https://www.mediterraneanliving.com/recipe/stuffed-grape-leaves/", "Stuffed Grape Leaves", "appetizer", "plant_forward", "Labor intensive", false, undefined, 50, "Prep time"),
  cand("ew-06", "EatingWell", "https://www.eatingwell.com/recipe/kale-caesar/", "Kale Caesar", "salad", "balanced", "Side only", false),
  cand("ew-07", "EatingWell", "https://www.eatingwell.com/recipe/chia-pudding/", "Chia Pudding", "breakfast", "plant_forward", "Not crew dinner", false),
  cand("ba-03", "Bon Appétit", "https://www.bonappetit.com/recipe/truffle-pasta/", "Truffle Pasta", "pasta", "lean_comfort", "Cost prohibitive", false, undefined, 30, "Budget"),
  cand("nyt-04", "NYT Cooking", "https://cooking.nytimes.com/recipes/duck-confit", "Duck Confit", "roast", "lean_comfort", "Long cook", false, undefined, 40, "Timing"),
  cand("st-19", "Skinnytaste", "https://www.skinnytaste.com/instant-pot-stew/", "Instant Pot Stew", "pressure", "lean_comfort", "IP not universal", false),
  cand("st-20", "Skinnytaste", "https://www.skinnytaste.com/cauliflower-rice/", "Cauliflower Rice Bowl", "bowl", "low_glycemic", "Low satiety risk", false, undefined, 55, "Portion complaints"),
  cand("se-13", "Serious Eats", "https://www.seriouseats.com/crispy-tofu", "Crispy Tofu", "bowl", "plant_forward", "Tofu skepticism", false),
  cand("ak-12", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/donut/", "Baked Donuts", "breakfast", "balanced", "Dessert not dinner", false),
  cand("tmd-12", "The Mediterranean Dish", "https://www.themediterraneandish.com/baklava/", "Baklava", "dessert", "balanced", "Dessert", false),
  cand("ml-05", "Mediterranean Living", "https://www.mediterraneanliving.com/recipe/gigantes/", "Gigantes Plaki", "bake", "plant_forward", "Niche bean dish", false),
  cand("ew-08", "EatingWell", "https://www.eatingwell.com/recipe/energy-balls/", "Energy Balls", "snack", "balanced", "Snack only", false),
  cand("ba-04", "Bon Appétit", "https://www.bonappetit.com/recipe/lobster-roll/", "Lobster Roll", "sandwich", "lean_comfort", "Cost", false, undefined, 25, "Budget"),
  cand("ml-07", "Mediterranean Living", "https://www.mediterraneanliving.com/recipe/tzatziki/", "Tzatziki Plate", "side", "balanced", "Side only", false),
  cand("ew-10", "EatingWell", "https://www.eatingwell.com/recipe/veggie-burger/", "Veggie Burger", "burger", "plant_forward", "Low protein risk", false, undefined, 55, "Satiety"),
  cand("ba-06", "Bon Appétit", "https://www.bonappetit.com/recipe/risotto/", "Mushroom Risotto", "pasta", "plant_forward", "Stand and stir", false, undefined, 45, "Labor at scale"),
  cand("nyt-07", "NYT Cooking", "https://cooking.nytimes.com/recipes/bouillabaisse", "Bouillabaisse", "soup", "omega3_forward", "Specialty", false),
  cand("st-23", "Skinnytaste", "https://www.skinnytaste.com/enchilada/", "Chicken Enchilada Skillet", "skillet", "lean_comfort", "Skillet enchilada", true, "chicken-enchilada-skillet-light", 86, "Comfort, one pan"),
  cand("st-24", "Skinnytaste", "https://www.skinnytaste.com/sausage-sheet-pan/", "Sausage Veg Sheet Pan", "sheet_pan", "balanced", "Sausage + veg", true, "italian-sausage-veg-sheet-pan", 85, "Hands-off tray"),
  cand("st-25", "Skinnytaste", "https://www.skinnytaste.com/turkey-bolognese/", "Turkey Bolognese Zoodles", "pasta", "low_glycemic", "Zoodle base", true, "turkey-zoodle-bolognese", 82, "Lighter pasta night"),
  cand("se-16", "Serious Eats", "https://www.seriouseats.com/cajun-chicken", "Cajun Chicken Rice", "bowl", "high_protein", "Spiced bowl", true, "cajun-chicken-rice-bowl", 87, "Bold bowl"),
  cand("ak-15", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/chipotle-tacos/", "Chipotle Lime Tacos", "tacos", "high_protein", "Taco night", true, "chipotle-lime-chicken-tacos", 88, "Taco line"),
  cand("tmd-15", "The Mediterranean Dish", "https://www.themediterraneandish.com/shrimp-skewers/", "Grilled Shrimp Quinoa", "grill", "high_protein", "Skewer + grain", true, "grilled-shrimp-quinoa-bowls", 86, "Grill + bowl"),
  cand("ml-08", "Mediterranean Living", "https://www.mediterraneanliving.com/recipe/egg-casserole/", "Veggie Egg Casserole", "breakfast", "high_protein", "Breakfast bake", true, "veggie-egg-casserole-tray", 84, "Morning batch"),
  cand("ew-11", "EatingWell", "https://www.eatingwell.com/recipe/buffalo-chicken-salad/", "Buffalo Chicken Salad", "salad", "high_protein", "Salad line", false, undefined, 83, "Salad-only — reserve"),
  cand("ba-07", "Bon Appétit", "https://www.bonappetit.com/recipe/maple-salmon/", "Maple Mustard Salmon Tray", "sheet_pan", "omega3_forward", "Glazed salmon tray", true, "maple-mustard-salmon-tray", 89, "Tray salmon"),
  cand("nyt-08", "NYT Cooking", "https://cooking.nytimes.com/recipes/salsa-verde-chicken", "Salsa Verde Crock Chicken", "slow_cooker", "high_protein", "Shred for bowls", true, "salsa-verde-crock-chicken", 90, "Set-and-forget"),
  cand("st-26", "Skinnytaste", "https://www.skinnytaste.com/quinoa-stuffed-peppers/", "Quinoa Stuffed Peppers", "bake", "balanced", "Batch peppers", true, "turkey-quinoa-stuffed-peppers", 85, "Colorful batch"),
  cand("se-17", "Serious Eats", "https://www.seriouseats.com/pozole", "Quick Pozole", "soup", "lean_comfort", "Hominy soup", false, undefined, 60, "Regional niche"),
  cand("ak-16", "Ambitious Kitchen", "https://www.ambitiouskitchen.com/mediterranean-tuna/", "Mediterranean Tuna Plate", "plated", "high_protein", "No-cook plate", false),
  cand("tmd-16", "The Mediterranean Dish", "https://www.themediterraneandish.com/stuffed-chicken/", "Spinach Feta Stuffed Chicken", "bake", "high_protein", "Stuffed breast", false, undefined, 84, "Fiddly prep — reserve"),
  cand("ml-09", "Mediterranean Living", "https://www.mediterraneanliving.com/recipe/minestrone/", "Minestrone", "soup", "plant_forward", "Veg soup", false),
  cand("ew-12", "EatingWell", "https://www.eatingwell.com/recipe/shepherds-sweet-potato/", "Turkey Shepherd Sweet Potato", "bake", "lean_comfort", "Mash top cottage pie", true, "turkey-shepherds-sweet-potato", 86, "Comfort remix"),
  cand("ba-08", "Bon Appétit", "https://www.bonappetit.com/recipe/light-chili-mac/", "Light Chili Mac", "skillet", "lean_comfort", "Skillet mac", false, undefined, 84, "Chili overlap — reserve"),
  cand("nyt-09", "NYT Cooking", "https://cooking.nytimes.com/recipes/egg-burrito-bake", "Egg Burrito Bake", "breakfast", "high_protein", "Breakfast bake", false, undefined, 83, "Breakfast overlap — reserve"),
];

export const PERFORMANCE_SOURCE_SELECTED = PERFORMANCE_SOURCE_CANDIDATES.filter((c) => c.selected);

export function getPerformanceSourceById(id: string): PerformanceSourceRecord | undefined {
  return PERFORMANCE_SOURCE_CANDIDATES.find((c) => c.id === id);
}

export function getPerformanceSourceBySlug(slug: string): PerformanceSourceRecord | undefined {
  return PERFORMANCE_SOURCE_CANDIDATES.find((c) => c.firehallSlug === slug);
}

export function validatePerformanceSourceRegistry(): string[] {
  const issues: string[] = [];
  if (PERFORMANCE_SOURCE_CANDIDATES.length !== PERFORMANCE_CANDIDATE_COUNT) {
    issues.push(`expected ${PERFORMANCE_CANDIDATE_COUNT} candidates, got ${PERFORMANCE_SOURCE_CANDIDATES.length}`);
  }
  const selected = PERFORMANCE_SOURCE_SELECTED;
  if (selected.length !== PERFORMANCE_MEAL_COUNT) {
    issues.push(`expected ${PERFORMANCE_MEAL_COUNT} selected, got ${selected.length}`);
  }
  const slugs = new Set<string>();
  for (const s of selected) {
    if (!s.firehallSlug) issues.push(`selected ${s.id} missing firehallSlug`);
    else if (slugs.has(s.firehallSlug)) issues.push(`duplicate slug ${s.firehallSlug}`);
    else slugs.add(s.firehallSlug);
  }
  return issues;
}
