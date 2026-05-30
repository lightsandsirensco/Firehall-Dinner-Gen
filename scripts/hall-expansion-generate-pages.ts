#!/usr/bin/env tsx
/**
 * Publish Hall Expansion 30 to client/public/catalog/hall-expansion/
 */
import { HALL_EXPANSION_COUNT } from "../shared/hall-expansion/types.js";
import { HALL_EXPANSION_ADAPTED_RECIPES } from "../shared/hall-expansion/adapted/index.js";
import { buildAllHallExpansionPages } from "../server/hall-expansion/page-builder.js";
import {
  writeHallExpansionCatalogIndex,
  writeHallExpansionRecipePage,
} from "../server/hall-expansion/page-store.js";
import { validateGoldenRecipePage } from "../server/golden-100/recipe-page-validator.js";
import { goldenRecipePageSchema } from "../shared/golden-100/recipe-page-schema.js";

function main(): void {
  if (HALL_EXPANSION_ADAPTED_RECIPES.length !== HALL_EXPANSION_COUNT) {
    throw new Error(`Expected ${HALL_EXPANSION_COUNT} expansion recipes`);
  }

  const pages = buildAllHallExpansionPages();
  const contentWarnings: string[] = [];
  for (const page of pages) {
    goldenRecipePageSchema.parse(page);
    const validation = validateGoldenRecipePage(page);
    const errors = validation.issues.filter((i) => i.severity === "error");
    if (errors.length) {
      contentWarnings.push(`${page.slug}: ${errors.map((e) => e.message).join("; ")}`);
    }
    writeHallExpansionRecipePage(page);
  }
  const indexPath = writeHallExpansionCatalogIndex(pages);
  console.log(`[hall-expansion:generate-pages] ${pages.length} recipes → ${indexPath}`);
  if (contentWarnings.length) {
    console.warn(`[hall-expansion:generate-pages] ${contentWarnings.length} editorial warnings (non-blocking):`);
    for (const w of contentWarnings.slice(0, 10)) console.warn(`  ⚠ ${w}`);
    if (contentWarnings.length > 10) {
      console.warn(`  … and ${contentWarnings.length - 10} more (run audit:expansion-catalog)`);
    }
  }
}

main();
