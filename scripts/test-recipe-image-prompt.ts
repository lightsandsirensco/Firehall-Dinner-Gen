#!/usr/bin/env tsx
/**
 * Regression checks for the recipe → image prompt template.
 *   npx tsx scripts/test-recipe-image-prompt.ts [--list-conflicts]
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildRecipeImageAlt,
  buildRecipeImagePromptInput,
  deriveAvoidItems,
  inferMealFormat,
  inferProteinLabel,
  plateEggStyle,
  titleIngredientConflicts,
  visibleIngredientHints,
  type RecipePageLike,
} from "../server/imagery/recipe-image-prompt.js";
import { buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";

const CATALOG = path.join(process.cwd(), "client", "public", "catalog");
const load = (rel: string) => JSON.parse(fs.readFileSync(path.join(CATALOG, rel), "utf8")) as RecipePageLike;

// Monte Cristo: egg only in batter, no bacon/potatoes, powdered sugar + jam visible.
const monte = load("breakfast/pages/monte-cristo-sandwiches.json");
assert.equal(plateEggStyle(monte), null);
const monteAvoid = deriveAvoidItems(monte);
for (const item of ["fried egg", "poached egg", "bacon strips", "home fries", "hash browns"]) {
  assert.ok(monteAvoid.includes(item), `Monte Cristo avoid list missing "${item}"`);
}
assert.ok(!monteAvoid.includes("ham slices"), "ham is in the recipe");
const monteHints = visibleIngredientHints(monte);
assert.ok(monteHints.includes("powdered sugar") && monteHints.includes("raspberry jam"));
assert.ok(!monteHints.some((h) => /egg|butter/.test(h)), "batter/cook ingredients must stay hidden");
const montePrompt = buildEditorialModelPrompt(buildRecipeImagePromptInput(monte, "breakfast"));
for (const banned of ["crispy bacon edges", "runny yolk where appropriate", "named side (fries", "yolk/pancake hero", "separate zones for eggs"]) {
  assert.ok(!montePrompt.includes(banned), `style template still injects "${banned}"`);
}

// Eggs cracked on top in the method are a visible whole egg.
assert.equal(plateEggStyle(load("golden-100/pages/breakfast-sausage-pizza.json")), "whole");
assert.equal(plateEggStyle(load("breakfast/pages/chilaquiles-verde-bake.json")), "whole");
assert.ok(!deriveAvoidItems(load("breakfast/pages/sheet-pan-full-english.json")).includes("fried egg"));

// A baked egg sheet cut into squares is a visible egg, but never a fried one.
const bagel = load("breakfast/pages/bagel-sandwich-line.json");
assert.equal(plateEggStyle(bagel), "scrambled");
assert.ok(visibleIngredientHints(bagel).some((h) => /egg/.test(h)));
assert.ok(deriveAvoidItems(bagel).includes("fried egg"));

// Title/ingredient conflicts block regeneration.
assert.ok(
  titleIngredientConflicts({ title: "Black Bean Turkey Burgers", ingredients: [{ name: "Ground beef (80/20)" }] }).length > 0,
);
assert.deepEqual(titleIngredientConflicts(load("golden-100/pages/turkey-burgers.json")), []);
assert.deepEqual(titleIngredientConflicts(monte), []);
assert.deepEqual(titleIngredientConflicts(load("golden-100/pages/pork-carnitas-tacos.json")), []);

// Bowl titles stay bowls; broth never counts as a visible protein.
assert.equal(inferMealFormat("High-Protein Breakfast Burrito Bowls"), "bowl");
assert.equal(inferMealFormat("Firehouse Diner Burger Bowls"), "bowl");
assert.equal(inferProteinLabel({ title: "Turkey White Bean Soup", ingredients: [{ name: "ground turkey" }, { name: "chicken broth" }] }), "turkey");

// Spices and broth stay hidden so real toppings survive the capped ingredient line;
// holding/leftover steps never become the serving description.
const lentilChili = load("hall-expansion/pages/firehouse-lentil-chili.json");
const chiliHints = visibleIngredientHints(lentilChili);
assert.ok(chiliHints.slice(0, 8).includes("shredded cheddar") && chiliHints.slice(0, 8).includes("green onions"));
assert.ok(!chiliHints.some((h) => /cumin|chili powder|paprika|broth/.test(h)));
const chiliPrompt = buildEditorialModelPrompt(buildRecipeImagePromptInput(lentilChili, "hall-expansion"));
assert.ok(!chiliPrompt.includes("shallow baking dish within two hours"), "leftover step leaked into Served:");

// Alt text names the foods vision saw, minus ones the title already names, and never truncates mid-word.
const alt = (title: string, foods?: string[], subtitle?: string) => buildRecipeImageAlt({ slug: "x", title, subtitle }, foods);
assert.equal(alt("Hickory Smoked Chicken Breast", ["chicken breasts", "herb butter"]), "Hickory Smoked Chicken Breast — herb butter");
assert.equal(alt("Batch Lasagna", ["lasagna noodles", "marinara sauce", "mozzarella"]), "Batch Lasagna — lasagna noodles, marinara sauce, and mozzarella");
assert.equal(alt("Firehall Chili", ["chili"]), "Firehall Chili");
assert.equal(alt("Baked Ziti", undefined, "Cheesy pasta bake for the table."), "Baked Ziti — cheesy pasta bake for the table");
assert.equal(alt("Pasta Bar Night", undefined, "Choose-your-sauce pasta bar with garlic bread for ten"), "Pasta Bar Night — choose-your-sauce pasta bar with garlic bread");
assert.equal(alt("Buttermilk Pancakes", undefined, "Fluffy griddle pancakes stacked for a hungry crew."), "Buttermilk Pancakes — fluffy griddle pancakes stacked");
assert.equal(alt("Tuna Melt", undefined, "Open-faced tuna melts on rye with cheddar — sheet-pan batch for the crew"), "Tuna Melt — open-faced tuna melts on rye with cheddar");
assert.equal(alt("Bean Salad", undefined, "Mixed beans and a lemon vinaigrette in a make-ahead salad"), "Bean Salad — mixed beans and a lemon vinaigrette");
const longAlt = alt("Tacos", Array.from({ length: 30 }, (_, i) => `topping number ${i}`));
assert.ok(longAlt.length <= 160 && /, and topping number \d+$/.test(longAlt), longAlt);

if (process.argv.includes("--list-conflicts")) {
  for (const col of fs.readdirSync(CATALOG)) {
    const idx = path.join(CATALOG, col, "index.json");
    if (!fs.existsSync(idx)) continue;
    for (const { slug } of JSON.parse(fs.readFileSync(idx, "utf8")).recipes as Array<{ slug: string }>) {
      const p = path.join(CATALOG, col, "pages", `${slug}.json`);
      if (!fs.existsSync(p)) continue;
      const page = JSON.parse(fs.readFileSync(p, "utf8")) as RecipePageLike;
      const c = titleIngredientConflicts(page);
      if (c.length) console.log(`  ${col}/${slug} — ${page.title}: ${c.join("; ")}`);
    }
  }
}

console.log("[test-recipe-image-prompt] OK");
