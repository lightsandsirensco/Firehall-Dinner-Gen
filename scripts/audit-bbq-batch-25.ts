#!/usr/bin/env tsx
/**   npm run audit:bbq-batch-25 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  BBQ_CATALOG_RECIPES,
  BBQ_CATALOG_RECIPE_COUNT,
  BATCH_30_BBQ_GRILL_RECIPES,
} from "../shared/bbq-expansion/batch-25-bbq-recipes.js";
import { goldenRecipePageSchema } from "../shared/golden-100/recipe-page-schema.js";
import { isBbqCatalogSlug } from "../shared/bbq-catalog/slug-registry.js";
import { bbqCatalogHeroPath, bbqCatalogThumbPath } from "../shared/bbq-catalog/slug-registry.js";
import { imageFileExists } from "../shared/explore-image-paths.js";
import { validateExploreImageMapping, buildExploreImageMappingContext } from "../shared/explore-image-mapping.js";
import { resolveApprovedCatalogKind } from "../shared/approved-catalog.js";

const PUBLIC = path.join(process.cwd(), "client", "public");
const PAGES_DIR = path.join(PUBLIC, "catalog", "bbq", "pages");
const INDEX_PATH = path.join(PUBLIC, "catalog", "bbq", "index.json");

function md5(filePath: string): string {
  return crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");
}

function main(): void {
  const failures: string[] = [];
  const slugs = BBQ_CATALOG_RECIPES.map((r) => r.manifest.slug);
  const heroHashes = new Map<string, string>();
  const phase6Slugs = new Set(BATCH_30_BBQ_GRILL_RECIPES.map((r) => r.manifest.slug));

  if (slugs.length !== BBQ_CATALOG_RECIPE_COUNT) {
    failures.push(`Expected ${BBQ_CATALOG_RECIPE_COUNT} recipes, found ${slugs.length}`);
  }
  if (BATCH_30_BBQ_GRILL_RECIPES.length !== 30) {
    failures.push(`Expected 30 Phase 6 recipes, found ${BATCH_30_BBQ_GRILL_RECIPES.length}`);
  }

  for (const recipe of BBQ_CATALOG_RECIPES) {
    const slug = recipe.manifest.slug;
    const pagePath = path.join(PAGES_DIR, `${slug}.json`);
    if (!fs.existsSync(pagePath)) {
      failures.push(`${slug}: missing page JSON`);
      continue;
    }
    try {
      goldenRecipePageSchema.parse(JSON.parse(fs.readFileSync(pagePath, "utf8")));
    } catch (err) {
      failures.push(`${slug}: schema ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!isBbqCatalogSlug(slug)) failures.push(`${slug}: not in BBQ_CATALOG_SLUGS`);

    const hero = bbqCatalogHeroPath(slug);
    const thumb = bbqCatalogThumbPath(slug);
    const mobile = `/images/mobile/smoker-catalog/${slug}.jpg`;
    const rail = `/images/rails/smoker-catalog/${slug}.jpg`;

    for (const [label, p] of [
      ["hero", hero],
      ["thumb", thumb],
      ["mobile", mobile],
      ["rail", rail],
    ] as const) {
      if (!imageFileExists(p, PUBLIC)) failures.push(`${slug}: missing ${label}`);
    }

    const heroAbs = path.join(PUBLIC, hero.replace(/^\//, "").replace(/\//g, path.sep));
    if (fs.existsSync(heroAbs)) {
      const hash = md5(heroAbs);
      const other = heroHashes.get(hash);
      if (other) failures.push(`${slug}: duplicate hero MD5 with ${other}`);
      else heroHashes.set(hash, slug);
    }

    const context = buildExploreImageMappingContext([{ slug, heroImage: hero }], PUBLIC);
    const row = validateExploreImageMapping(
      {
        slug,
        title: recipe.manifest.title,
        kind: resolveApprovedCatalogKind(slug),
        category: "bbq_grill_nights",
        mealFormat: recipe.manifest.mealFormat,
        heroImage: hero,
        tags: recipe.manifest.explorePools,
      },
      context,
    );
    if (!row.exploreEligible) {
      failures.push(`${slug}: not Explore-eligible — ${row.issues[0]?.message || row.status}`);
    }
  }

  if (fs.existsSync(INDEX_PATH)) {
    const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")) as {
      recipeCount: number;
      recipes: Array<{ slug: string }>;
    };
    for (const slug of slugs) {
      if (!index.recipes.some((r) => r.slug === slug)) {
        failures.push(`${slug}: missing from bbq index.json`);
      }
    }
    if (index.recipeCount !== BBQ_CATALOG_RECIPE_COUNT) {
      failures.push(`index recipeCount=${index.recipeCount}, expected ${BBQ_CATALOG_RECIPE_COUNT}`);
    }
  } else {
    failures.push("bbq index.json missing");
  }

  const phase6Heroes = [...phase6Slugs].filter((s) => {
    const heroAbs = path.join(PUBLIC, bbqCatalogHeroPath(s).replace(/^\//, "").replace(/\//g, path.sep));
    return fs.existsSync(heroAbs);
  });

  const report = {
    generatedAt: new Date().toISOString(),
    batchSize: slugs.length,
    phase6Count: BATCH_30_BBQ_GRILL_RECIPES.length,
    phase6Heroes: phase6Heroes.length,
    uniqueHeroes: heroHashes.size,
    pass: failures.length === 0,
    failures,
  };
  fs.mkdirSync("review", { recursive: true });
  fs.writeFileSync("review/bbq-catalog-audit.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("[audit:bbq-batch-25] Summary");
  console.log(`  Recipes: ${slugs.length} (${BBQ_CATALOG_RECIPE_COUNT} expected)`);
  console.log(`  Phase 6: ${BATCH_30_BBQ_GRILL_RECIPES.length} recipes, ${phase6Heroes.length} heroes on disk`);
  console.log(`  Unique heroes: ${heroHashes.size}/${slugs.length}`);
  console.log(`  Failures: ${failures.length}`);
  if (failures.length) {
    failures.slice(0, 30).forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log(`  PASS — ${BBQ_CATALOG_RECIPE_COUNT}/${BBQ_CATALOG_RECIPE_COUNT} pages, images, Explore eligibility`);
}

main();
