#!/usr/bin/env tsx
/**
 * Audit generator category filtering — 25 picks per category, 0 out-of-category results.
 *
 *   npm run audit:generator-categories
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  FIREHALL_CATEGORY_IDS,
  FIREHALL_CATEGORY_LABEL,
  slugMatchesFirehallCategory,
  type FirehallCategoryId,
} from "../shared/firehall-categories.js";
import { recipeMetaMatchesFirehallCategory } from "../shared/firehall-category-validation.js";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";
import { generateRequestSchema } from "../shared/schema.js";
import { initCacheStore } from "../server/cache-store.js";
import {
  getCuratedRecipeBySlug,
  getCuratedRecipeCategoryKeysBySlug,
  initCuratedRecipeStore,
} from "../server/curated-recipe-store.js";
import { runLocalFirstGeneratePipeline } from "../server/generation/local-first-pipeline.js";
import { flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";

const RUNS_PER_CATEGORY = 25;
const OUT_JSON = path.join(process.cwd(), "review", "generator-category-audit.json");
const OUT_MD = path.join(process.cwd(), "review", "generator-category-audit.md");

interface CategoryAuditResult {
  category: FirehallCategoryId;
  label: string;
  runs: number;
  successes: number;
  failures: Array<{ slug: string; reason: string; broadened?: boolean }>;
  broadenedCount: number;
}

function buildRequest(category: FirehallCategoryId) {
  const base = buildGenerateRequestInput({
    crew_size: 8,
    time_available: category === "quick_meals" ? "20-30" : "45-60",
    protein: category === "bbq_smoker" ? "pork" : "chicken",
    healthiness_preference:
      category === "healthy_options" || category === "high_protein" ? "lean" : "balanced",
    firehall_category: category,
  });
  const parsed = generateRequestSchema.parse(base);
  return parsed;
}

async function auditCategory(category: FirehallCategoryId): Promise<CategoryAuditResult> {
  const failures: CategoryAuditResult["failures"] = [];
  let successes = 0;
  let broadenedCount = 0;

  for (let i = 0; i < RUNS_PER_CATEGORY; i++) {
    const request = buildRequest(category);
    const hit = await runLocalFirstGeneratePipeline({
      request,
      v2SessionKey: `audit-${category}-${i}`,
      varietySeed: i,
      recentSignatures: [],
      recentSlugs: [],
      preferDifferentStyle: false,
      startTime: Date.now(),
    });

    const slug = String(hit.extras._slug ?? "");
    const keys = getCuratedRecipeCategoryKeysBySlug(slug);
    const full = getCuratedRecipeBySlug(slug);
    const broadened = Boolean(hit.extras._category_broadened);
    const matched = hit.extras._matched_firehall_category as FirehallCategoryId | undefined;

    if (broadened) broadenedCount++;

    const validateCategory =
      broadened && matched && matched !== category ? matched : category;

    const validation = recipeMetaMatchesFirehallCategory(
      {
        slug,
        totalMinutes: full?.totalMinutes ?? 0,
        mealFormat: full?.mealFormat,
        sourceKind: full?.source?.kind,
        categoryKeys: keys,
      },
      validateCategory,
    );

    const inPool = slugMatchesFirehallCategory(keys, validateCategory);
    const wrongCategory = !broadened && validateCategory !== category;

    if (!validation.ok || !inPool || wrongCategory) {
      failures.push({
        slug,
        reason: validation.reason ?? "missing fh tag",
        broadened,
      });
    } else {
      successes++;
    }
  }

  return {
    category,
    label: FIREHALL_CATEGORY_LABEL[category],
    runs: RUNS_PER_CATEGORY,
    successes,
    failures,
    broadenedCount,
  };
}

async function main(): Promise<void> {
  await initCacheStore();
  await initCuratedRecipeStore();

  const results: CategoryAuditResult[] = [];
  for (const category of FIREHALL_CATEGORY_IDS) {
    const result = await auditCategory(category);
    results.push(result);
    console.log(
      `[audit:generator-categories] ${category}: ${result.successes}/${result.runs} ok, broadened=${result.broadenedCount}, failures=${result.failures.length}`,
    );
  }

  const totalFailures = results.reduce((n, r) => n + r.failures.length, 0);
  const report = {
    generated_at: new Date().toISOString(),
    runs_per_category: RUNS_PER_CATEGORY,
    total_failures: totalFailures,
    results,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  const md = [
    "# Generator category audit",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "| Category | Label | OK | Failures | Broadened |",
    "|----------|-------|-----|----------|-----------|",
    ...results.map(
      (r) =>
        `| ${r.category} | ${r.label} | ${r.successes}/${r.runs} | ${r.failures.length} | ${r.broadenedCount} |`,
    ),
    "",
    totalFailures === 0 ? "**PASS** — 0 out-of-category results." : `**FAIL** — ${totalFailures} mismatches.`,
  ].join("\n");
  fs.writeFileSync(OUT_MD, md);

  await flushSqliteToDisk();
  releaseSqliteTimersForTests();

  assert.equal(totalFailures, 0, `Category audit failures: ${totalFailures} — see ${OUT_MD}`);
  console.log("[audit:generator-categories] OK");
}

main().catch((err) => {
  console.error("[audit:generator-categories] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
