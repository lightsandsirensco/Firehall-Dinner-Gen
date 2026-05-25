#!/usr/bin/env tsx
/**
 * Full Pinterest → publisher → staging → promote pipeline.
 *
 *   npx tsx scripts/ingest-pinterest.ts
 *   npx tsx scripts/ingest-pinterest.ts --promote
 *   npx tsx scripts/ingest-pinterest.ts --dataset-only   # use APIFY_DATASET_ID only
 */

import "dotenv/config";
import { applyDevInsecureTlsIfAllowed } from "./dev-tls.js";

applyDevInsecureTlsIfAllowed();
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { initRecipeCatalog } from "../server/recipe-catalog.js";
import { initIngestionStore } from "../server/ingestion/ingestion-store.js";
import { runIngestionPipeline, defaultIngestionSources } from "../server/ingestion/pipeline.js";
import {
  getIngestionSummary,
  getLatestIngestionRun,
  requeuePromoteFailedStaging,
} from "../server/ingestion/ingestion-store.js";
import { promoteValidatedStaging } from "../server/ingestion/promote.js";
import { getCuratedStoreStats } from "../server/curated-recipe-store.js";
import { getApifyToken } from "../server/ingestion/apify-client.js";
import { ApifyPinterestTrendSource } from "../server/ingestion/sources/apify-pinterest-trend-source.js";

async function main(): Promise<void> {
  const promote = process.argv.includes("--promote");
  const datasetOnly = process.argv.includes("--dataset-only");

  if (!getApifyToken() && !datasetOnly) {
    console.warn("[ingest-pinterest] No Apify token — falling back to trend-signals.json only");
  }

  await initCuratedRecipeStore();
  await initRecipeCatalog();
  await initIngestionStore();

  const sources = defaultIngestionSources({
    apifyPinterest: !datasetOnly || Boolean(process.env.APIFY_DATASET_ID),
    publisherUrls: true,
    spoonacularResolve: false,
    hallClassics: false,
  });

  if (datasetOnly && process.env.APIFY_DATASET_ID) {
    sources.trends = [
      new ApifyPinterestTrendSource({ useExistingDataset: true, maxItems: 60 }),
      ...sources.trends.filter((t) => t.name !== "apify_pinterest"),
    ];
  }

  console.log("[ingest-pinterest] Starting pipeline…");
  const stats = await runIngestionPipeline({
    promote,
    promoteLimit: 20,
    minQuality: 50,
    sources,
  });

  console.log("[ingest-pinterest] Stats:", stats);

  if (promote) {
    const requeued = requeuePromoteFailedStaging();
    if (requeued > 0) {
      console.log(`[ingest-pinterest] Requeued ${requeued} promote-failed rows`);
      const extra = await promoteValidatedStaging({ limit: 30, minQuality: 45 });
      console.log(`[ingest-pinterest] Extra promoted after requeue: ${extra}`);
    }
  }

  console.log("[ingest-pinterest] Ingestion summary:", getIngestionSummary());
  console.log("[ingest-pinterest] Last run:", getLatestIngestionRun()?.id);
  console.log("[ingest-pinterest] Curated DB:", getCuratedStoreStats());
}

main().catch((err) => {
  console.error("[ingest-pinterest]", err);
  process.exit(1);
});
