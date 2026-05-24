#!/usr/bin/env tsx
/**
 * Audit Firehall Classics Wheel — Spoonacular id vs title vs image keywords.
 */
import "dotenv/config";
import {
  CLASSIC_HALL_MEALS,
  resolveClassicHeroImage,
  findDuplicateClassicHeroIds,
} from "../shared/classic-hall-meals.js";
import { getRecipeById, searchRecipes } from "../server/spoonacular.js";

function titleMatchScore(expected: string, actual: string, keywords: string[]): number {
  const blob = `${actual} ${expected}`.toLowerCase();
  let score = 0;
  for (const k of keywords) {
    if (blob.includes(k.toLowerCase())) score++;
  }
  return score;
}

async function main() {
  console.log("=== Classic Wheel Image Audit ===\n");

  for (const meal of CLASSIC_HALL_MEALS) {
    const hero = resolveClassicHeroImage(meal);
    let apiTitle = "(skipped)";
    let apiImage = "";
    try {
      if (meal.spoonacularRecipeId > 0 && !meal.heroImagePath) {
        const detail = await getRecipeById(meal.spoonacularRecipeId, false);
        apiTitle = detail.title;
        apiImage = detail.image || "";
      }
    } catch (e) {
      apiTitle = `ERROR: ${(e as Error).message}`;
    }

    const match = titleMatchScore(meal.title, apiTitle, meal.imageKeywords);
    const hallBlob = `${meal.title} ${meal.displayTitle}`.toLowerCase();
    const apiBlob = `${apiTitle} ${meal.spoonacularTitle}`.toLowerCase();
    const bbqHall = /bbq|barbecue/.test(hallBlob);
    const bbqApi = /bbq|barbecue/.test(apiBlob);
    const bbqMismatch = bbqHall && !bbqApi && !meal.heroImagePath;
    const mustInclude = meal.spoonacularTitleMustInclude || [];
    const mustFail =
      mustInclude.length > 0 &&
      !meal.heroImagePath &&
      !mustInclude.some((k) => apiBlob.includes(k.toLowerCase()));

    const flag = meal.heroImagePath
      ? "PINNED"
      : bbqMismatch || mustFail
        ? "MISMATCH"
        : match < 2
          ? "WARN"
          : "OK";

    console.log(`[${flag}] ${meal.slug}`);
    console.log(`  Hall title:     ${meal.title}`);
    console.log(`  Expected API:   ${meal.spoonacularTitle}`);
    console.log(`  Actual API:     ${apiTitle}`);
    console.log(`  Hero:           ${hero.slice(0, 72)}...`);
    console.log(`  Keyword hits:   ${match}/${meal.imageKeywords.length}`);
    console.log("");
  }

  const dups = findDuplicateClassicHeroIds();
  if (dups.length) {
    console.log("Duplicate Spoonacular hero IDs:");
    for (const d of dups) console.log(`  id=${d.id} → ${d.slugs.join(", ")}`);
  } else {
    console.log("No duplicate Spoonacular hero IDs.\n");
  }

  const queries = [
    "bbq chicken bowl",
    "barbecue chicken rice",
    "honey bbq chicken",
    "grilled chicken rice bowl",
    "chicken bowl barbecue sauce",
  ];
  for (const query of queries) {
    console.log(`\n=== Search: "${query}" ===\n`);
    const results = await searchRecipes(query, { number: 8 });
    for (const r of results.results || []) {
      const t = (r.title || "").toLowerCase();
      const bbq = t.includes("bbq") || t.includes("barbecue");
      console.log(`  ${bbq ? "★" : " "} id=${r.id}  ${r.title}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
