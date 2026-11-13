#!/usr/bin/env tsx
/**
 * Practical shopping lists: purchase amounts, aisles, kitchen fractions,
 * kitchen-supplied items, one crew-size resolver, and a whole-catalog sweep
 * proving the recipe-page dialog and the Shift Planner list agree.
 *
 *   npx tsx scripts/test-shopping-purchase.ts
 */
import assert from "node:assert/strict";
import { scaleGoldenIngredients } from "../shared/golden-100/recipe-quality/crew-scale.js";
import type { GoldenRecipePageIngredient } from "../shared/golden-100/recipe-page-schema.js";
import {
  formatClientIngredientQty,
  formatIngredientDisplayName,
  formatKitchenFraction,
} from "../shared/measurements/index.js";
import {
  crewSizeOptionsWith,
  FALLBACK_PREFERRED_CREW_SIZE,
  resolvePreferredCrewSize,
} from "../shared/recipe/crew-scaling-config.js";
import {
  addRecipeToSession,
  classifyDepartment,
  createShoppingSession,
  formatShoppingItemCookAmount,
  formatShoppingItemQuantity,
  isNotPurchased,
  shoppingItemPurchase,
  type RawRecipeIngredient,
  type ShoppingListItem,
} from "../shared/shopping/index.js";
import { buildShoppingListFromCatalogIngredients } from "../client/src/lib/shopping-list.js";
import { resolveShoppingRecipe } from "../server/shift-plan/routes.js";
import { getApprovedCatalog } from "../server/approved-catalog-cache.js";
import { isAwkwardAmount } from "./audit-shopping-lists.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

function list(...ingredients: RawRecipeIngredient[]): ShoppingListItem[] {
  return addRecipeToSession(
    createShoppingSession(),
    { slug: "t", title: "Test", baseServings: 1, ingredients, prescaled: true },
    1,
  ).list.items;
}

function shown(ing: RawRecipeIngredient, system?: "us" | "metric"): string {
  const [item] = list(ing);
  assert.ok(item, `no list item for ${ing.name}`);
  return formatShoppingItemQuantity(item, system);
}

console.log("[test-shopping-purchase]");

test("kitchen fractions replace decimals; metric stays decimal", () => {
  assert.equal(formatKitchenFraction(0.75), "¾");
  assert.equal(formatKitchenFraction(1.25), "1¼");
  assert.equal(formatKitchenFraction(0.333), "⅓");
  assert.equal(formatKitchenFraction(3.05), "3");
  assert.equal(formatKitchenFraction(2.6), "2⅝");
  assert.equal(formatKitchenFraction(4), "4");
  assert.equal(formatClientIngredientQty(0.75, "cup", "us"), "¾ cup", "generator/Explore recipe view matches the list");
  assert.equal(shown({ name: "Rice", quantity: "500", unit: "g" }, "metric"), "500 g");
});

test("whole items round up to buy, cooking amount kept alongside", () => {
  assert.equal(shown({ name: "Yellow Onion", quantity: "0.75" }), "1 (need ¾)");
  assert.equal(shown({ name: "Bell Peppers", quantity: "3" }), "3", "already whole: no duplicate buy label");
  assert.equal(shown({ name: "Diced Tomatoes", quantity: "1.5", unit: "cans (15 oz)" }), "2 cans (15 oz) (need 1½ cans (15 oz))");
});

test("citrus juice → whole lemons/limes; garlic → heads; butter → sticks; eggs → dozens", () => {
  assert.equal(shown({ name: "Lemon Juice", quantity: "0.375", unit: "cup" }), "about 2 lemons (need ⅜ cup)");
  assert.equal(shown({ name: "Fresh Lime Juice", quantity: "3", unit: "tbsp" }), "about 2 limes (need 3 tbsp)");
  assert.equal(shown({ name: "Garlic Cloves", quantity: "14", unit: "cloves" }), "2 heads (need 14 cloves)");
  assert.equal(shown({ name: "Unsalted Butter", quantity: "6", unit: "tbsp" }), "1 stick (need 6 tbsp)");
  assert.equal(shown({ name: "Butter", quantity: "2.5", unit: "cups" }), "5 sticks (2 1 lb boxes) (need 2½ cups)");
  assert.equal(shown({ name: "Large Eggs", quantity: "14" }), "2 dozen (need 14)");
});

