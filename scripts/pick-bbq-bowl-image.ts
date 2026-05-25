#!/usr/bin/env tsx
import "dotenv/config";
import { getRecipeById, searchRecipes } from "../server/spoonacular.js";

const CANDIDATE_IDS = [715420, 1096017, 633448, 650883, 635675];

async function main() {
  for (const query of [
    "chicken rice bowl",
    "bbq chicken rice",
    "barbecue chicken bowl rice",
    "bbq glazed chicken bowl",
    "chicken thigh bowl rice",
    "honey barbecue chicken bowl",
  ]) {
    console.log("\n===", query, "===");
    const r = await searchRecipes(query, { number: 12 });
    for (const x of r.results || []) {
      console.log(x.id, x.title, (x.image || "").slice(0, 60));
    }
  }
  console.log("\n=== Candidate details ===");
  for (const id of CANDIDATE_IDS) {
    try {
      const d = await getRecipeById(id, false);
      console.log(`\nid=${id}`);
      console.log(" title:", d.title);
      console.log(" image:", d.image);
      console.log(" summary:", (d.summary || "").replace(/<[^>]+>/g, "").slice(0, 120));
    } catch (e) {
      console.log(id, "ERR", (e as Error).message);
    }
  }
}

main();
