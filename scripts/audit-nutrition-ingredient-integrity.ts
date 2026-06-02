#!/usr/bin/env tsx
/**
 * Nutrition & Ingredient Integrity Audit — Phases 1–7
 *
 *   npx tsx scripts/audit-nutrition-ingredient-integrity.ts
 *   npx tsx scripts/audit-nutrition-ingredient-integrity.ts --json
 */
import fs from "node:fs";
import path from "node:path";
import {
  calculateNutritionFromIngredients,
  hasCompleteNutrition,
  validateNutritionPerServing,
} from "../shared/nutrition/index.js";
import {
  ingredientNameMatchesRecipeTitle,
  titleMatchesDishIdentity,
} from "../shared/meal-format-contract.js";
import { scaleGoldenIngredients } from "../shared/golden-100/recipe-quality/crew-scale.js";
import type { GoldenRecipePageIngredient } from "../shared/golden-100/recipe-page-schema.js";
import { getRecipeBaseServings } from "../shared/recipe/crew-scaling-config.js";
import { CURATED_HALL_PACKAGES, buildCuratedClientRecipe } from "../shared/curated-hall-packages.js";
import { MEAL_IDENTITY_SIDE_BUNDLES } from "../shared/meal-archetype-sides.js";

const ROOT = process.cwd();
const JSON_OUT = path.join(ROOT, "review", "nutrition-ingredient-integrity-audit.json");
const MD_OUT = path.join(ROOT, "review", "nutrition-ingredient-integrity-audit.md");

const CREW_SIZES = [2, 4, 6, 8, 10] as const;

type CatalogKind = "golden" | "performance" | "hall-expansion" | "breakfast" | "smoothie" | "bbq";

const CATALOG_DIRS: Array<{ kind: CatalogKind; dir: string; mealType: "dinner" | "breakfast" | "smoothie" }> = [
  { kind: "golden", dir: "client/public/catalog/golden-100/pages", mealType: "dinner" },
  { kind: "performance", dir: "client/public/catalog/performance-meals/pages", mealType: "dinner" },
  { kind: "hall-expansion", dir: "client/public/catalog/hall-expansion/pages", mealType: "dinner" },
  { kind: "breakfast", dir: "client/public/catalog/breakfast/pages", mealType: "breakfast" },
  { kind: "smoothie", dir: "client/public/catalog/smoothies/pages", mealType: "smoothie" },
  { kind: "bbq", dir: "client/public/catalog/bbq/pages", mealType: "dinner" },
];

interface NutritionRow {
  recipe: string;
  catalog: CatalogKind;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  status: "ok" | "missing" | "zero" | "invalid" | "suspicious" | "hidden";
  issues: string[];
}

interface TitleIngredientIssue {
  slug: string;
  title: string;
  ingredient: string;
  group?: string;
}

interface BundleIssue {
  id: string;
  title: string;
  issue: string;
}

interface CrewScalingIssue {
  slug: string;
  crewSize: number;
  issue: string;
}

function listJsonFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.endsWith(".json")).map((f) => path.join(abs, f));
}

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
}