test("packaged staples: broth cartons, dairy tubs, shredded cheese bags, herbs in bunches", () => {
  assert.equal(shown({ name: "Chicken Broth", quantity: "6", unit: "cups" }), "2 × 32 oz carton (need 6 cups)");
  assert.equal(shown({ name: "Heavy Cream", quantity: "1.5", unit: "cups" }), "1 × pint (need 1½ cups)");
  assert.equal(shown({ name: "Whole Milk", quantity: "5", unit: "cups" }), "½ gallon (need 5 cups)");
  assert.equal(shown({ name: "Sour Cream", quantity: "0.75", unit: "cup" }), "1 × 8 oz tub (need ¾ cup)");
  assert.equal(shown({ name: "Shredded Cheddar", quantity: "3", unit: "cups" }), "2 × 8 oz bag (need 3 cups)");
  assert.equal(shown({ name: "Fresh Parsley", quantity: "0.25", unit: "cup" }), "1 bunch (need ¼ cup)");
  assert.equal(shown({ name: "Fresh Thyme", quantity: "20", unit: "sprigs" }), "2 bunches (need 20 sprigs)");
});

test("spices, salt and small amounts of oil read 'Check pantry'; produce never does", () => {
  assert.equal(shown({ name: "Kosher Salt", quantity: "1.25", unit: "tsp" }), "Check pantry (need 1¼ tsp)");
  assert.equal(shown({ name: "Smoked Paprika", quantity: "1", unit: "tbsp" }), "Check pantry (need 1 tbsp)");
  assert.equal(shown({ name: "Olive Oil", quantity: "3", unit: "tbsp" }), "Check pantry (need 3 tbsp)");
  assert.equal(shown({ name: "Salt", quantity: "to taste" }), "Check pantry (need to taste)");
  assert.equal(shown({ name: "Olive Oil", quantity: "2", unit: "cups" }), "2 cups", "a real quantity of oil is a purchase");
  assert.equal(shown({ name: "Red Bell Pepper", quantity: "2" }), "2");
  const [item] = list({ name: "Black Pepper", quantity: "1", unit: "tsp" });
  assert.equal(shoppingItemPurchase(item!)?.pantryCheck, true);
});

test("meat rounds up to the quarter pound without contradicting the cooking amount", () => {
  assert.equal(shown({ name: "Ground Beef", quantity: "2.6", unit: "lb" }), "2¾ lb (need 2⅝ lb)");
  assert.equal(shown({ name: "Chicken Thighs", quantity: "2.23", unit: "lb" }), "2¼ lb", "displays as 2¼ → buy 2¼, not 2½");
  assert.equal(shown({ name: "Bacon", quantity: "10", unit: "oz" }), "10 oz");
});

test("metric display never shows US package sizes", () => {
  assert.equal(shown({ name: "Ground Beef", quantity: "1.1", unit: "lb" }, "metric"), "500 g");
  assert.equal(shown({ name: "Chicken Broth", quantity: "6", unit: "cups" }, "metric"), "1.5 L");
  assert.equal(shown({ name: "Lemon Juice", quantity: "6", unit: "tbsp" }, "metric"), "about 2 lemons (need 90 ml)");
});

test("tap water, ice and pan drippings never reach the list", () => {
  for (const name of ["Water", "Warm Water", "hot tap water", "Ice", "Pan Drippings", "Reserved Pasta Water (about 1 cup)"]) {
    assert.ok(isNotPurchased(name), name);
  }
  for (const name of ["Coconut Water", "Sparkling Water", "Watercress"]) assert.ok(!isNotPurchased(name), name);
  assert.equal(list({ name: "Warm Water", quantity: "1", unit: "cup" }, { name: "Flour", quantity: "2", unit: "cups" }).length, 1);
});

