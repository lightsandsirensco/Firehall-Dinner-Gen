#!/usr/bin/env tsx
/**
 * Stage 5 — Golden 100, imagery metadata, recommendation manifest validation.
 */
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { validateGoldenManifest, GOLDEN_100_RECIPES } from "../shared/golden-100/index.js";
import { parseEditorialImageMetadata } from "../shared/editorial-image-metadata.js";
import { getVisualLockSpec } from "../shared/visual-lock.js";
import { IMAGE_STYLE_PRESET_IDS } from "../shared/image-style-presets.js";
import { buildRecommendationContext } from "../server/recommendation/context/build-context.js";
import { getMasterCategoryRailSections } from "../server/recommendation/rails/master-rails.js";
import { initCuratedRecipeStore, getCuratedStoreStats } from "../server/curated-recipe-store.js";
import { runDbMigrations } from "../server/db/migrate.js";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";

async function main(): Promise<void> {
  const manifestIssues = validateGoldenManifest();
  const manifestErrors = manifestIssues.filter((i) => i.severity === "error");
  assert.equal(manifestErrors.length, 0, manifestErrors.map((i) => i.message).join("; "));
  assert.equal(GOLDEN_100_RECIPES.length, 101);

  for (const id of IMAGE_STYLE_PRESET_IDS) {
    const lock = getVisualLockSpec(id);
    assert.ok(lock.cameraAngleDeg.max >= lock.cameraAngleDeg.min);
  }

  const ctx = buildRecommendationContext({ crewSize: 6 });
  assert.ok(ctx.daySeed > 0);
  const rails = getMasterCategoryRailSections();
  assert.ok(rails.length >= 10);

  await runDbMigrations();
  await initCuratedRecipeStore();
  const stats = getCuratedStoreStats();
  assert.ok(stats.published >= 0);

  const publicRoot = path.join(process.cwd(), "client", "public", "images");
  let brokenPaths = 0;
  for (const r of GOLDEN_100_RECIPES.slice(0, 5)) {
    const slug = r.classicSlug || r.slug;
    const hero = path.join(publicRoot, "golden-100", `${slug}.jpg`);
    if (!fs.existsSync(hero)) {
      brokenPaths++;
    }
    const meta = parseEditorialImageMetadata({
      heroImage: `/images/golden-100/${slug}.jpg`,
      thumbnailImage: `/images/thumbs/${slug}.jpg`,
      mobileHeroImage: `/images/mobile/${slug}.jpg`,
      railPreviewImage: `/images/rails/${slug}.jpg`,
      stylePreset: "comfort_firehall",
      imageVersion: 0,
      imageApproved: false,
      imagePromptSeed: "test",
    });
    assert.ok(meta?.mobileHeroImage);
  }

  releaseSqliteTimersForTests();

  console.log("[stage5-validate-platform] OK", {
    golden100: GOLDEN_100_RECIPES.length,
    rails: rails.length,
    curatedPublished: stats.published,
    sampleMissingHeroes: brokenPaths,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
