#!/usr/bin/env tsx
/**
 * Simplified generator QA — 100+ filter combinations, metadata gap audit.
 *
 *   npm run test:generator-simplified-qa
 */
import fs from "node:fs";
import path from "node:path";
import { initCacheStore } from "../server/cache-store.js";
import { initCuratedRecipeStore, listCuratedSummariesByTag } from "../server/curated-recipe-store.js";
import { runLocalFirstGeneratePipeline } from "../server/generation/local-first-pipeline.js";
import {
  recipeMatchesAllergens,
  recipeMatchesAppliances,
  recipeMatchesProtein,
  recipeMatchesCrew,
  inferServedHealthiness,
  listCatalogMetadataGaps,
} from "../server/generation/generator-match.js";
import { getCuratedRecipeBySlug } from "../server/curated-recipe-store.js";
import { scanRecipeForAllergens } from "../server/allergens.js";
import { proteinMatchesFilter } from "../server/spoonacular-converter.js";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";
import {
  CREW_SIZE_BUCKETS,
  CREW_BUCKET_TO_SIZE,
  SIMPLIFIED_ALLERGENS,
  SIMPLIFIED_APPLIANCE_IDS,
  SIMPLIFIED_PROTEINS,
  HEALTHINESS_OPTIONS,
  simplifiedAppliancesToRequest,
  simplifiedProteinToApi,
  type SimplifiedGeneratorFilters,
} from "../shared/generator-simplified.js";
import { GOLDEN_SET_TAG } from "../shared/golden-100/types.js";
import { isApprovedCatalogSlug } from "../shared/hall-catalog/gate.js";
import { flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";

const ROOT = process.cwd();
const MD_OUT = path.join(ROOT, "review", "generator-simplification-qa.json");

interface QaRow {
  index: number;
  ok: boolean;
  slug?: string;
  title?: string;
  error?: string;
  proteinOk?: boolean;
  allergenOk?: boolean;
  applianceOk?: boolean;
  crewOk?: boolean;
  healthinessMatch?: boolean;
  healthinessRelaxed?: boolean;
  filters: SimplifiedGeneratorFilters;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function buildCombos(): SimplifiedGeneratorFilters[] {
  const combos: SimplifiedGeneratorFilters[] = [];
  const applianceVariants: (typeof SIMPLIFIED_APPLIANCE_IDS[number])[][] = [
    [],
    ["bbq"],
    ["oven"],
    ["stovetop"],
    ["bbq", "oven"],
    ["slow_cooker"],
    ["air_fryer"],
    ["smoker"],
    ["flat_top"],
  ];
  const allergenVariants: (typeof SIMPLIFIED_ALLERGENS[number])[][] = [
    [],
    ["dairy"],
    ["gluten"],
    ["nuts"],
    ["shellfish"],
    ["eggs"],
    ["dairy", "gluten"],
  ];

  for (const crew_bucket of CREW_SIZE_BUCKETS) {
    for (const protein of SIMPLIFIED_PROTEINS) {
      for (const healthiness of HEALTHINESS_OPTIONS.map((h) => h.value)) {
        for (const appliances of applianceVariants) {
          for (const allergens of allergenVariants) {
            combos.push({ crew_bucket, protein, appliances: [...appliances], healthiness, allergens: [...allergens] });
            if (combos.length >= 120) return combos;
          }
        }
      }
    }
  }
  return combos;
}

function filtersToRequest(f: SimplifiedGeneratorFilters) {
  return buildGenerateRequestInput({
    crew_size: CREW_BUCKET_TO_SIZE[f.crew_bucket],
    time_available: "45-60",
    busy_level: "average",
    appliances: simplifiedAppliancesToRequest(f.appliances),
    protein: simplifiedProteinToApi(f.protein),
    healthiness_preference: f.healthiness,
    allergens_to_avoid: [...f.allergens],
    firehall_category: undefined,
    cuisine_style: "any",
    meal_format: "random",
  });
}

await initCacheStore();
await initCuratedRecipeStore();

const combos = buildCombos();
assert(combos.length >= 100, `Expected >=100 combos, got ${combos.length}`);

const catalogSlugs = listCuratedSummariesByTag(GOLDEN_SET_TAG, 200)
  .map((r) => r.slug)
  .filter(isApprovedCatalogSlug);
const metadataGaps = listCatalogMetadataGaps(catalogSlugs);

const rows: QaRow[] = [];
let pass = 0;
let fail = 0;

for (let i = 0; i < combos.length; i++) {
  const filters = combos[i]!;
  const request = filtersToRequest(filters);
  const row: QaRow = { index: i + 1, ok: false, filters };

  try {
    const hit = await runLocalFirstGeneratePipeline({
      request,
      v2SessionKey: `qa:${i}`,
      varietySeed: i,
      startTime: Date.now(),
      preferDifferentStyle: false,
    });

    const full = getCuratedRecipeBySlug(hit.extras._slug as string);
    row.slug = hit.extras._slug as string;
    row.title = hit.originalTitle;
    row.healthinessRelaxed = Boolean(hit.extras._healthiness_relaxed);

    const chosen = hit.protein || hit.recipe.chosen_protein || "";
    const wantProtein = request.protein || "any";
    row.proteinOk =
      wantProtein === "any" || proteinMatchesFilter(chosen, wantProtein);

    if (full) {
      row.allergenOk = recipeMatchesAllergens(full, request.allergens_to_avoid || []);
      row.applianceOk = recipeMatchesAppliances(full, request.appliances || []);
      row.crewOk = recipeMatchesCrew(full, request.crew_size);
      const served = inferServedHealthiness(full);
      row.healthinessMatch = served === request.healthiness_preference || row.healthinessRelaxed;
    } else {
      row.allergenOk = true;
      row.applianceOk = true;
      row.crewOk = true;
      row.healthinessMatch = true;
    }

    const ingredients = (hit.recipe.ingredients || []).map((ing) => ({
      item: ing.item,
      amount: ing.amount,
      notes: ing.notes,
    }));
    const scan = scanRecipeForAllergens(
      ingredients,
      hit.recipe.steps || [],
      hit.recipe.title,
      request.allergens_to_avoid || [],
    );
    if (scan.found) row.allergenOk = false;

    if (full) {
      row.proteinOk = row.proteinOk && recipeMatchesProtein(full, request);
    }

    row.ok = Boolean(row.proteinOk && row.allergenOk && row.applianceOk);
    if (row.ok) pass++;
    else fail++;
  } catch (e) {
    row.error = e instanceof Error ? e.message : String(e);
    fail++;
  }

  rows.push(row);
}

const report = {
  generatedAt: new Date().toISOString(),
  totalCombinations: combos.length,
  pass,
  fail,
  passRate: `${((pass / combos.length) * 100).toFixed(1)}%`,
  crewAppropriateRate: `${((rows.filter((r) => r.crewOk !== false).length / combos.length) * 100).toFixed(1)}%`,
  healthinessMatchRate: `${((rows.filter((r) => r.healthinessMatch).length / combos.length) * 100).toFixed(1)}%`,
  metadataGaps,
  failures: rows.filter((r) => !r.ok).slice(0, 25),
  healthinessRelaxedCount: rows.filter((r) => r.healthinessRelaxed).length,
};

fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
fs.writeFileSync(MD_OUT, JSON.stringify(report, null, 2));

console.log(`[test-generator-simplified-qa] combos=${combos.length} pass=${pass} fail=${fail}`);
console.log(`[test-generator-simplified-qa] metadata gaps=${metadataGaps.length}`);
console.log(`[test-generator-simplified-qa] report → ${MD_OUT}`);

flushSqliteToDisk();
releaseSqliteTimersForTests();

if (fail > Math.ceil(combos.length * 0.15)) {
  console.error("[test-generator-simplified-qa] FAIL — too many failures");
  process.exit(1);
}

console.log("[test-generator-simplified-qa] OK");
process.exit(0);
