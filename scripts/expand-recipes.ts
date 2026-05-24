#!/usr/bin/env tsx
/**
 * Curated recipe expansion CLI — batch ingest + gated promote.
 *
 * Usage:
 *   npx tsx scripts/expand-recipes.ts
 *   npx tsx scripts/expand-recipes.ts --promote-only
 *   npx tsx scripts/expand-recipes.ts --promote --prefer-publisher
 */

import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { initRecipeCatalog } from "../server/recipe-catalog.js";
import { initIngestionStore } from "../server/ingestion/ingestion-store.js";
import {
  runRecipeExpansion,
  getExpansionDashboard,
} from "../server/expansion/recipe-expansion-service.js";

async function main() {
  const promoteOnly = process.argv.includes("--promote-only");
  const promote = process.argv.includes("--promote") || promoteOnly;
  const preferPublisher = process.argv.includes("--prefer-publisher");

  await initCuratedRecipeStore();
  await initRecipeCatalog();
  await initIngestionStore();

  console.log("[expand] Starting recipe expansion run…");
  const stats = await runRecipeExpansion({
    promoteOnly,
    promote,
    promoteLimit: 12,
    minQuality: preferPublisher ? 50 : 52,
    preferPublisherImages: preferPublisher,
  });

  console.log("[expand] Run stats:", JSON.stringify(stats, null, 2));
  const dashboard = getExpansionDashboard();
  console.log("[expand] Catalog:", dashboard.catalog);
  console.log("[expand] Balance:", dashboard.balance);
}

main().catch((err) => {
  console.error("[expand] Failed:", err);
  process.exit(1);
});
