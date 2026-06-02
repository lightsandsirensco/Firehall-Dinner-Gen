#!/usr/bin/env tsx
/**
 * Full nutrition integrity audit — all published catalogs, per-serving, auto-fix.
 *
 *   npm run audit:nutrition-integrity
 *   npm run audit:nutrition-integrity -- --fix
 */
import fs from "node:fs";
import path from "node:path";
import {
  auditRecipeNutritionIntegrity,
  summarizeNutritionIntegrity,
  verifyNutritionEnginePerServing,
  type NutritionCatalogId,
} from "../shared/nutrition/integrity-audit.js";
import {
  auditPerServingSuspicious,
  calculateNutritionFromIngredients,
  catalogIngredientsFromUnknown,
  hasCompleteNutrition,
  sumIngredientMacros,
} from "../shared/nutrition/index.js";
import { getVerifiedPerServingNutrition } from "../shared/nutrition/verified-per-serving.js";
import { getRecipeBaseServings } from "../shared/recipe/crew-scaling-config.js";
import { defaultRecipeServings } from "../shared/nutrition/servings.js";
import type { RecipeNutritionRecord } from "../shared/nutrition/types.js";

const ROOT = process.cwd();
const FIX = process.argv.includes("--fix");
const MD_OUT = path.join(ROOT, "review", "nutrition-integrity-audit.md");
const JSON_OUT = path.join(ROOT, "review", "nutrition-integrity-audit.json");

const CATALOGS: Array<{
  id: NutritionCatalogId;
  dir: string;
  mealType: "dinner" | "breakfast" | "smoothie";
}> = [
  { id: "golden_100", dir: "client/public/catalog/golden-100/pages", mealType: "dinner" },
  { id: "hall_expansion", dir: "client/public/catalog/hall-expansion/pages", mealType: "dinner" },
  { id: "performance_meals", dir: "client/public/catalog/performance-meals/pages", mealType: "dinner" },
  { id: "breakfast", dir: "client/public/catalog/breakfast/pages", mealType: "breakfast" },
  { id: "bbq_grill", dir: "client/public/catalog/bbq/pages", mealType: "dinner" },
  { id: "pizza_night", dir: "client/public/catalog/pizza-night/pages", mealType: "dinner" },
  { id: "smoothies", dir: "client/public/catalog/smoothies/pages", mealType: "smoothie" },
];

const UNTRUSTWORTHY = new Set([
  "calories_too_low",
  "calories_too_high",
  "likely_batch_total_stored",
  "protein_too_low_meat",
  "macro_calorie_divergence",
]);

function listJsonFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(abs, f));
}

function readPage(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
}

function existingMacros(page: Record<string, unknown>, mealType: "dinner" | "breakfast" | "smoothie") {
  const nutrition = page.nutrition as Record<string, unknown> | undefined;
  return {
    calories: Number(nutrition?.calories ?? page.calories ?? 0),
    protein: Number(nutrition?.protein ?? page.protein ?? 0),
    carbs: Number(nutrition?.carbs ?? page.carbs ?? 0),
    fat: Number(nutrition?.fats ?? nutrition?.fat ?? page.fats ?? page.fat ?? 0),
    source: nutrition?.source as string | undefined,
    estimateAvailable: nutrition?.estimateAvailable as boolean | undefined,
  };
}

function servingsFromPage(
  page: Record<string, unknown>,
  mealType: "dinner" | "breakfast" | "smoothie",
): number {
  return (
    getRecipeBaseServings({
      baseServings: Number(page.baseServings) || undefined,
      crewSize: Number(page.crewSize) || undefined,
    }) || defaultRecipeServings(page, mealType)
  );
}

function isTrustworthy(record: RecipeNutritionRecord, suspicions: ReturnType<typeof auditPerServingSuspicious>) {
  if (!record.estimateAvailable || record.source === "unavailable") return false;
  if (record.calories < 250 && record.protein > 0) return false;
  return !suspicions.some((s) => UNTRUSTWORTHY.has(s.code));
}