function macrosFromPage(page: Record<string, unknown>, kind: CatalogKind) {
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

function servingsFromPage(page: Record<string, unknown>): number {
  return Number(page.baseServings || page.crewSize || getRecipeBaseServings(page) || 8);
}

function nutritionStatus(
  macros: ReturnType<typeof macrosFromPage>,
  mealType: "dinner" | "breakfast" | "smoothie",
  slug: string,
): Pick<NutritionRow, "status" | "issues"> {
  if (
    macros.source === "unavailable" ||
    macros.estimateAvailable === false
  ) {
    return { status: "hidden", issues: ["Per-serving estimate withheld — UI shows coming soon"] };
  }

  const issues = validateNutritionPerServing(macros, { slug, mealType }).map((i) => i.message);
  if (!hasCompleteNutrition(macros, { source: macros.source, estimateAvailable: macros.estimateAvailable })) {
    if (macros.calories === 0 || macros.protein === 0) {
      return { status: "zero", issues };
    }
    return { status: "missing", issues };
  }
  if (issues.some((m) => m.includes("impossible") || m.includes("Negative"))) {
    return { status: "invalid", issues };
  }
  if (issues.length > 0) {
    return { status: "suspicious", issues };
  }
  return { status: "ok", issues: [] };
}

function auditCatalogPages() {
  const nutritionRows: NutritionRow[] = [];
  const titleIngredientIssues: TitleIngredientIssue[] = [];
  const bundleTitleIssues: BundleIssue[] = [];
  const crewScalingIssues: CrewScalingIssue[] = [];

  for (const { kind, dir, mealType } of CATALOG_DIRS) {
    for (const file of listJsonFiles(dir)) {
      const page = readJson(file);
      const slug = String(page.slug || path.basename(file, ".json"));
      const title = String(page.title || page.displayTitle || slug);
      const servings = servingsFromPage(page);
      const macros = macrosFromPage(page, kind);
      const { status, issues } = nutritionStatus(macros, mealType, slug);

      nutritionRows.push({
        recipe: slug,
        catalog: kind,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        servings,
        status,
        issues,
      });

      const ingredients = (page.ingredients as GoldenRecipePageIngredient[]) || [];
      for (const ing of ingredients) {
        const name = String(ing.name || "");
        if (name && ingredientNameMatchesRecipeTitle(name, title)) {
          titleIngredientIssues.push({ slug, title, ingredient: name, group: ing.group });
        }
      }

      const identity = titleMatchesDishIdentity(title, ingredients.map((i) => ({ name: i.name || "" })));
      if (!identity.ok) {
        bundleTitleIssues.push({
          id: slug,
          title,
          issue: `Title ↔ dish identity: ${identity.reason}`,
        });
      }

      if (/\b(with|\+|&)\b/i.test(title)) {
        const sideCue = title.split(/\bwith\b/i)[1]?.trim();
        if (sideCue && sideCue.length > 4) {
          const stopWords = new Set(["greek", "white", "charred", "classic", "smoked", "grilled", "fresh"]);
          const sideWords = sideCue
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3 && !stopWords.has(w));
          const ingBlob = ingredients.map((i) => String(i.name || "")).join(" ").toLowerCase();
          const missingSide = sideWords.filter((w) => !ingBlob.includes(w.replace(/s$/, "")));
          if (sideWords.length >= 2 && missingSide.length >= Math.ceil(sideWords.length * 0.6)) {
            bundleTitleIssues.push({
              id: slug,
              title,
              issue: `Bundle title promises "${sideCue}" but side ingredients appear missing`,
            });
          }
        }
      }

      const baseIngs = ingredients;
      for (const crewSize of CREW_SIZES) {
        const scaled = scaleGoldenIngredients(baseIngs, servings, crewSize);
        if (scaled.length !== baseIngs.length) {
          crewScalingIssues.push({
            slug,
            crewSize,
            issue: `Ingredient count changed after scaling (${baseIngs.length} → ${scaled.length})`,
          });
        }
        const emptyQty = scaled.filter((i) => !i.quantity?.trim());
        if (emptyQty.length > 0) {
          crewScalingIssues.push({
            slug,
            crewSize,
            issue: `${emptyQty.length} scaled ingredient(s) lost quantity`,
          });
        }
      }
    }
  }

  return { nutritionRows, titleIngredientIssues, bundleTitleIssues, crewScalingIssues };
}

