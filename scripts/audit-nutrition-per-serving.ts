#!/usr/bin/env tsx
/**
 * Per-serving nutrition audit + fix for approved catalog recipes.
 *
 *   npm run audit:nutrition-per-serving
 *   npm run audit:nutrition-per-serving -- --fix
 */
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";
import {
  calculateNutritionFromIngredients,
  catalogIngredientsFromUnknown,
  hasCompleteNutrition,
  validateNutritionPerServing,
  auditPerServingSuspicious,
  sumIngredientMacros,
} from "../shared/nutrition/index.js";
import { getVerifiedPerServingNutrition } from "../shared/nutrition/verified-per-serving.js";
import { getRecipeBaseServings } from "../shared/recipe/crew-scaling-config.js";
import { defaultRecipeServings } from "../shared/nutrition/servings.js";
import type { RecipeNutritionRecord } from "../shared/nutrition/types.js";
import type { PerServingSuspicion } from "../shared/nutrition/per-serving-audit.js";

const ROOT = process.cwd();
const FIX = process.argv.includes("--fix");
const JSON_OUT = path.join(ROOT, "review", "nutrition-per-serving-audit.json");
const MD_OUT = path.join(ROOT, "review", "nutrition-per-serving-audit.md");

type MealType = "dinner" | "breakfast" | "smoothie";

type RowStatus = "ok" | "fixed" | "suspicious" | "hidden" | "batch_corrected";

interface AuditRow {
  slug: string;
  kind: ApprovedCatalogEntry["kind"];
  title: string;
  servings: number;
  status: RowStatus;
  before?: string;
  after?: string;
  issues: string[];
}

