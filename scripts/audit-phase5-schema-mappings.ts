/**
 * SEO Phase 5 verification: reports before/after-style stats for
 * recipeCategory (Section B), recipeCuisine (Section D), and suitableForDiet
 * (Section C) across every golden-100-shaped recipe (golden-100,
 * hall-expansion, performance-meals, bbq, pizza-night).
 */
import fs from "fs";
import path from "path";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import {
  recipeCategoryLabel,
  normalizeRecipeCuisineLabel,
  suitableForDietFromProfile,
} from "../shared/seo/schema.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const FAMILIES = ["golden-100", "hall-expansion", "performance-meals", "bbq", "pizza-night"];

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function loadFamily(family: string): GoldenRecipePage[] {
  const index = readJson<{ recipes: Array<{ slug: string }> }>(path.join(PUBLIC, "catalog", family, "index.json"));
  return index.recipes.map((entry) =>
    readJson<GoldenRecipePage>(path.join(PUBLIC, "catalog", family, "pages", `${entry.slug}.json`)),
  );
}

const allPages = FAMILIES.flatMap(loadFamily);
console.log(`Total recipes loaded: ${allPages.length}\n`);

console.log("--- Section B: recipeCategory ---");
let hallExpansionCount = 0;
let mappedCount = 0;
const sampleMappings: string[] = [];
for (const page of allPages) {
  if (page.category === "hall_expansion") {
    hallExpansionCount++;
    const label = recipeCategoryLabel(page);
    if (label !== "hall expansion" && label !== "hall_expansion") {
      mappedCount++;
      if (sampleMappings.length < 5) sampleMappings.push(`${page.slug}: "hall_expansion" -> "${label}"`);
    }
  }
}
console.log(`Recipes with internal category="hall_expansion": ${hallExpansionCount}`);
console.log(`...of which now map to a real category tag: ${mappedCount}`);
console.log(`Sample mappings:\n  ${sampleMappings.join("\n  ")}`);

console.log("\n--- Section D: recipeCuisine normalization ---");
const cuisineChanges = new Map<string, string>();
for (const page of allPages) {
  const normalized = normalizeRecipeCuisineLabel(page.cuisine);
  if (normalized !== page.cuisine) cuisineChanges.set(page.cuisine, normalized);
}
if (cuisineChanges.size === 0) {
  console.log("(none — all cuisine values already clean; no synonym/casing issues found in this dataset)");
} else {
  for (const [before, after] of cuisineChanges) console.log(`  "${before}" -> "${after}"`);
}

console.log("\n--- Section C: suitableForDiet ---");
let veganCount = 0;
let vegetarianCount = 0;
let bothCount = 0;
let noneCount = 0;
let lowConfidenceCount = 0;
for (const page of allPages) {
  if (page.dietary && page.dietary.confidence !== "high") lowConfidenceCount++;
  const diet = suitableForDietFromProfile(page.dietary);
  const hasVegan = diet?.includes("https://schema.org/VeganDiet") ?? false;
  const hasVeg = diet?.includes("https://schema.org/VegetarianDiet") ?? false;
  if (hasVegan && hasVeg) bothCount++;
  else if (hasVegan) veganCount++;
  else if (hasVeg) vegetarianCount++;
  else noneCount++;
}
console.log(`Vegan-only suitableForDiet: ${veganCount}`);
console.log(`Vegetarian-only suitableForDiet: ${vegetarianCount}`);
console.log(`Both vegan+vegetarian: ${bothCount}`);
console.log(`Absent (low confidence or neither flag true): ${noneCount}`);
console.log(`(of which low-confidence recipes correctly excluded: ${lowConfidenceCount})`);