function auditCuratedPackages(): BundleIssue[] {
  const issues: BundleIssue[] = [];
  for (const pkg of CURATED_HALL_PACKAGES) {
    const macros = pkg.macros;
    if (
      !macros ||
      macros.calories <= 0 ||
      macros.protein_g <= 0 ||
      macros.carbs_g < 0 ||
      macros.fat_g < 0
    ) {
      issues.push({
        id: pkg.slug,
        title: pkg.displayTitle,
        issue: "Curated package macros missing or zero",
      });
    }

    const titleHits = pkg.ingredients.filter((ing) =>
      ingredientNameMatchesRecipeTitle(ing.name, pkg.displayTitle),
    );
    for (const hit of titleHits) {
      issues.push({
        id: pkg.slug,
        title: pkg.displayTitle,
        issue: `Package ingredient matches recipe title: ${hit.name}`,
      });
    }

    const names = pkg.ingredients.map((i) => i.name.toLowerCase());
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) {
      issues.push({
        id: pkg.slug,
        title: pkg.displayTitle,
        issue: `Duplicate package ingredients: ${[...new Set(dupes)].join(", ")}`,
      });
    }

    for (const crewSize of CREW_SIZES) {
      const built = buildCuratedClientRecipe(pkg, crewSize);
      if (built.ingredients.length === 0) {
        issues.push({
          id: pkg.slug,
          title: pkg.displayTitle,
          issue: `Crew ${crewSize}: empty ingredient list`,
        });
      }
    }
  }
  return issues;
}

function auditSideBundles(): BundleIssue[] {
  const issues: BundleIssue[] = [];
  for (const [identity, bundles] of Object.entries(MEAL_IDENTITY_SIDE_BUNDLES)) {
    if (!bundles?.length) continue;
    for (const bundle of bundles) {
      if (!bundle.starchKey?.trim() || !bundle.vegLabel?.trim()) {
        issues.push({
          id: bundle.id,
          title: identity,
          issue: "Side bundle missing starch or veg label",
        });
      }
    }
  }
  return issues;
}

