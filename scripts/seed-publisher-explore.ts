#!/usr/bin/env tsx
/**
 * Ingest curated publisher recipes directly from trusted URLs (editorial seed).
 *
 *   npm run seed:publisher
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { initCuratedRecipeStore, upsertCuratedRecipe, getCuratedStoreStats } from "../server/curated-recipe-store.js";
import { fetchRecipePageHtml } from "../server/ingestion/extraction/fetch-recipe-page.js";
import { extractRecipeFromHtml } from "../server/ingestion/extraction/json-ld-recipe.js";
import { pickBestHeroImage } from "../server/ingestion/extraction/image-validator.js";
import { normalizeExtractedToDraft } from "../shared/ingestion/normalize-extracted.js";
import { curatedInsertFromIngestDraft } from "../server/curated-recipe-bridge.js";
import { buildGenerateResponseFromDraft } from "../server/ingestion/build-generate-response.js";
import { isTrustedPublisherUrl } from "../shared/ingestion/trusted-publishers.js";

const SEED_PATH = path.join(process.cwd(), "data", "ingestion", "publisher-seed-urls.json");

interface SeedEntry {
  url: string;
  pools?: string[];
  trendScore?: number;
}

async function main(): Promise<void> {
  if (!fs.existsSync(SEED_PATH)) {
    console.error("[seed:publisher] Missing", SEED_PATH);
    process.exit(1);
  }

  const { entries } = JSON.parse(fs.readFileSync(SEED_PATH, "utf8")) as { entries: SeedEntry[] };
  await initCuratedRecipeStore();

  let ok = 0;
  let skip = 0;

  for (const entry of entries) {
    if (!isTrustedPublisherUrl(entry.url)) {
      console.warn("[seed:publisher] skip untrusted", entry.url);
      skip++;
      continue;
    }

    try {
      const html = await fetchRecipePageHtml(entry.url);
      if (!html) {
        skip++;
        continue;
      }

      const extracted = extractRecipeFromHtml(html, entry.url);
      if (!extracted || extracted.ingredients.length < 3) {
        console.warn("[seed:publisher] JSON-LD miss", entry.url.slice(0, 60));
        skip++;
        continue;
      }

      const heroPick = await pickBestHeroImage(extracted.heroImage);
      extracted.heroImage = heroPick.url;

      const draft = normalizeExtractedToDraft(extracted, {
        trendScore: entry.trendScore ?? 85,
      });
      draft.exploreCategories = [
        ...new Set([...(draft.exploreCategories || []), ...(entry.pools || []), "trending"]),
      ];

      const insert = curatedInsertFromIngestDraft({
        ...draft,
        generateResponse: buildGenerateResponseFromDraft(draft),
      });
      insert.status = "published";
      insert.featured = insert.scores.quality >= 75;

      upsertCuratedRecipe(insert);
      ok++;
      console.log(`[seed:publisher] ✓ ${insert.title.slice(0, 50)} (${insert.source.name})`);
      await new Promise((r) => setTimeout(r, 900));
    } catch (e) {
      console.warn("[seed:publisher] fail", entry.url.slice(0, 50), (e as Error).message);
      skip++;
    }
  }

  console.log("\n[seed:publisher] DONE", { ok, skip, db: getCuratedStoreStats() });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
