#!/usr/bin/env tsx
/**
 * Recipe content integrity audit — finds recipes across the ENTIRE catalog that
 * share byte-identical (or near-identical) ingredients/steps despite having
 * different slugs/titles. This is the class of bug behind chicken-souvlaki
 * silently rendering beer-can-chicken's content.
 *
 *   npx tsx scripts/audit-recipe-content-integrity.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CATALOG_DIR = path.join(ROOT, "client", "public", "catalog");

type PageRecord = {
  collection: string;
  slug: string;
  file: string;
  title: string;
  json: any;
};

function walkPages(): PageRecord[] {
  const records: PageRecord[] = [];
  const collections = fs.readdirSync(CATALOG_DIR).filter((c) =>
    fs.statSync(path.join(CATALOG_DIR, c)).isDirectory(),
  );
  for (const collection of collections) {
    const pagesDir = path.join(CATALOG_DIR, collection, "pages");
    if (!fs.existsSync(pagesDir)) continue;
    for (const file of fs.readdirSync(pagesDir)) {
      if (!file.endsWith(".json")) continue;
      const full = path.join(pagesDir, file);
      try {
        const json = JSON.parse(fs.readFileSync(full, "utf8"));
        records.push({
          collection,
          slug: json.slug ?? file.replace(/\.json$/, ""),
          file: full,
          title: json.title ?? json.displayTitle ?? "",
          json,
        });
      } catch (e) {
        console.error(`Failed to parse ${full}: ${(e as Error).message}`);
      }
    }
  }
  return records;
}

function normalizeIngredients(json: any): string {
  const ingredients = Array.isArray(json.ingredients) ? json.ingredients : [];
  return JSON.stringify(
    ingredients.map((i: any) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
  );
}

function normalizeSteps(json: any): string {
  const steps = Array.isArray(json.steps) ? json.steps : [];
  return JSON.stringify(
    steps.map((s: any) => ({
      title: s.title,
      // Strip the recipe title if it's interpolated into the instruction text —
      // that's the ONE piece of per-recipe customization some generic templates do.
      instruction: String(s.instruction ?? "").replace(new RegExp("", "g"), ""),
    })),
  );
}

function hash(s: string): string {
  return crypto.createHash("md5").update(s).digest("hex");
}

function main() {
  const pages = walkPages();
  console.log(`Loaded ${pages.length} recipe pages across ${new Set(pages.map((p) => p.collection)).size} collections.\n`);

  // Group by exact ingredients+steps hash (ignoring title text baked into steps).
  const byContentHash = new Map<string, PageRecord[]>();
  for (const p of pages) {
    const ingredientsNorm = normalizeIngredients(p.json);
    const stepsRaw = Array.isArray(p.json.steps) ? p.json.steps : [];
    // Replace this recipe's own title within instruction text so title-only
    // interpolation doesn't mask a true duplicate.
    const stepsNorm = JSON.stringify(
      stepsRaw.map((s: any) => ({
        title: s.title,
        instruction: String(s.instruction ?? "").split(p.title).join("<TITLE>"),
      })),
    );
    const key = hash(ingredientsNorm + "||" + stepsNorm);
    const list = byContentHash.get(key) || [];
    list.push(p);
    byContentHash.set(key, list);
  }

  const trueDuplicates = [...byContentHash.entries()].filter(([, list]) => {
    if (list.length < 2) return false;
    const uniqueSlugs = new Set(list.map((p) => p.slug));
    return uniqueSlugs.size > 1;
  });

  console.log(`=== TRUE DUPLICATE CONTENT GROUPS (identical ingredients+steps, different slugs) ===\n`);
  if (!trueDuplicates.length) {
    console.log("None found.\n");
  }
  for (const [key, list] of trueDuplicates) {
    console.log(`Hash ${key.slice(0, 8)}:`);
    for (const p of list) {
      console.log(`  - [${p.collection}] ${p.slug}  ("${p.title}")`);
    }
    console.log();
  }

  // Secondary check: identical ingredients but different steps (partial dupe / template reuse)
  const byIngredientsHash = new Map<string, PageRecord[]>();
  for (const p of pages) {
    const key = hash(normalizeIngredients(p.json));
    const list = byIngredientsHash.get(key) || [];
    list.push(p);
    byIngredientsHash.set(key, list);
  }
  const ingredientDuplicates = [...byIngredientsHash.entries()].filter(([, list]) => {
    if (list.length < 2) return false;
    const uniqueSlugs = new Set(list.map((p) => p.slug));
    return uniqueSlugs.size > 1;
  });

  console.log(`\n=== IDENTICAL INGREDIENT LISTS (may be legitimate variants, or may be under-differentiated) ===\n`);
  if (!ingredientDuplicates.length) {
    console.log("None found.\n");
  }
  for (const [key, list] of ingredientDuplicates) {
    const alreadyReportedAsFullDup = trueDuplicates.some(([k]) => k === key);
    console.log(`Hash ${key.slice(0, 8)}${alreadyReportedAsFullDup ? " (also full duplicate — see above)" : ""}:`);
    for (const p of list) {
      console.log(`  - [${p.collection}] ${p.slug}  ("${p.title}")`);
    }
    console.log();
  }

  // Write report
  const reviewDir = path.join(ROOT, "review");
  fs.mkdirSync(reviewDir, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    totalPages: pages.length,
    trueDuplicateGroups: trueDuplicates.map(([key, list]) => ({
      hash: key,
      recipes: list.map((p) => ({ collection: p.collection, slug: p.slug, title: p.title })),
    })),
    ingredientOnlyDuplicateGroups: ingredientDuplicates
      .filter(([key]) => !trueDuplicates.some(([k]) => k === key))
      .map(([key, list]) => ({
        hash: key,
        recipes: list.map((p) => ({ collection: p.collection, slug: p.slug, title: p.title })),
      })),
  };
  fs.writeFileSync(
    path.join(reviewDir, "recipe-content-integrity-audit.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );
  console.log(`\nReport written to review/recipe-content-integrity-audit.json`);
  console.log(`\nSummary: ${trueDuplicates.length} true duplicate group(s), ${report.ingredientOnlyDuplicateGroups.length} ingredient-only duplicate group(s).`);
}

main();
