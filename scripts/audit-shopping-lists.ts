#!/usr/bin/env tsx
/**
 * Shopping-list regression baseline + quality audit.
 *
 * Builds the shopping list for every catalog recipe at crew sizes 4, 6 and 10
 * through BOTH engines (the legacy per-recipe dialog in client/src/lib and the
 * canonical shared/shopping engine used by the Shift Planner), writes the
 * output as JSON for before/after diffs, and counts the problems the
 * shopping-list work targets.
 *
 *   npx tsx scripts/audit-shopping-lists.ts [outFile.json]
 */
import fs from "node:fs";
import path from "node:path";
import { scaleGoldenIngredients } from "../shared/golden-100/recipe-quality/crew-scale.js";
import type { GoldenRecipePageIngredient } from "../shared/golden-100/recipe-page-schema.js";
import {
  addRecipeToSession,
  createShoppingSession,
  formatShoppingItemQuantity,
  type ShoppingRecipeInput,
} from "../shared/shopping/index.js";
import { buildShoppingListFromCatalogIngredients } from "../client/src/lib/shopping-list.js";
import { resolveShoppingRecipe } from "../server/shift-plan/routes.js";
import { getApprovedCatalog } from "../server/approved-catalog-cache.js";

const CREW_SIZES = [4, 6, 10];

export interface AuditLine {
  name: string;
  amount: string;
  section: string;
  notes?: string;
}

/** An amount a shopper can't act on: 3+ significant decimals, or a decimal on a countable/packaged unit. */
export function isAwkwardAmount(amount: string): boolean {
  if (/\d\.\d{2,}/.test(amount)) return true;
  if (/\b\d+\.\d+\s*(eggs?|cloves?|cans?|each|whole|heads?|bunch(es)?|sticks?|packages?|pkgs?|slices?|large|medium|small)\b/i.test(amount)) {
    return true;
  }
  return /\b0\.\d\s*(lb|lbs|pound)/i.test(amount) && !/\b0\.5\s*(lb|lbs|pound)/i.test(amount);
}

function legacyLines(input: ShoppingRecipeInput, crew: number): AuditLine[] {
  const scaled = scaleGoldenIngredients(
    input.ingredients as GoldenRecipePageIngredient[],
    input.baseServings,
    crew,
  );
  const result = buildShoppingListFromCatalogIngredients(scaled, { recipeTitle: input.title });
  return result.sections.flatMap((s) =>
    s.items.map((i) => ({ name: i.name, amount: i.amount, section: s.title, notes: i.notes || undefined })),
  );
}

function sharedLines(input: ShoppingRecipeInput, crew: number): AuditLine[] {
  const session = addRecipeToSession(createShoppingSession(), input, crew);
  return session.list.items.map((i) => ({
    name: i.displayName,
    amount: formatShoppingItemQuantity(i),
    section: i.department,
    notes: i.notes || undefined,
  }));
}

interface Metrics {
  lines: number;
  awkward: number;
  unmerged: number;
  uncategorized: number;
  categoryLeak: number;
}

function measure(lines: AuditLine[]): Metrics {
  return {
    lines: lines.length,
    awkward: lines.filter((l) => isAwkwardAmount(l.amount)).length,
    unmerged: lines.filter((l) => /\+/.test(l.amount)).length,
    uncategorized: lines.filter((l) => /^other$/i.test(l.section)).length,
    categoryLeak: lines.filter((l) => /category:/i.test(l.notes ?? "")).length,
  };
}

function add(a: Metrics, b: Metrics): Metrics {
  return {
    lines: a.lines + b.lines,
    awkward: a.awkward + b.awkward,
    unmerged: a.unmerged + b.unmerged,
    uncategorized: a.uncategorized + b.uncategorized,
    categoryLeak: a.categoryLeak + b.categoryLeak,
  };
}

const ZERO: Metrics = { lines: 0, awkward: 0, unmerged: 0, uncategorized: 0, categoryLeak: 0 };

async function main(): Promise<void> {
  const out = process.argv[2];
  const slugs = getApprovedCatalog().recipes.map((r: { slug: string }) => r.slug).sort();
  const baseline: Record<string, Record<string, { legacy: AuditLine[]; shared: AuditLine[] }>> = {};
  let legacyTotal = ZERO;
  let sharedTotal = ZERO;
  const missing: string[] = [];
  const awkwardExamples = new Map<string, number>();

  for (const slug of slugs) {
    const input = resolveShoppingRecipe(slug);
    if (!input) {
      missing.push(slug);
      continue;
    }
    baseline[slug] = {};
    for (const crew of CREW_SIZES) {
      const legacy = legacyLines(input, crew);
      const shared = sharedLines(input, crew);
      baseline[slug][crew] = { legacy, shared };
      legacyTotal = add(legacyTotal, measure(legacy));
      sharedTotal = add(sharedTotal, measure(shared));
      for (const l of shared) {
        if (isAwkwardAmount(l.amount)) {
          const key = `${l.name} — ${l.amount}`;
          awkwardExamples.set(key, (awkwardExamples.get(key) ?? 0) + 1);
        }
      }
    }
  }

  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(baseline));
  }
  console.log(JSON.stringify({
    recipes: slugs.length,
    with_shopping_data: Object.keys(baseline).length,
    without_shopping_data: missing.length,
    crew_sizes: CREW_SIZES,
    legacy_engine: legacyTotal,
    shared_engine: sharedTotal,
    top_awkward_shared: [...awkwardExamples.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25),
  }, null, 1));
}

if (process.argv[1] && /audit-shopping-lists/.test(process.argv[1])) {
  main().then(
    () => process.exit(0),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
