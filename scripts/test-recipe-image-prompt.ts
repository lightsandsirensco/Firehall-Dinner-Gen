#!/usr/bin/env tsx
/**
 * Regression checks for the recipe → image prompt template.
 *   npx tsx scripts/test-recipe-image-prompt.ts [--list-conflicts]
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildRecipeImagePromptInput,
  deriveAvoidItems,
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
assert.ok(titleIngredientConflicts(load("golden-100/pages/pork-carnitas-tacos.json")).length > 0);
assert.deepEqual(titleIngredientConflicts(monte), []);

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
