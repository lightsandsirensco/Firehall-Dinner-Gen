#!/usr/bin/env tsx
/**
 * Production readiness audit for 250 approved recipes.
 *   npm run audit:catalog-250
 */
import fs from "node:fs";
import path from "node:path";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import { APPROVED_CATALOG_TOTAL } from "../shared/meal-catalog/curated-count.js";
import { normalizeTitleKey } from "../shared/ingestion/dedupe.js";
import { resolveExistingSlugImage } from "../shared/explore-image-paths.js";
import { hasCompleteNutrition, validateNutritionPerServing } from "../shared/nutrition/index.js";
import { BATCH_250_RECIPES } from "../shared/hall-expansion/adapted/batch-250.js";

const ROOT = process.cwd();
const REPORT = path.join(ROOT, "review", "catalog-250-production-report.md");

type Issue = { slug: string; code: string; message: string; severity: "critical" | "warn" };

const AI_TITLE = /\b(ultimate|loaded creation|protein bowl|explosion|ranch explosion|sheet pan bowl)\b/i;
const VAGUE_STEP = /\bcook (the )?(chicken|meat|steak|pork|beef|eggs)\b/i;

function loadPageJson(rel: string): Record<string, unknown> | null {
  const p = path.join(ROOT, "client/public", rel.replace(/^\//, ""));
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
}

function pagePathForEntry(slug: string, kind: string): string | null {
  if (kind === "breakfast_catalog") return `catalog/breakfast/pages/${slug}.json`;
  if (kind === "performance_meal") return `catalog/performance-meals/pages/${slug}.json`;
  if (kind === "hall_expansion") return `catalog/hall-expansion/pages/${slug}.json`;
  if (kind === "smoothie") return `catalog/smoothies/pages/${slug}.json`;
  return `catalog/golden-100/pages/${slug}.json`;
}

function ingredientOverlap(a: string[], b: string[]): number {
  const setB = new Set(b.map((x) => x.toLowerCase().slice(0, 12)));
  let hit = 0;
  for (const x of a) {
    if (setB.has(x.toLowerCase().slice(0, 12))) hit += 1;
  }
  return a.length ? hit / a.length : 0;
}

function main(): void {
  const catalog = buildApprovedCatalog();
  const issues: Issue[] = [];
  const batchSlugs = new Set(BATCH_250_RECIPES.map((r) => r.slug));

  if (catalog.recipeCount !== APPROVED_CATALOG_TOTAL) {
    issues.push({
      slug: "*",
      code: "count_mismatch",
      message: `Expected ${APPROVED_CATALOG_TOTAL} approved recipes, got ${catalog.recipeCount}`,
      severity: "critical",
    });
  }

  const titleMap = new Map<string, string[]>();
  for (const entry of catalog.recipes) {
    const key = normalizeTitleKey(entry.title);
    const list = titleMap.get(key) ?? [];
    list.push(entry.slug);
    titleMap.set(key, list);
  }
  for (const [title, slugs] of titleMap) {
    if (slugs.length > 1) {
      issues.push({
        slug: slugs.join(", "),
        code: "duplicate_title",
        message: `Duplicate title "${title}"`,
        severity: "critical",
      });
    }
  }

  for (const entry of catalog.recipes) {
    if (AI_TITLE.test(entry.title)) {
      issues.push({ slug: entry.slug, code: "ai_title", message: `AI-sounding title: ${entry.title}`, severity: "critical" });
    }

    const img = resolveExistingSlugImage(entry.slug, entry.kind);
    if (!img.found) {
      issues.push({ slug: entry.slug, code: "missing_image", message: "Missing hero/thumb on disk", severity: "critical" });
    }

    const rel = pagePathForEntry(entry.slug, entry.kind);
    const page = rel ? loadPageJson(rel) : null;
    if (!page) {
      issues.push({ slug: entry.slug, code: "missing_page", message: "Catalog page JSON missing", severity: "critical" });
      continue;
    }

    const ingredients = (page.ingredients as Array<{ name: string }> | undefined) ?? [];
    const steps = (page.steps as Array<{ instruction: string; title?: string }> | undefined) ?? [];
    if (ingredients.length < 6 && !entry.isSmoothie) {
      issues.push({ slug: entry.slug, code: "thin_ingredients", message: `${ingredients.length} ingredients`, severity: "warn" });
    }
    if (steps.length < 4) {
      issues.push({ slug: entry.slug, code: "thin_steps", message: `${steps.length} steps`, severity: "critical" });
    }

    for (const step of steps) {
      if (VAGUE_STEP.test(step.instruction) && step.instruction.length < 100) {
        issues.push({ slug: entry.slug, code: "vague_step", message: step.title ?? "step", severity: "warn" });
      }
    }

    const nutrition = page.nutrition as Record<string, number> | undefined;
    const macros = nutrition
      ? {
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fats ?? nutrition.fat,
        }
      : {
          calories: page.calories as number,
          protein: page.protein as number,
          carbs: page.carbs as number,
          fat: page.fats as number,
        };
    if (!hasCompleteNutrition(macros)) {
      issues.push({ slug: entry.slug, code: "missing_nutrition", message: "Incomplete macros", severity: "critical" });
    } else {
      for (const v of validateNutritionPerServing(macros, { slug: entry.slug })) {
        if (v.code === "impossible") {
          issues.push({ slug: entry.slug, code: "bad_nutrition", message: v.message, severity: "critical" });
        }
      }
    }
  }

  // Near-duplicate ingredient overlap among batch vs golden (warn only)
  for (const batch of BATCH_250_RECIPES) {
    const batchPage = loadPageJson(`catalog/hall-expansion/pages/${batch.slug}.json`);
    if (!batchPage) continue;
    const batchIng = ((batchPage.ingredients as Array<{ name: string }>) ?? []).map((i) => i.name);
    for (const entry of catalog.recipes) {
      if (entry.slug === batch.slug || entry.isSmoothie) continue;
      const rel = pagePathForEntry(entry.slug, entry.kind);
      const other = rel ? loadPageJson(rel) : null;
      if (!other) continue;
      const otherIng = ((other.ingredients as Array<{ name: string }>) ?? []).map((i) => i.name);
      const overlap = ingredientOverlap(batchIng, otherIng);
      if (overlap >= 0.85 && normalizeTitleKey(entry.title) !== normalizeTitleKey(batch.title)) {
        issues.push({
          slug: batch.slug,
          code: "near_duplicate",
          message: `${Math.round(overlap * 100)}% ingredient overlap with ${entry.slug}`,
          severity: "warn",
        });
      }
    }
  }

  const critical = issues.filter((i) => i.severity === "critical");
  const warns = issues.filter((i) => i.severity === "warn");
  const score = Math.max(0, 100 - critical.length * 5 - warns.length);

  const lines = [
    "# Catalog 250 — Production Readiness Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- **Approved recipes:** ${catalog.recipeCount} (target ${APPROVED_CATALOG_TOTAL})`,
    `- **Batch-250 added:** ${BATCH_250_RECIPES.length}`,
    `- **Critical issues:** ${critical.length}`,
    `- **Warnings:** ${warns.length}`,
    `- **Production readiness score:** ${score}/100`,
    "",
    "## Critical Issues",
    "",
  ];

  if (!critical.length) lines.push("_None_");
  else for (const i of critical.slice(0, 80)) lines.push(`- **${i.slug}** (${i.code}): ${i.message}`);

  lines.push("", "## Warnings", "");
  if (!warns.length) lines.push("_None_");
  else for (const i of warns.slice(0, 40)) lines.push(`- **${i.slug}** (${i.code}): ${i.message}`);

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");

  console.log(`[audit:catalog-250] recipes=${catalog.recipeCount} critical=${critical.length} warn=${warns.length} score=${score}`);
  console.log(`[audit:catalog-250] report → ${REPORT}`);

  if (critical.length) process.exit(1);
}

main();
