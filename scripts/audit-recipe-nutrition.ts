#!/usr/bin/env tsx
/**
 * Audit + backfill nutrition macros for all curated catalog JSON pages.
 *
 * Usage:
 *   tsx scripts/audit-recipe-nutrition.ts          # report only
 *   tsx scripts/audit-recipe-nutrition.ts --fix    # write corrected JSON
 */
import fs from "node:fs";
import path from "node:path";
import {
  calculateNutritionFromIngredients,
  hasCompleteNutrition,
  validateNutritionPerServing,
  defaultRecipeServings,
  catalogIngredientsFromUnknown,
  type CatalogIngredientLine,
} from "../shared/nutrition/index.js";
import { getRecipeBaseServings } from "../shared/recipe/crew-scaling-config.js";

const ROOT = process.cwd();
const FIX = process.argv.includes("--fix");
const REPORT_PATH = path.join(ROOT, "review", "recipe-nutrition-audit-report.md");

type CatalogKind = "golden" | "performance" | "hall-expansion" | "breakfast" | "smoothie" | "bbq";

const CATALOG_DIRS: Array<{ kind: CatalogKind; dir: string; mealType: "dinner" | "breakfast" | "smoothie" }> = [
  { kind: "golden", dir: "client/public/catalog/golden-100/pages", mealType: "dinner" },
  { kind: "performance", dir: "client/public/catalog/performance-meals/pages", mealType: "dinner" },
  { kind: "hall-expansion", dir: "client/public/catalog/hall-expansion/pages", mealType: "dinner" },
  { kind: "breakfast", dir: "client/public/catalog/breakfast/pages", mealType: "breakfast" },
  { kind: "smoothie", dir: "client/public/catalog/smoothies/pages", mealType: "smoothie" },
  { kind: "bbq", dir: "client/public/catalog/bbq/pages", mealType: "dinner" },
];

interface AuditRow {
  slug: string;
  catalog: CatalogKind;
  status: "ok" | "missing" | "corrected" | "suspicious";
  issues: string[];
  before?: string;
  after?: string;
}

function listJsonFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(abs, f));
}

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
}

function ingredientsFromPage(page: Record<string, unknown>): CatalogIngredientLine[] {
  const raw = page.ingredients;
  if (!Array.isArray(raw)) return [];
  return raw.map((ing) => {
    const i = ing as Record<string, unknown>;
    return {
      name: String(i.name || ""),
      quantity: i.quantity != null ? String(i.quantity) : undefined,
      unit: i.unit != null ? String(i.unit) : undefined,
      notes: i.notes != null ? String(i.notes) : undefined,
      optional: Boolean(i.optional),
    };
  });
}

function existingMacros(page: Record<string, unknown>, kind: CatalogKind) {
  const nutrition = page.nutrition as Record<string, unknown> | undefined;
  if (nutrition) {
    return {
      calories: Number(nutrition.calories ?? page.calories ?? 0),
      protein: Number(nutrition.protein ?? page.protein ?? 0),
      carbs: Number(nutrition.carbs ?? page.carbs ?? 0),
      fat: Number(nutrition.fats ?? nutrition.fat ?? page.fats ?? page.fat ?? 0),
      source: nutrition.source as string | undefined,
      estimateAvailable: nutrition.estimateAvailable as boolean | undefined,
    };
  }
  if (kind !== "breakfast") {
    return {
      calories: Number(page.calories ?? 0),
      protein: Number(page.protein ?? 0),
      carbs: Number(page.carbs ?? 0),
      fat: Number(page.fats ?? 0),
    };
  }
  return null;
}

function servingsFromPage(page: Record<string, unknown>, mealType: "dinner" | "breakfast" | "smoothie"): number {
  return (
    getRecipeBaseServings({
      baseServings: Number(page.baseServings) || undefined,
      crewSize: Number(page.crewSize) || undefined,
    }) || defaultRecipeServings(page, mealType)
  );
}

