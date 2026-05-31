#!/usr/bin/env tsx
/**
 * QA gate for batch-25 breakfast expansion.
 *
 *   npm run audit:breakfast-batch-25
 */
import fs from "node:fs";
import path from "node:path";
import { BATCH_25_BREAKFAST_PAGES } from "../shared/breakfast-expansion/batch-25-breakfast-pages.js";
import { breakfastRecipePageSchema } from "../shared/breakfast-schema.js";
import { isBreakfastCatalogSlug } from "../shared/breakfast-catalog/slug-registry.js";
import { imageFileExists } from "../shared/explore-image-paths.js";
import { breakfastCatalogHeroPath, breakfastCatalogThumbPath } from "../shared/breakfast-catalog/slug-registry.js";
import { validateExploreImageMapping, buildExploreImageMappingContext } from "../shared/explore-image-mapping.js";
import { resolveApprovedCatalogKind } from "../shared/approved-catalog.js";

const PUBLIC = path.join(process.cwd(), "client", "public");
const PAGES_DIR = path.join(PUBLIC, "catalog", "breakfast", "pages");
const INDEX_PATH = path.join(PUBLIC, "catalog", "breakfast", "index.json");

function main(): void {
  const failures: string[] = [];
  const slugs = BATCH_25_BREAKFAST_PAGES.map((p) => p.slug);

  if (slugs.length !== 25) {
    failures.push(`Expected 25 batch recipes, found ${slugs.length}`);
  }

  const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dupes.length) failures.push(`Duplicate slugs: ${dupes.join(", ")}`);

  for (const draft of BATCH_25_BREAKFAST_PAGES) {
    try {
      breakfastRecipePageSchema.parse({
        ...draft,
        nutrition: {
          calories: 400,
          protein: 20,
          carbs: 30,
          fat: 18,
          label: "per serving (hall portion)",
          source: "estimated",
        },
      });
    } catch (err) {
      failures.push(`${draft.slug}: schema ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!isBreakfastCatalogSlug(draft.slug)) {
      failures.push(`${draft.slug}: not registered in BREAKFAST_CATALOG_SLUGS`);
    }

    const pagePath = path.join(PAGES_DIR, `${draft.slug}.json`);
    if (!fs.existsSync(pagePath)) {
      failures.push(`${draft.slug}: missing page JSON`);
    }

    const hero = breakfastCatalogHeroPath(draft.slug);
    const thumb = breakfastCatalogThumbPath(draft.slug);
    const mobile = `/images/mobile/breakfast/${draft.slug}.jpg`;
    const rail = `/images/rails/breakfast/${draft.slug}.jpg`;

    if (!imageFileExists(hero, PUBLIC)) failures.push(`${draft.slug}: missing hero`);
    if (!imageFileExists(thumb, PUBLIC)) failures.push(`${draft.slug}: missing thumb`);
    if (!imageFileExists(mobile, PUBLIC)) failures.push(`${draft.slug}: missing mobile`);
    if (!imageFileExists(rail, PUBLIC)) failures.push(`${draft.slug}: missing rail`);

    const context = buildExploreImageMappingContext([{ slug: draft.slug, heroImage: hero }], PUBLIC);
    const row = validateExploreImageMapping(
      {
        slug: draft.slug,
        title: draft.title,
        kind: resolveApprovedCatalogKind(draft.slug),
        category: "breakfast_brunch",
        mealFormat: "breakfast",
        heroImage: hero,
        tags: draft.tags,
      },
      context,
    );
    if (!row.exploreEligible) {
      failures.push(`${draft.slug}: not Explore-eligible — ${row.issues[0]?.message || row.status}`);
    }
  }

  if (fs.existsSync(INDEX_PATH)) {
    const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")) as { recipeCount: number; recipes: Array<{ slug: string }> };
    for (const slug of slugs) {
      if (!index.recipes.some((r) => r.slug === slug)) {
        failures.push(`${slug}: missing from breakfast index.json`);
      }
    }
    if (index.recipeCount !== 67) {
      failures.push(`index recipeCount=${index.recipeCount}, expected 67`);
    }
  } else {
    failures.push("breakfast index.json missing");
  }

  const report = {
    generatedAt: new Date().toISOString(),
    batchSize: slugs.length,
    pass: failures.length === 0,
    failures,
  };

  const outDir = path.join("review");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "breakfast-batch-25-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("[audit:breakfast-batch-25] Summary");
  console.log(`  Recipes in batch: ${slugs.length}`);
  console.log(`  Failures:       ${failures.length}`);
  if (failures.length) {
    for (const f of failures.slice(0, 30)) console.log(`  - ${f}`);
    if (failures.length > 30) console.log(`  … and ${failures.length - 30} more`);
    process.exit(1);
  }
  console.log("  PASS — 25/25 pages, images, and Explore eligibility verified");
}

main();
