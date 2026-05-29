#!/usr/bin/env tsx
/**
 * Verify every embedded smoothie has internal source tracking (not published).
 */
import { HEALTHY_HALL_SMOOTHIES_ARTICLE } from "../shared/editorial/smoothie-guide-article.js";
import { SMOOTHIE_GUIDE_SOURCES } from "../shared/editorial/smoothie-guide-sources.js";

const recipes = HEALTHY_HALL_SMOOTHIES_ARTICLE.embeddedRecipes ?? [];
let fail = 0;

for (const r of recipes) {
  const src = SMOOTHIE_GUIDE_SOURCES[r.id];
  if (!src) {
    console.error(`  ✗ missing source record for ${r.id}`);
    fail++;
  }
}

const sourceIds = new Set(Object.keys(SMOOTHIE_GUIDE_SOURCES));
for (const id of sourceIds) {
  if (!recipes.some((r) => r.id === id)) {
    console.warn(`  ⚠ orphan source record: ${id}`);
  }
}

console.log(
  `[audit:smoothie-sources] recipes=${recipes.length} sources=${sourceIds.size} fail=${fail}`,
);
process.exit(fail > 0 ? 1 : 0);