function applyNutrition(
  page: Record<string, unknown>,
  catalog: NutritionCatalogId,
  record: RecipeNutritionRecord,
): Record<string, unknown> {
  const next = { ...page };
  const available = record.estimateAvailable !== false && record.source !== "unavailable";
  const block: Record<string, unknown> = {
    calories: available ? record.calories : 0,
    protein: available ? record.protein : 0,
    carbs: available ? record.carbs : 0,
    ...(catalog === "breakfast" ? { fat: available ? record.fat : 0 } : { fats: available ? record.fat : 0 }),
    label: "Estimated per serving",
    source: record.source,
    estimateAvailable: available,
    filterFlags: record.filterFlags,
    badgeCandidates: record.badgeCandidates,
  };

  if (catalog === "smoothies") {
    const prev = (page.nutrition as Record<string, unknown>) || {};
    next.nutrition = {
      ...prev,
      ...block,
      highlights: available
        ? prev.highlights ||
          `~${record.calories} cal per serving · ~${record.protein} g protein · ~${record.carbs} g carbs · ~${record.fat} g fat`
        : "Nutrition estimate coming soon",
    };
  } else if (catalog === "breakfast") {
    next.nutrition = block;
  } else {
    next.calories = available ? record.calories : 0;
    next.protein = available ? record.protein : 0;
    next.carbs = available ? record.carbs : 0;
    next.fats = available ? record.fat : 0;
    next.nutrition = block;
  }
  return next;
}

function buildRecommended(
  slug: string,
  page: Record<string, unknown>,
  catalog: NutritionCatalogId,
  mealType: "dinner" | "breakfast" | "smoothie",
  servings: number,
): RecipeNutritionRecord {
  const ingredients = catalogIngredientsFromUnknown(page.ingredients);
  const mealPrepFriendly = Boolean(
    page.mealPrepNotes || (Array.isArray(page.tags) && page.tags.includes("make-ahead")),
  );
  return (
    getVerifiedPerServingNutrition(slug, servings, mealPrepFriendly) ??
    calculateNutritionFromIngredients(ingredients, {
      servings,
      mealType,
      mealPrepFriendly,
    })
  );
}

function auditAll(): ReturnType<typeof auditRecipeNutritionIntegrity>[] {
  const results: ReturnType<typeof auditRecipeNutritionIntegrity>[] = [];
  for (const { id, dir, mealType } of CATALOGS) {
    for (const file of listJsonFiles(dir)) {
      const page = readPage(file);
      const slug = String(page.slug || path.basename(file, ".json"));
      const title = String(page.displayTitle || page.title || slug);
      const baseServings = servingsFromPage(page, mealType);
      const ingredients = catalogIngredientsFromUnknown(page.ingredients);
      const stored = existingMacros(page, mealType);
      const recommended = buildRecommended(slug, page, id, mealType, baseServings);

      results.push(
        auditRecipeNutritionIntegrity({
          slug,
          title,
          catalog: id,
          mealType,
          category: typeof page.category === "string" ? page.category : undefined,
          baseServings,
          ingredients,
          stored,
          recommended,
        }),
      );
    }
  }

  return results;
}

