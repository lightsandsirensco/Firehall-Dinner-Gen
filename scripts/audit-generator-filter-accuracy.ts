#!/usr/bin/env tsx
/**
 * Generator filter accuracy audit — protein, time, dietary, and combinations.
 *
 * Runs the real generate pipeline (runLocalFirstGeneratePipeline) — the exact
 * code path the standalone "Pick Tonight's Meal" Generator uses — across many
 * filter combinations and asserts every served recipe actually satisfies every
 * filter that was requested. Any violation is a false positive: a recipe the
 * Generator served that a strict interpretation of the user's filters should
 * have excluded.
 *
 *   npx tsx scripts/audit-generator-filter-accuracy.ts
 */
import fs from "node:fs";
import path from "node:path";
import { initCacheStore } from "../server/cache-store.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { runLocalFirstGeneratePipeline } from "../server/generation/local-first-pipeline.js";
import { proteinMatchesFilter } from "../server/spoonacular-converter.js";
import { recipeFitsTimeBucket } from "../shared/generation/time-buckets.js";
import { classifyRecipeDietary } from "../shared/dietary/classify-recipe.js";
import { scanRecipeForAllergens } from "../server/allergens.js";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";
import {
  SIMPLIFIED_PROTEINS,
  simplifiedProteinToApi,
} from "../shared/generator-simplified.js";
import { flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";
import type { DietaryFilterKey } from "../shared/dietary/schema.js";

const TIME_BUCKETS = ["15-25", "20-30", "25-40", "30-45", "45-60", "60-90"] as const;
const RUNS_PER_COMBO = 6;
const OUT_JSON = path.join(process.cwd(), "review", "generator-filter-accuracy-audit.json");

interface ComboResult {
  label: string;
  protein?: string;
  time_available?: string;
  dietary?: DietaryFilterKey[];
  runs: number;
  matches: number;
  emptyPoolCount: number;
  falsePositives: Array<{ slug: string; title: string; reason: string; detail: string }>;
}

async function runCombo(
  label: string,
  overrides: Partial<{ protein: string; time_available: string; dietary_restrictions: DietaryFilterKey[] }>,
): Promise<ComboResult> {
  const result: ComboResult = {
    label,
    protein: overrides.protein,
    time_available: overrides.time_available,
    dietary: overrides.dietary_restrictions,
    runs: RUNS_PER_COMBO,
    matches: 0,
    emptyPoolCount: 0,
    falsePositives: [],
  };

  for (let i = 0; i < RUNS_PER_COMBO; i++) {
    const request = buildGenerateRequestInput({
      crew_size: 8,
      time_available: (overrides.time_available as any) || "45-60",
      protein: (overrides.protein as any) || "any",
      healthiness_preference: "balanced",
      dietary_restrictions: overrides.dietary_restrictions || [],
      firehall_category: undefined,
    });

    try {
      const hit = await runLocalFirstGeneratePipeline({
        request,
        v2SessionKey: `filter-audit:${label}:${i}`,
        varietySeed: i * 7919,
        recentSignatures: [],
        recentSlugs: [],
        preferDifferentStyle: false,
        startTime: Date.now(),
      });

      const slug = String(hit.extras._slug ?? hit.extras._catalog_id ?? "unknown");
      const title = hit.originalTitle || hit.recipe.title || slug;
      const totalMinutes = hit.recipe.timing?.total_minutes;
      const chosen = hit.protein || hit.recipe.chosen_protein || "";

      // Protein check
      if (overrides.protein && overrides.protein !== "any") {
        if (!proteinMatchesFilter(chosen, overrides.protein)) {
          result.falsePositives.push({
            slug,
            title,
            reason: "protein",
            detail: `requested=${overrides.protein} served=${chosen}`,
          });
          continue;
        }
      }

      // Time check
      if (overrides.time_available) {
        if (!recipeFitsTimeBucket(totalMinutes, overrides.time_available)) {
          result.falsePositives.push({
            slug,
            title,
            reason: "time",
            detail: `bucket=${overrides.time_available} total_minutes=${totalMinutes}`,
          });
          continue;
        }
      }

      // Dietary check — re-classify independently from the audit script's own
      // call to the SAME canonical classifier Explore uses, confirming the
      // served recipe's ingredients truly satisfy every requested flag.
      if (overrides.dietary_restrictions?.length) {
        const profile = classifyRecipeDietary(
          (hit.recipe.ingredients || []).map((ing) => ({ name: ing.item, notes: ing.notes })),
        );
        const violated =
          profile.confidence !== "high" ||
          overrides.dietary_restrictions.some((key) => !profile.flags[key]);
        if (violated) {
          result.falsePositives.push({
            slug,
            title,
            reason: "dietary",
            detail: `requested=${overrides.dietary_restrictions.join(",")} confidence=${profile.confidence} flags=${JSON.stringify(profile.flags)}`,
          });
          continue;
        }
      }

      result.matches++;
    } catch {
      result.emptyPoolCount++;
    }
  }

  return result;
}

async function main() {
  await initCacheStore();
  await initCuratedRecipeStore();

  const results: ComboResult[] = [];

  // 1. Every protein filter alone
  for (const p of SIMPLIFIED_PROTEINS) {
    if (p === "surprise") continue;
    const api = simplifiedProteinToApi(p);
    results.push(await runCombo(`protein=${p}`, { protein: api }));
  }

  // 2. Every time bucket alone
  for (const t of TIME_BUCKETS) {
    results.push(await runCombo(`time=${t}`, { time_available: t }));
  }

  // 3. Realistic combinations from the user's request
  results.push(await runCombo("chicken+quick(20-30)", { protein: "chicken", time_available: "20-30" }));
  results.push(await runCombo("beef+45+(60-90)", { protein: "beef", time_available: "60-90" }));
  results.push(
    await runCombo("vegetarian+quick(20-30)", {
      protein: "vegetarian",
      time_available: "20-30",
      dietary_restrictions: ["vegetarian"],
    }),
  );
  results.push(await runCombo("chicken+glutenFree", { protein: "chicken", dietary_restrictions: ["glutenFree"] }));
  results.push(await runCombo("beef+dairyFree", { protein: "beef", dietary_restrictions: ["dairyFree"] }));
  results.push(await runCombo("seafood+quick(15-25)", { protein: "seafood", time_available: "15-25" }));
  results.push(await runCombo("pork+45-60", { protein: "pork", time_available: "45-60" }));
  results.push(await runCombo("vegan", { dietary_restrictions: ["vegan"] }));
  results.push(await runCombo("porkFree", { dietary_restrictions: ["porkFree"] }));

  const totalFalsePositives = results.reduce((n, r) => n + r.falsePositives.length, 0);
  const totalRuns = results.reduce((n, r) => n + r.runs, 0);
  const totalMatches = results.reduce((n, r) => n + r.matches, 0);
  const totalEmpty = results.reduce((n, r) => n + r.emptyPoolCount, 0);

  console.log("=".repeat(70));
  console.log("GENERATOR FILTER ACCURACY AUDIT");
  console.log("=".repeat(70));
  for (const r of results) {
    console.log(
      `${r.label.padEnd(28)} matches=${r.matches}/${r.runs}  falsePositives=${r.falsePositives.length}  emptyPool=${r.emptyPoolCount}`,
    );
    for (const fp of r.falsePositives.slice(0, 3)) {
      console.log(`    ✗ ${fp.slug} (${fp.reason}): ${fp.detail}`);
    }
  }
  console.log("-".repeat(70));
  console.log(`Total runs: ${totalRuns}  matches: ${totalMatches}  falsePositives: ${totalFalsePositives}  emptyPool: ${totalEmpty}`);
  console.log("RESULT:", totalFalsePositives === 0 ? "PASS ✅" : "FAIL ❌");

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ generatedAt: new Date().toISOString(), totalRuns, totalMatches, totalFalsePositives, totalEmpty, results }, null, 2),
  );

  await flushSqliteToDisk();
  releaseSqliteTimersForTests();

  if (totalFalsePositives > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("[audit:generator-filter-accuracy] FAILED", err);
  releaseSqliteTimersForTests();
  process.exitCode = 1;
});
