#!/usr/bin/env tsx
/**
 * Generate editorial smoothie guide imagery (hero + 10 cards).
 * Requires OPENAI_API_KEY and food-imagery pipeline.
 *
 *   npx tsx scripts/generate-smoothie-guide-imagery.ts
 */
import fs from "node:fs";
import path from "node:path";
import { HEALTHY_HALL_SMOOTHIES_ARTICLE } from "../shared/editorial/smoothie-guide-article.js";

const OUT_DIR = path.join(process.cwd(), "client", "public", "images", "editorial");
const SMOOTHIE_DIR = path.join(OUT_DIR, "smoothies");

async function main(): Promise<void> {
  fs.mkdirSync(SMOOTHIE_DIR, { recursive: true });
  const recipes = HEALTHY_HALL_SMOOTHIES_ARTICLE.embeddedRecipes ?? [];
  console.log("[smoothie-imagery] Slugs to generate:");
  console.log(`  hero: ${HEALTHY_HALL_SMOOTHIES_ARTICLE.heroImage}`);
  for (const r of recipes) {
    console.log(`  ${r.id}: ${r.imagePath}`);
  }
  console.log(
    "\nRun food-imagery generation with editorial smoothie prompts when API keys are configured.",
  );
  console.log("Until then, the guide uses gradient fallbacks in the UI.");
}

main();