function applyFixes(results: ReturnType<typeof auditRecipeNutritionIntegrity>[]): number {
  let fixed = 0;
  for (const { id, dir, mealType } of CATALOGS) {
    for (const file of listJsonFiles(dir)) {
      const page = readPage(file);
      const slug = String(page.slug || path.basename(file, ".json"));
      const row = results.find((r) => r.slug === slug && r.catalog === id);
      if (!row?.needsRecalculation && row?.status !== "fail") continue;

      const baseServings = servingsFromPage(page, mealType);
      const ingredients = catalogIngredientsFromUnknown(page.ingredients);
      const batch = sumIngredientMacros(ingredients);
      let record = buildRecommended(slug, page, id, mealType, baseServings);

      const suspicions = record.estimateAvailable
        ? auditPerServingSuspicious(
            {
              calories: record.calories,
              protein: record.protein,
              carbs: record.carbs,
              fat: record.fat,
            },
            {
              slug,
              title: String(page.title || slug),
              mealType,
              ingredients,
              servings: baseServings,
              batchTotals: {
                calories: batch.calories,
                protein: batch.protein,
                carbs: batch.carbs,
                fat: batch.fat,
              },
            },
          )
        : [];

      if (!isTrustworthy(record, suspicions)) {
        record = {
          ...record,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          source: "unavailable",
          estimateAvailable: false,
        };
      }

      const before = existingMacros(page, mealType);
      const changed =
        before.calories !== record.calories ||
        before.protein !== record.protein ||
        before.source !== record.source;

      if (changed || row.status === "fail") {
        fs.writeFileSync(file, `${JSON.stringify(applyNutrition(page, id, record), null, 2)}\n`, "utf8");
        fixed += 1;
      }
    }
  }
  return fixed;
}

function renderMd(
  summary: ReturnType<typeof summarizeNutritionIntegrity>,
  results: ReturnType<typeof auditRecipeNutritionIntegrity>[],
  mode: string,
  fixed: number,
  crewInvariantOk: boolean,
): string {
  const failRows = results.filter((r) => r.status === "fail");
  const lines = [
    "# Nutrition Integrity Audit — Firehall Meals",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: **${mode}**`,
    "",
    "## Executive summary",
    "",
    "All nutrition values are audited as **per single serving** (total recipe macros ÷ base servings).",
    "Crew size changes ingredient quantities on recipe pages; **nutrition does not scale with crew selector**.",
    "",
    "| Metric | Value |",
    "|--------|------:|",
    `| **Total recipes audited** | ${summary.total} |`,
    `| **PASS** | ${summary.pass} |`,
    `| **FAIL** | ${summary.fail} |`,
    `| Withheld (estimate coming soon) | ${summary.withheld} |`,
    `| Recipes fixed this run | ${fixed} |`,
    `| **Nutrition Accuracy %** (pass ÷ recipes with displayed macros) | **${summary.accuracyPct}%** |`,
    "",
    `Crew-size calculation invariant (engine): ${crewInvariantOk ? "PASS" : "FAIL"}`,
    "",
    "## Catalog coverage",
    "",
    "| Catalog | Recipes | Pass | Fail | Withheld |",
    "|---------|--------:|-----:|-----:|---------:|",
  ];

  for (const id of CATALOGS.map((c) => c.id)) {
    const subset = results.filter((r) => r.catalog === id);
    lines.push(
      `| ${id.replace(/_/g, " ")} | ${subset.length} | ${subset.filter((r) => r.status === "pass").length} | ${subset.filter((r) => r.status === "fail").length} | ${subset.filter((r) => r.status === "withheld").length} |`,
    );
  }

  lines.push(
    "",
    "## Issue counts",
    "",
    "| Issue | Count |",
    "|-------|------:|",
    `| Suspicious calories | ${summary.suspiciousCalories.length} |`,
    `| Suspicious protein | ${summary.suspiciousProtein.length} |`,
    `| Suspicious carbs | ${summary.suspiciousCarbs.length} |`,
    `| Suspicious fat | ${summary.suspiciousFat.length} |`,
    `| UI shows zero macros | ${summary.zeroUi.length} |`,
    `| Nutrition coupled to wrong crew divisor | ${summary.crewCoupled.length} |`,
    `| Needs recalculation | ${summary.needsRecalculation.length} |`,
    "",
  );

  const listSection = (title: string, slugs: string[]) => {
    lines.push(`## ${title}`, "");
    if (!slugs.length) {
      lines.push("_None._", "");
      return;
    }
    for (const slug of slugs.slice(0, 50)) {
      const row = results.find((r) => r.slug === slug);
      lines.push(`- \`${slug}\`${row ? ` — ${row.stored}` : ""}`);
    }
    if (slugs.length > 50) lines.push(`\n_…and ${slugs.length - 50} more._`);
    lines.push("");
  };

  listSection("Recipes with suspicious calories", summary.suspiciousCalories);
  listSection("Recipes with suspicious protein", summary.suspiciousProtein);
  listSection("Recipes with suspicious carbs", summary.suspiciousCarbs);
  listSection("Recipes with suspicious fat", summary.suspiciousFat);
  listSection("Recipes showing zero values in UI", summary.zeroUi);
  listSection("Recipes where nutrition may track crew size (wrong divisor)", summary.crewCoupled);
  listSection("Recipes needing recalculation", summary.needsRecalculation);

  lines.push("## UI surfaces checked", "", "| Surface | Rule |", "|---------|------|");
  lines.push("| Recipe pages | `RecipeNutritionPanel` — per serving from page JSON |");
  lines.push("| Explore cards | Macros from catalog page JSON (not crew-scaled) |");
  lines.push("| Classics wheel | Golden 100 page nutrition |");
  lines.push("| Generator | Dynamic meals — excluded from static JSON audit |");
  lines.push("");
  lines.push("## FAIL details (sample)", "");
  if (!failRows.length) {
    lines.push("_No failures._");
  } else {
    for (const row of failRows.slice(0, 35)) {
      lines.push(`### ${row.slug} (${row.catalog})`);
      lines.push(`- **${row.title}** · ${row.servings} base servings`);
      lines.push(`- Stored: ${row.stored}`);
      if (row.recommended) lines.push(`- Recommended: ${row.recommended}`);
      for (const f of row.findings.slice(0, 5)) lines.push(`- ${f.message}`);
      lines.push("");
    }
    if (failRows.length > 35) lines.push(`_…and ${failRows.length - 35} more in JSON._`);
  }

  lines.push(
    "",
    "## Validation rules applied",
    "",
    "1. Per-serving only (not batch/tray/crew totals)",
    "2. Meat meals: protein ≥ 10g; starch meals: carbs ≥ 5g when rice/pasta/bread present",
    "3. Macro calories within ~50–150% of label calories",
    "4. Ingredient-sum cross-check (±45–85% drift flagged)",
    "5. Protein targets: Performance 35–60g · Breakfast 20–45g · BBQ 30–55g · Comfort 25–45g · Smoothies 20–45g",
    "6. Crew sizes 2–12: ingredient scaling changes; per-serving nutrition must not",
    "",
    "## Commands",
    "",
    "```bash",
    "npm run audit:nutrition-integrity",
    "npm run audit:nutrition-integrity -- --fix",
    "npm run audit:nutrition-per-serving -- --fix",
    "```",
    "",
  );

  return lines.join("\n");
}

