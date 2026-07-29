#!/usr/bin/env tsx
/**
 * Repairs breakfast catalog ingredient quantities that lost their unit when a recipe with a
 * non-canonical baseServings got rescaled to 8 by an earlier (buggy) run of
 * normalize-canonical-servings.ts. See shared/golden-100/recipe-quality/crew-scale.ts for the
 * root-cause fix — this script re-derives correct quantities from the original TS source using
 * the now-fixed scaling function, and patches ONLY the ingredient quantity/unit fields of the
 * existing JSON pages (nothing else — images, dietary flags, SEO, hand-edited ingredients, etc.
 * are left untouched).
 *
 * Usage:
 *   tsx scripts/repair-breakfast-ingredient-units.ts             # report only
 *   tsx scripts/repair-breakfast-ingredient-units.ts --fix       # write corrected JSON
 */
import fs from "node:fs";
import path from "node:path";
import { scaleGoldenIngredients } from "../shared/golden-100/recipe-quality/crew-scale.js";
import type { GoldenRecipePageIngredient } from "../shared/golden-100/recipe-page-schema.js";
import { NEW_BREAKFAST_PAGES } from "../shared/breakfast-expansion/new-breakfast-pages.js";
import { BATCH_25_BREAKFAST_PAGES } from "../shared/breakfast-expansion/batch-25-breakfast-pages.js";
import { BATCH_A_BREAKFAST_PAGES } from "../shared/breakfast-expansion/batch-a-breakfast-pages.js";
import { BATCH_WAVE1_BREAKFAST_PAGES } from "../shared/breakfast-expansion/batch-wave1-breakfast-pages.js";
import { getAlgorithmicBreakfastSource } from "./generate-breakfast-catalog.js";

const ROOT = process.cwd();
const FIX = process.argv.includes("--fix");
const PAGES_DIR = path.join(ROOT, "client/public/catalog/breakfast/pages");
const REPORT_PATH = path.join(ROOT, "review", "breakfast-ingredient-unit-repair.md");

interface Source {
  baseServings: number;
  ingredients: GoldenRecipePageIngredient[];
}

function buildSourceIndex(): Map<string, Source> {
  const index = new Map<string, Source>();
  for (const p of [
    ...NEW_BREAKFAST_PAGES,
    ...BATCH_25_BREAKFAST_PAGES,
    ...BATCH_A_BREAKFAST_PAGES,
    ...BATCH_WAVE1_BREAKFAST_PAGES,
  ]) {
    index.set(p.slug, {
      baseServings: p.baseServings ?? p.crewSize,
      ingredients: p.ingredients as GoldenRecipePageIngredient[],
    });
  }
  return index;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

interface ChangeRow {
  slug: string;
  changes: Array<{ name: string; before: string; after: string }>;
}

function main(): void {
  const sourceIndex = buildSourceIndex();
  const rows: ChangeRow[] = [];
  let filesScanned = 0;
  let filesTouched = 0;

  for (const file of fs.readdirSync(PAGES_DIR)) {
    if (!file.endsWith(".json")) continue;
    filesScanned += 1;
    const full = path.join(PAGES_DIR, file);
    const page = JSON.parse(fs.readFileSync(full, "utf8")) as Record<string, unknown>;
    const slug = String(page.slug || path.basename(file, ".json"));

    let source = sourceIndex.get(slug);
    if (!source) {
      const algo = getAlgorithmicBreakfastSource(slug);
      if (algo) source = algo;
    }
    if (!source) continue;
    if (source.baseServings === 8) continue; // never needed rescaling; original strings are intact

    const currentIngredients = page.ingredients as GoldenRecipePageIngredient[] | undefined;
    if (!Array.isArray(currentIngredients)) continue;

    const rescaled = scaleGoldenIngredients(source.ingredients, source.baseServings, 8);
    const rescaledByName = new Map(rescaled.map((ing) => [normalizeName(ing.name), ing]));

    const changes: ChangeRow["changes"] = [];
    const nextIngredients = currentIngredients.map((ing) => {
      const match = rescaledByName.get(normalizeName(ing.name));
      if (!match) return ing; // hand-added ingredient not present in source — leave untouched
      if (match.quantity === ing.quantity && (match.unit ?? "") === (ing.unit ?? "")) return ing;
      changes.push({
        name: ing.name,
        before: `${ing.quantity ?? ""} ${ing.unit ?? ""}`.trim(),
        after: `${match.quantity ?? ""} ${match.unit ?? ""}`.trim(),
      });
      return { ...ing, quantity: match.quantity, unit: match.unit };
    });

    if (changes.length === 0) continue;

    filesTouched += 1;
    rows.push({ slug, changes });

    if (FIX) {
      const updated = { ...page, ingredients: nextIngredients };
      fs.writeFileSync(full, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
    }
  }

  const md = [
    "# Breakfast ingredient unit repair",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${FIX ? "fix (wrote JSON)" : "report only"}`,
    "",
    `- Files scanned: **${filesScanned}**`,
    `- Files with corrected ingredient quantities: **${rows.length}**`,
    "",
    "## Corrections",
    "",
    ...rows.flatMap((r) => [
      `### ${r.slug}`,
      ...r.changes.map((c) => `- ${c.name}: \`${c.before}\` → \`${c.after}\``),
      "",
    ]),
  ];
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, md.join("\n"), "utf8");

  console.log(
    `[repair-breakfast-units] scanned=${filesScanned} recipesFixed=${rows.length} mode=${FIX ? "fix" : "report"}`,
  );
  console.log(`[repair-breakfast-units] report → ${REPORT_PATH}`);
}

main();