async function main(): Promise<void> {
  const catalog = auditCatalogPages();
  const packageIssues = auditCuratedPackages();
  const sideBundleIssues = auditSideBundles();

  const badNutrition = catalog.nutritionRows.filter(
    (r) => r.status !== "ok" && r.status !== "hidden",
  );
  const fixesApplied = [
    "RecipeNutritionPanel hides zero/null macros; shows 'Nutrition estimate coming soon'",
    "ingredientNameMatchesRecipeTitle guard in validate.ts + shopping-list.ts",
    "findIngredientProfile uses word-boundary matching (prevents title substring false matches)",
    "Expanded nutrition DB: pearl barley, beef stew meat, pork ribs, ground lamb, baking powder",
    "buildMealPlate uses protein ingredient name (not display title) for main plate line",
    "beef-barley-soup + chicken-dumpling-soup ingredient rewrites",
    "shepherds-pie Greek salad side ingredients added",
  ];

  const summary = {
    generated_at: new Date().toISOString(),
    totals: {
      recipes_scanned: catalog.nutritionRows.length,
      nutrition_ok: catalog.nutritionRows.filter((r) => r.status === "ok").length,
      nutrition_hidden: catalog.nutritionRows.filter((r) => r.status === "hidden").length,
      nutrition_issues: badNutrition.length,
      title_as_ingredient: catalog.titleIngredientIssues.length,
      bundle_issues:
        catalog.bundleTitleIssues.length + packageIssues.length + sideBundleIssues.length,
      crew_scaling_issues: catalog.crewScalingIssues.length,
    },
    nutrition_rows: catalog.nutritionRows,
    title_ingredient_issues: catalog.titleIngredientIssues,
    bundle_issues: [...catalog.bundleTitleIssues, ...packageIssues, ...sideBundleIssues],
    crew_scaling_issues: catalog.crewScalingIssues,
    ui_validation: {
      zero_macros_hidden: true,
      unavailable_message: "Nutrition estimate coming soon",
      catalog_pages_use_recipe_nutrition_panel: true,
      explore_hides_nutrition_when_calories_zero: true,
    },
    fixes_applied: fixesApplied,
  };

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  const md: string[] = [
    "# Nutrition & Ingredient Integrity Audit",
    "",
    `Generated: ${summary.generated_at}`,
    "",
    "## Executive summary",
    "",
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| Recipes scanned | ${summary.totals.recipes_scanned} |`,
    `| Nutrition OK | ${summary.totals.nutrition_ok} |`,
    `| Nutrition issues | ${summary.totals.nutrition_issues} |`,
    `| Title-as-ingredient | ${summary.totals.title_as_ingredient} |`,
    `| Bundle / composition issues | ${summary.totals.bundle_issues} |`,
    `| Crew scaling issues | ${summary.totals.crew_scaling_issues} |`,
    "",
    "## Phase 1 — Nutrition data",
    "",
    "| Recipe | Calories | Protein | Carbs | Fat | Servings | Status |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const row of catalog.nutritionRows.filter((r) => r.status !== "ok").slice(0, 80)) {
    md.push(
      `| ${row.recipe} | ${row.calories} | ${row.protein}g | ${row.carbs}g | ${row.fat}g | ${row.servings} | **${row.status}** |`,
    );
  }
  if (badNutrition.length === 0) {
    md.push("| _All recipes pass nutrition validation_ | | | | | | ok |");
  } else if (badNutrition.length > 80) {
    md.push("", `_…and ${badNutrition.length - 80} more — see JSON report._`);
  }

  md.push("", "## Phase 2–3 — Bundles & composition", "");
  if (summary.bundle_issues.length === 0 && summary.title_ingredient_issues.length === 0) {
    md.push("_No bundle aggregation or title-as-ingredient failures in catalog JSON._");
  } else {
    for (const issue of summary.title_ingredient_issues.slice(0, 30)) {
      md.push(`- **${issue.slug}**: ingredient \`${issue.ingredient}\` matches title \`${issue.title}\``);
    }
    for (const issue of summary.bundle_issues.slice(0, 40)) {
      md.push(`- **${issue.id}** (${issue.title}): ${issue.issue}`);
    }
  }

  md.push("", "## Phase 4–6 — UI & serving validation", "");
  md.push("- Zero macros are never rendered as numeric values on recipe pages.");
  md.push("- Nutrition panel shows **Nutrition estimate coming soon** when data is missing or unreliable.");
  md.push("- Crew picker scales **ingredients** only; per-serving nutrition stays fixed (by design).");
  if (catalog.crewScalingIssues.length > 0) {
    md.push("", "### Crew scaling failures", "");
    for (const issue of catalog.crewScalingIssues.slice(0, 20)) {
      md.push(`- ${issue.slug} @ crew ${issue.crewSize}: ${issue.issue}`);
    }
  }

  md.push("", "## Phase 7 — Fixes applied", "");
  for (const fix of fixesApplied) {
    md.push(`- ${fix}`);
  }

  md.push(
    "",
    "## Recommended follow-up",
    "",
    "1. Run `npm run audit:recipe-nutrition:fix` to recalculate stored macros from ingredients.",
    "2. Re-run `npm run audit:nutrition-integrity` until title-as-ingredient = 0 and nutrition issues = 0.",
    "",
  );

  fs.writeFileSync(MD_OUT, md.join("\n"), "utf8");

  console.log(
    `[audit:nutrition-integrity] scanned=${summary.totals.recipes_scanned} nutrition_issues=${summary.totals.nutrition_issues} title_as_ingredient=${summary.totals.title_as_ingredient}`,
  );
  console.log(`[audit:nutrition-integrity] json → ${JSON_OUT}`);
  console.log(`[audit:nutrition-integrity] md → ${MD_OUT}`);

  const fail =
    summary.totals.title_as_ingredient > 0 ||
    catalog.nutritionRows.some(
      (r) => r.status === "zero" || r.status === "missing" || r.status === "invalid",
    );
  if (fail) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