function main(): void {
  let results = auditAll();
  let fixed = 0;
  if (FIX) {
    fixed = applyFixes(results);
    results = auditAll();
  }

  const summary = summarizeNutritionIntegrity(results);
  let crewInvariantOk = true;
  const sampleFile = listJsonFiles(CATALOGS[0].dir)[0];
  if (sampleFile) {
    const samplePage = readPage(sampleFile);
    const engine = verifyNutritionEnginePerServing(
      catalogIngredientsFromUnknown(samplePage.ingredients),
      servingsFromPage(samplePage, "dinner"),
      "dinner",
    );
    crewInvariantOk = engine.stableAtBase && engine.variesIfCrewUsedAsServings;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    mode: FIX ? "fix" : "audit",
    summary,
    fixed,
    results,
  };

  fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    MD_OUT,
    renderMd(summary, results, FIX ? "fix + re-audit" : "audit", fixed, crewInvariantOk),
  );

  console.log(
    `[audit:nutrition-integrity] total=${summary.total} pass=${summary.pass} fail=${summary.fail} withheld=${summary.withheld} accuracy=${summary.accuracyPct}% fixed=${fixed}`,
  );
  console.log(`[audit:nutrition-integrity] md → ${MD_OUT}`);

  if (summary.fail > 0 && !FIX) {
    process.exit(1);
  }
}

main();
