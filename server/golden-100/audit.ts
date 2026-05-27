/**
 * Golden 100 dataset audit — manifest vs curated DB.
 */

import {
  GOLDEN_100_RECIPES,
  GOLDEN_100_TARGET_BY_CATEGORY,
  GOLDEN_SET_TAG,
  GOLDEN_SET_VERSION,
  validateGoldenManifest,
  validateGoldenManifestEntry,
} from "../../shared/golden-100/index.js";
import type { GoldenManifestAudit, GoldenRecipeAuditIssue } from "../../shared/golden-100/types.js";
import type { MasterCategoryId } from "../../shared/categories/constants.js";
import { scoreRecipeTitle } from "../../shared/recipe-title-quality.js";
import { normalizeTitleKey } from "../../shared/ingestion/dedupe.js";
import { listCuratedSummariesByTag, getCuratedRecipeBySlug } from "../curated-recipe-store.js";
import { isFirehallOwnedHeroUrl } from "../../shared/food-imagery/paths.js";
import { buildGoldenImageryMeta } from "../../shared/golden-100/imagery.js";

export function auditGoldenManifestStatic(): GoldenRecipeAuditIssue[] {
  return validateGoldenManifest();
}

export function auditGolden100Dataset(): GoldenManifestAudit {
  const manifestIssues = validateGoldenManifest();
  const tagged = listCuratedSummariesByTag(GOLDEN_SET_TAG);
  const taggedSlugs = new Set(tagged.map((r) => r.slug));

  const missingInDb: string[] = [];
  const weakTitles: GoldenRecipeAuditIssue[] = [];
  const qualityFailures: GoldenRecipeAuditIssue[] = [];
  let passesGoldenGate = 0;

  for (const def of GOLDEN_100_RECIPES) {
    const inDb = getCuratedRecipeBySlug(def.slug);
    if (!inDb || inDb.status !== "published") {
      missingInDb.push(def.slug);
      continue;
    }

    const titleCheck = scoreRecipeTitle(inDb.title, {
      mealFormat: inDb.mealFormat,
      protein: inDb.protein,
      cuisine: inDb.cuisine,
    });
    if (!titleCheck.pass || inDb.title !== def.title) {
      weakTitles.push({
        slug: def.slug,
        code: "db_title_drift",
        message: `db="${inDb.title}" manifest="${def.title}"`,
        severity: "warn",
      });
    }

    if (inDb.scores.quality >= 58 && titleCheck.pass) {
      passesGoldenGate++;
    } else {
      qualityFailures.push({
        slug: def.slug,
        code: "db_quality",
        message: `quality=${inDb.scores.quality}`,
        severity: "warn",
      });
    }
  }

  const manifestSlugs = new Set(GOLDEN_100_RECIPES.map((r) => r.slug));
  const extraGoldenInDb = tagged
    .map((r) => r.slug)
    .filter((slug) => !manifestSlugs.has(slug));

  const titleKeyCounts = new Map<string, number>();
  for (const def of GOLDEN_100_RECIPES) {
    const k = normalizeTitleKey(def.title);
    titleKeyCounts.set(k, (titleKeyCounts.get(k) || 0) + 1);
  }
  const duplicateTitleKeys = [...titleKeyCounts.entries()]
    .filter(([, n]) => n > 1)
    .map(([k]) => k);

  const missingImagery = GOLDEN_100_RECIPES.filter((d) => {
    const row = getCuratedRecipeBySlug(d.slug);
    if (!row) return true;
    const meta = buildGoldenImageryMeta(d);
    return !meta.shotPreset || (!row.heroImage?.trim() && !isFirehallOwnedHeroUrl(row.heroImage));
  }).map((d) => d.slug);

  const proteinBalance: Record<string, number> = {};
  for (const def of GOLDEN_100_RECIPES) {
    proteinBalance[def.protein] = (proteinBalance[def.protein] || 0) + 1;
  }

  const byCategory = {} as GoldenManifestAudit["categoryDistribution"];
  for (const [cat, target] of Object.entries(GOLDEN_100_TARGET_BY_CATEGORY)) {
    const manifest = GOLDEN_100_RECIPES.filter((r) => r.masterCategoryId === cat).length;
    const db = GOLDEN_100_RECIPES.filter((r) => {
      const row = getCuratedRecipeBySlug(r.slug);
      return row?.status === "published" && row.tags.includes(GOLDEN_SET_TAG);
    }).length;
    byCategory[cat as MasterCategoryId] = { target, manifest, db };
  }

  return {
    version: GOLDEN_SET_VERSION,
    manifestCount: GOLDEN_100_RECIPES.length,
    publishedGoldenCount: tagged.length,
    matchedInDb: GOLDEN_100_RECIPES.length - missingInDb.length,
    missingInDb,
    extraGoldenInDb,
    weakTitles: [...manifestIssues.filter((i) => i.code.includes("title")), ...weakTitles],
    missingImagery,
    duplicateTitleKeys,
    categoryDistribution: byCategory,
    qualityFailures,
    proteinBalance,
    passesGoldenGate,
  };
}