function applyNutrition(
  page: Record<string, unknown>,
  kind: CatalogKind,
  record: ReturnType<typeof calculateNutritionFromIngredients>,
): Record<string, unknown> {
  const next = { ...page };
  const available = record.estimateAvailable !== false && record.source !== "unavailable";
  const block = {
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
  } else if (kind === "breakfast") {
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

async function main(): Promise<void> {
  const rows: AuditRow[] = [];
  let total = 0;
  let missing = 0;
  let corrected = 0;
  let suspicious = 0;

  for (const { kind, dir, mealType } of CATALOG_DIRS) {
    for (const file of listJsonFiles(dir)) {
      total += 1;
      const page = readJson(file);
      const slug = String(page.slug || path.basename(file, ".json"));
      const before = existingMacros(page, kind);
      const issues: string[] = [];

      const nutritionMeta = page.nutrition as Record<string, unknown> | undefined;
      const intentionallyHidden =
        nutritionMeta?.source === "unavailable" || nutritionMeta?.estimateAvailable === false;

      if (intentionallyHidden) {
        issues.push("Per-serving estimate withheld (UI: coming soon)");
      } else if (!before || !hasCompleteNutrition(before, { source: String(nutritionMeta?.source || "") })) {
        issues.push("Missing complete nutrition");
        missing += 1;
      } else {
        issues.push(...validateNutritionPerServing(before, { slug, mealType }).map((i) => i.message));
      }

      const record = calculateNutritionFromIngredients(ingredientsFromPage(page), {
        servings: servingsFromPage(page, mealType),
        mealType,
        mealPrepFriendly: Boolean(page.mealPrepNotes || (page.tags as string[])?.includes("make-ahead")),
        existing: undefined,
      });

      const after = {
        calories: record.calories,
        protein: record.protein,
        carbs: record.carbs,
        fat: record.fat,
      };

      const afterIssues = validateNutritionPerServing(after, { slug, mealType }).filter(
        (i) => i.code === "suspicious" || i.code === "impossible",
      );

      let status: AuditRow["status"] = "ok";
      const changed =
        !before ||
        before.calories !== after.calories ||
        before.protein !== after.protein ||
        before.carbs !== after.carbs ||
        before.fat !== after.fat;

      if (intentionallyHidden) {
        status = "ok";
      } else if (!record.estimateAvailable) {
        status = FIX ? "corrected" : "missing";
        if (FIX) corrected += 1;
      } else if (!before || !hasCompleteNutrition(before, { source: record.source })) {
        status = FIX ? "corrected" : "missing";
        if (FIX) corrected += 1;
      } else if (afterIssues.length > 0) {
        status = "suspicious";
        suspicious += 1;
        issues.push(...afterIssues.map((i) => i.message));
      } else if (changed && FIX) {
        status = "corrected";
        corrected += 1;
      } else if (changed) {
        status = "suspicious";
        suspicious += 1;
        issues.push("Calculated macros differ from stored values");
      }

      if (FIX && (status === "corrected" || status === "missing" || changed)) {
        const updated = applyNutrition(page, kind, record);
        fs.writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
        if (status === "missing") status = "corrected";
      }

      if (intentionallyHidden || !record.estimateAvailable) {
        status = "ok";
      } else {
        const finalIssues = validateNutritionPerServing(after, { slug, mealType }).filter(
          (i) =>
            i.code === "suspicious" ||
            i.code === "impossible" ||
            i.code === "missing" ||
            i.code === "negative",
        );
        if (finalIssues.length === 0 && status !== "missing") {
          status = "ok";
        }
      }

      rows.push({
        slug,
        catalog: kind,
        status,
        issues,
        before: before ? fmt(before) : undefined,
        after: fmt(after),
      });
    }
  }

  const problemRows = rows.filter((r) => r.status !== "ok");
  const lines = [
    "# Recipe Nutrition Audit Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${FIX ? "fix (wrote JSON)" : "report only"}`,
    "",
    "## Summary",
    "",
    `- Total recipes scanned: **${total}**`,
    `- Missing nutrition (before fix): **${missing}**`,
    `- Corrected: **${corrected}**`,
    `- Suspicious / divergent: **${suspicious}**`,
    `- Clean after run: **${rows.filter((r) => r.status === "ok").length}**`,
    "",
    "## Missing / Corrected / Suspicious",
    "",
  ];

  if (!problemRows.length) {
    lines.push("_All recipes have complete per-serving nutrition._");
  } else {
    for (const row of problemRows) {
      lines.push(`### ${row.slug} (${row.catalog}) — ${row.status}`);
      if (row.before) lines.push(`- Before: ${row.before}`);
      lines.push(`- After: ${row.after}`);
      for (const issue of row.issues.slice(0, 4)) lines.push(`- ${issue}`);
      lines.push("");
    }
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join("\n"), "utf8");

  console.log(`[audit-recipe-nutrition] scanned=${total} corrected=${corrected} suspicious=${suspicious}`);
  console.log(`[audit-recipe-nutrition] report → ${REPORT_PATH}`);

  const stillMissing = rows.filter((r) => r.status === "missing").length;
  if (stillMissing > 0 && !FIX) {
    console.error(`[audit-recipe-nutrition] ${stillMissing} recipes missing nutrition — run with --fix`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