function resolvePageJsonPath(slug: string, kind: ApprovedCatalogEntry["kind"]): string | null {
  const candidates = [
    kind === "breakfast_catalog" ? `client/public/catalog/breakfast/pages/${slug}.json` : null,
    kind === "bbq_catalog" ? `client/public/catalog/bbq/pages/${slug}.json` : null,
    kind === "smoothie" ? `client/public/catalog/smoothies/pages/${slug}.json` : null,
    `client/public/catalog/golden-100/pages/${slug}.json`,
    `client/public/catalog/performance-meals/pages/${slug}.json`,
    `client/public/catalog/hall-expansion/pages/${slug}.json`,
  ].filter(Boolean) as string[];
  for (const rel of candidates) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function mealTypeForKind(kind: ApprovedCatalogEntry["kind"]): MealType {
  if (kind === "breakfast_catalog") return "breakfast";
  if (kind === "smoothie") return "smoothie";
  return "dinner";
}

function readPage(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
}

function existingMacros(page: Record<string, unknown>, kind: ApprovedCatalogEntry["kind"]) {
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

function servingsFromPage(page: Record<string, unknown>, mealType: MealType): number {
  return getRecipeBaseServings({
    baseServings: Number(page.baseServings) || undefined,
    crewSize: Number(page.crewSize) || undefined,
  }) || defaultRecipeServings(page, mealType);
}

function applyNutrition(
  page: Record<string, unknown>,
  kind: ApprovedCatalogEntry["kind"],
  record: RecipeNutritionRecord,
): Record<string, unknown> {
  const next = { ...page };
  const available = record.estimateAvailable !== false && record.source !== "unavailable";

  const block: Record<string, unknown> = {
    calories: available ? record.calories : 0,
    protein: available ? record.protein : 0,
    carbs: available ? record.carbs : 0,
    ...(kind === "breakfast" ? { fat: available ? record.fat : 0 } : { fats: available ? record.fat : 0 }),
    label: "Estimated per serving",
    source: record.source,
    estimateAvailable: available,
    filterFlags: record.filterFlags,
    badgeCandidates: record.badgeCandidates,
  };

  if (kind === "smoothie") {
    const prev = (page.nutrition as Record<string, unknown>) || {};
    next.nutrition = {
      ...prev,
      ...block,
      highlights: available
        ? prev.highlights ||
          `~${record.calories} cal per serving · ~${record.protein} g protein · ~${record.carbs} g carbs · ~${record.fat} g fat`
        : "Nutrition estimate coming soon",
    };
  } else if (kind === "breakfast_catalog") {
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

function fmt(m: { calories: number; protein: number; carbs: number; fat: number }): string {
  return `${m.calories} cal · ${m.protein}g P · ${m.carbs}g C · ${m.fat}g F`;
}

const UNTRUSTWORTHY_CODES = new Set<PerServingSuspicion["code"]>([
  "calories_too_low",
  "calories_too_high",
  "likely_batch_total_stored",
  "protein_too_low_meat",
  "macro_calorie_divergence",
]);

function isTrustworthyEstimate(
  record: RecipeNutritionRecord,
  suspicions: PerServingSuspicion[],
  mealType: MealType,
): boolean {
  if (!record.estimateAvailable || record.source === "unavailable") return false;
  if (mealType !== "smoothie" && record.calories < 250) return false;
  return !suspicions.some((s) => UNTRUSTWORTHY_CODES.has(s.code));
}

function main(): void {
  const rows: AuditRow[] = [];
  let fixed = 0;
  let hidden = 0;
  let suspicious = 0;
  let batchCorrected = 0;

  const entries = buildAllApprovedCatalogEntries();

  for (const entry of entries) {
    const file = resolvePageJsonPath(entry.slug, entry.kind);
    if (!file) continue;

    const page = readPage(file);
    const mealType = mealTypeForKind(entry.kind);
    const title = String(page.displayTitle || page.title || entry.title);
    const servings = servingsFromPage(page, mealType);
    const ingredients = catalogIngredientsFromUnknown(page.ingredients);
    const before = existingMacros(page, entry.kind);

    const batch = sumIngredientMacros(ingredients);
    const batchMacros = {
      calories: batch.calories,
      protein: batch.protein,
      carbs: batch.carbs,
      fat: batch.fat,
    };

    const mealPrepFriendly = Boolean(
      page.mealPrepNotes || (Array.isArray(page.tags) && page.tags.includes("make-ahead")),
    );
    const record =
      getVerifiedPerServingNutrition(entry.slug, servings, mealPrepFriendly) ??
      calculateNutritionFromIngredients(ingredients, {
        servings,
        mealType,
        mealPrepFriendly,
        existing: undefined,
      });

    const after = {
      calories: record.calories,
      protein: record.protein,
      carbs: record.carbs,
      fat: record.fat,
    };

    const issues: string[] = [];
    const suspicionList = record.estimateAvailable
      ? auditPerServingSuspicious(after, {
          slug: entry.slug,
          title,
          mealType,
          ingredients,
          servings,
          batchTotals: batchMacros,
        })
      : [];

    const wasBatch =
      hasCompleteNutrition(before, { source: before.source, estimateAvailable: before.estimateAvailable }) &&
      auditPerServingSuspicious(before, {
        title,
        mealType,
        ingredients,
        servings,
        batchTotals: batchMacros,
      }).some((i) => i.code === "likely_batch_total_stored");

    if (wasBatch) {
      issues.push("Corrected batch total stored as per-serving");
      batchCorrected += 1;
    }

    let finalRecord = record;
    if (!isTrustworthyEstimate(record, suspicionList, mealType)) {
      finalRecord = {
        ...record,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        source: "unavailable",
        estimateAvailable: false,
      };
      issues.push("Estimate withheld — insufficient or unrealistic per-serving data");
    } else {
      issues.push(...suspicionList.map((i) => i.message));
      issues.push(
        ...validateNutritionPerServing(after, { slug: entry.slug, mealType })
          .filter((i) => i.code === "suspicious" || i.code === "impossible")
          .map((i) => i.message),
      );
    }

    const displayAfter = {
      calories: finalRecord.calories,
      protein: finalRecord.protein,
      carbs: finalRecord.carbs,
      fat: finalRecord.fat,
    };

    const changed =
      before.calories !== displayAfter.calories ||
      before.protein !== displayAfter.protein ||
      before.carbs !== displayAfter.carbs ||
      before.fat !== displayAfter.fat ||
      before.source !== finalRecord.source;

    let status: RowStatus = "ok";
    if (!finalRecord.estimateAvailable) {
      status = "hidden";
      hidden += 1;
    } else if (suspicionList.some((s) => UNTRUSTWORTHY_CODES.has(s.code))) {
      status = "suspicious";
      suspicious += 1;
    }

    if (FIX && (changed || !finalRecord.estimateAvailable || wasBatch)) {
      const updated = applyNutrition(page, entry.kind, finalRecord);
      fs.writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
      fixed += 1;
      if (status === "hidden") {
        /* stays hidden */
      } else if (wasBatch) {
        status = "batch_corrected";
      } else if (status === "suspicious") {
        status = "fixed";
      } else {
        status = "fixed";
      }
    }

    rows.push({
      slug: entry.slug,
      kind: entry.kind,
      title,
      servings,
      status,
      before: hasCompleteNutrition(before, {
        source: before.source,
        estimateAvailable: before.estimateAvailable,
      })
        ? fmt(before)
        : "incomplete",
      after: finalRecord.estimateAvailable ? fmt(displayAfter) : "hidden",
      issues: [...new Set(issues)].slice(0, 6),
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: FIX ? "fix" : "audit",
    totals: {
      recipesAudited: rows.length,
      recipesFixed: fixed,
      hiddenDueToIncomplete: hidden,
      suspiciousRemaining: rows.filter((r) => r.status === "suspicious").length,
      batchCorrected,
      ok: rows.filter((r) => r.status === "ok" || r.status === "fixed" || r.status === "batch_corrected").length,
    },
    rows,
  };

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    "# Nutrition Per-Serving Audit",
    "",
    `Generated: ${report.generatedAt}`,
    `Mode: **${report.mode}**`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `|--------|------:|`,
    `| Recipes audited | ${report.totals.recipesAudited} |`,
    `| Recipes fixed (this run) | ${report.totals.recipesFixed} |`,
    `| Hidden (estimate coming soon) | ${report.totals.hiddenDueToIncomplete} |`,
    `| Suspicious remaining | ${report.totals.suspiciousRemaining} |`,
    `| Batch totals corrected | ${report.totals.batchCorrected} |`,
    "",
    "All displayed values are **per single serving** (total recipe nutrition ÷ servings).",
    "",
    "## Suspicious",
    "",
  ];

  const suspiciousRows = rows.filter((r) => r.status === "suspicious");
  if (!suspiciousRows.length) {
    md.push("_None._");
  } else {
    for (const r of suspiciousRows.slice(0, 40)) {
      md.push(`### ${r.slug}`);
      md.push(`- **${r.title}** (${r.servings} servings)`);
      md.push(`- After: ${r.after}`);
      for (const i of r.issues) md.push(`- ${i}`);
      md.push("");
    }
    if (suspiciousRows.length > 40) md.push(`_…and ${suspiciousRows.length - 40} more in JSON._`);
  }

  md.push("", "## Hidden (incomplete estimate)", "");
  const hiddenRows = rows.filter((r) => r.status === "hidden");
  if (!hiddenRows.length) md.push("_None._");
  else hiddenRows.forEach((r) => md.push(`- \`${r.slug}\` — ${r.title}`));

  fs.writeFileSync(MD_OUT, `${md.join("\n")}\n`);

  console.log(
    `[audit:nutrition-per-serving] audited=${report.totals.recipesAudited} fixed=${fixed} hidden=${hidden} suspicious=${report.totals.suspiciousRemaining}`,
  );
  console.log(`[audit:nutrition-per-serving] json → ${JSON_OUT}`);
  console.log(`[audit:nutrition-per-serving] md → ${MD_OUT}`);
}

main();