test("aisles: shelf location, not recipe role", () => {
  const cases: Array<[string, string]> = [
    ["Large Eggs", "Dairy & Eggs"],
    ["Eggplant", "Produce"],
    ["Egg Noodles", "Pasta, Rice & Grains"],
    ["Extra-Virgin Olive Oil", "Condiments, Sauces & Oils"],
    ["Chicken Broth", "Pantry & Canned Goods"],
    ["Tomato Paste", "Pantry & Canned Goods"],
    ["Crushed Tomatoes", "Pantry & Canned Goods"],
    ["Russet Potatoes", "Produce"],
    ["Fresh Thyme", "Produce"],
    ["Dried Thyme", "Spices & Seasonings"],
    ["Lemons (cut into wedges)", "Produce"],
    ["Lemon Pepper", "Spices & Seasonings"],
    ["Capers", "Condiments, Sauces & Oils"],
    ["Plain Greek Yogurt", "Dairy & Eggs"],
    ["Flour Tortillas", "Bakery & Bread"],
    ["Tortilla Chips", "Pantry & Canned Goods"],
    ["Dill Pickle Chips", "Condiments, Sauces & Oils"],
    ["Panko Breadcrumbs", "Pantry & Canned Goods"],
    ["Peanut Butter", "Pantry & Canned Goods"],
    ["Ancho Chile Powder", "Spices & Seasonings"],
    ["Chuck Roast", "Meat & Seafood"],
    ["Bay Leaves", "Spices & Seasonings"],
    ["Pico de Gallo", "Produce"],
    ["Frozen Hash Browns", "Frozen Foods"],
  ];
  for (const [name, department] of cases) assert.equal(classifyDepartment(name), department, name);
  const [lime] = list({ name: "Lime", quantity: "1", notes: "for garnish" });
  assert.equal(lime!.department, "Produce", "a garnish note doesn't move limes to the spice aisle");
});

test("one crew-size resolver: generator choice → account → device → 6", () => {
  assert.equal(resolvePreferredCrewSize({ generatorCrewSize: 8, accountCrewSize: 6, deviceCrewSize: 4 }), 8);
  assert.equal(resolvePreferredCrewSize({ accountCrewSize: 6, deviceCrewSize: 4 }), 6, "saved profile beats device default");
  assert.equal(resolvePreferredCrewSize({ accountCrewSize: null, deviceCrewSize: 5 }), 5);
  assert.equal(resolvePreferredCrewSize({ accountCrewSize: 0, deviceCrewSize: 99 }), FALLBACK_PREFERRED_CREW_SIZE);
  assert.deepEqual(crewSizeOptionsWith(7), [4, 6, 7, 8, 10, 14], "an exact crew of 7 gets its own button");
  assert.deepEqual(crewSizeOptionsWith(6), [4, 6, 8, 10, 14]);
});

test("catalog sweep at crew 4/6/10: no awkward amounts, dialog matches planner list, buy covers cook", () => {
  const slugs = getApprovedCatalog().recipes.map((r: { slug: string }) => r.slug);
  let checked = 0;
  for (const slug of slugs) {
    const input = resolveShoppingRecipe(slug);
    if (!input) continue;
    for (const crew of [4, 6, 10]) {
      const items = addRecipeToSession(createShoppingSession(), input, crew).list.items;
      const scaled = scaleGoldenIngredients(input.ingredients as GoldenRecipePageIngredient[], input.baseServings, crew);
      const dialog = buildShoppingListFromCatalogIngredients(scaled, { recipeTitle: input.title });
      const dialogAmounts = new Map(dialog.sections.flatMap((s) => s.items.map((i) => [i.name, i.amount] as const)));
      for (const item of items) {
        const display = formatShoppingItemQuantity(item);
        const inDialog = dialogAmounts.get(formatIngredientDisplayName(item.displayName));
        if (inDialog !== undefined) {
          assert.equal(inDialog, display, `${slug}@${crew}: recipe dialog and planner list disagree on ${item.displayName}`);
        }
        assert.ok(!isAwkwardAmount(display), `${slug}@${crew}: ${item.displayName} "${display}"`);
        assert.ok(!/NaN|undefined|Infinity/.test(display), `${slug}@${crew}: ${item.displayName} "${display}"`);
        assert.notEqual(item.department, undefined);
        const cook = formatShoppingItemCookAmount(item);
        if (display !== cook) assert.ok(display.endsWith(`(need ${cook})`), `${slug}@${crew}: cook amount kept for ${item.displayName}`);
      }
      for (const [name, amount] of dialogAmounts) {
        assert.ok(!isAwkwardAmount(amount), `${slug}@${crew} dialog: ${name} "${amount}"`);
      }
      checked += 1;
    }
  }
  assert.ok(checked >= 1200, `expected the full catalog at three crew sizes, checked ${checked}`);
});

console.log(`[test-shopping-purchase] OK (${passed} tests)`);
process.exit(0);
