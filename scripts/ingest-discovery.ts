#!/usr/bin/env tsx
/**
 * Offline recipe ingestion CLI — batch only, never wired to Explore HTTP.
 *
 * Usage:
 *   npx tsx scripts/ingest-discovery.ts
 *   npx tsx scripts/ingest-discovery.ts --promote
 *   INGEST_TREND_SIGNALS_PATH=./my-trends.json npx tsx scripts/ingest-discovery.ts
 */

import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { initRecipeCatalog } from "../server/recipe-catalog.js";
import { initIngestionStore } from "../server/ingestion/ingestion-store.js";
import { runIngestionPipeline } from "../server/ingestion/pipeline.js";
import { getLatestIngestionRun, getIngestionSummary } from "../server/ingestion/ingestion-store.js";

async function main() {
  const promote = process.argv.includes("--promote");

  await initCuratedRecipeStore();
  await initRecipeCatalog();
  await initIngestionStore();

  console.log("[ingest] Starting discovery pipeline…");
  const stats = await runIngestionPipeline({
    promote,
    promoteLimit: 12,
    minQuality: 50,
  });

  console.log("[ingest] Stats:", stats);
  const summary = getIngestionSummary();
  console.log("[ingest] Staging summary:", summary);
  const last = getLatestIngestionRun();
  if (last) console.log("[ingest] Last run:", last.id, last.status);
}

main().catch((err) => {
  console.error("[ingest] Failed:", err);
  process.exit(1);
});
