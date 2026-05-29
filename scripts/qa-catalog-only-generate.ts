/**
 * QA: dual-catalog gate + generator picks + public naming.
 *
 * Usage: npm run qa:catalog-only
 */

import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { PERFORMANCE_ADAPTED_RECIPES } from "../shared/performance-meals/adapted/index.js";
import {
  evaluateCatalogRecipe,
  isApprovedCatalogSlug,
  isPerformance50Slug,
  resolveCatalogHeroPath,
  resolvePrimaryCatalogBadge,
  titleMatchesCatalog,
} from "../shared/hall-catalog/gate.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { pickGolden100ForGenerate } from "../server/generation/pick-local-recipes.js";
import type { GenerateRequest } from "../shared/schema.js";
import { createDefaultGenerateRequest } from "../shared/generate-request-defaults.js";
import { flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";

const FORBIDDEN_PUBLIC = ["Golden 100", "Performance 50", "golden_100", "performance_50"];

const SCENARIOS: Array<{ label: string; patch: Partial<GenerateRequest>; expectPerformance?: boolean }> = [
  { label: "chicken", patch: { protein: "chicken" } },
  { label: "beef", patch: { protein: "beef" } },
  { label: "surprise_me", patch: { protein: "any", meal_format: "random" } },
  { label: "quick_meals", patch: { time_available: "15-25", firehall_category: "quick_meals" } },
  { label: "comfort_food", patch: { healthiness_preference: "comfort", firehall_category: "comfort_food" } },
  { label: "high_protein", patch: { healthiness_preference: "lean", firehall_category: "high_protein" }, expectPerformance: true },
  { label: "healthy", patch: { healthiness_preference: "lean", firehall_category: "healthy_options" }, expectPerformance: true },
  { label: "bbq", patch: { firehall_category: "bbq_smoker", protein: "pork" } },
  { label: "feed_a_crowd", patch: { crew_size: 12, firehall_category: "feed_a_crowd" } },
];

function assertNoForbiddenPublic(label: string, value: string): string[] {
  const errors: string[] = [];
  for (const forbidden of FORBIDDEN_PUBLIC) {
    if (value.includes(forbidden)) {
      errors.push(`${label}: forbidden public label "${forbidden}" in "${value}"`);
    }
  }
  return errors;
}

function assertManifestGate(): string[] {
  const errors: string[] = [];
  for (const def of GOLDEN_100_RECIPES) {
    const gate = evaluateCatalogRecipe({
      slug: def.slug,
      title: def.title,
      heroImage: resolveCatalogHeroPath(def.slug),
      source: "hall_catalog",
    });
    if (!gate.approved) errors.push(`golden manifest ${def.slug}: ${gate.reasons.join(",")}`);
    errors.push(...assertNoForbiddenPublic(`golden ${def.slug}`, resolvePrimaryCatalogBadge(def.slug)));
  }
  for (const perf of PERFORMANCE_ADAPTED_RECIPES) {
    const slug = perf.manifest.slug;
    const gate = evaluateCatalogRecipe({
      slug,
      title: perf.manifest.title,
      heroImage: resolveCatalogHeroPath(slug),
      source: "hall_catalog",
    });
    if (!gate.approved) errors.push(`performance manifest ${slug}: ${gate.reasons.join(",")}`);
    errors.push(...assertNoForbiddenPublic(`performance ${slug}`, resolvePrimaryCatalogBadge(slug)));
    if (resolvePrimaryCatalogBadge(slug) !== "Performance Meal") {
      errors.push(`performance ${slug}: expected Performance Meal badge`);
    }
  }
  return errors;
}

function assertPick(
  scenario: (typeof SCENARIOS)[number],
  pick: ReturnType<typeof pickGolden100ForGenerate>,
  index: number,
): string[] {
  const errors: string[] = [];
  const label = scenario.label;
  if (!pick) {
    errors.push(`${label}[${index}]: no pick returned`);
    return errors;
  }
  if (!isApprovedCatalogSlug(pick.slug)) {
    errors.push(`${label}[${index}]: slug ${pick.slug} not in approved catalog`);
  }
  const catalogTitle =
    GOLDEN_100_RECIPES.find((r) => r.slug === pick.slug)?.title ||
    PERFORMANCE_ADAPTED_RECIPES.find((r) => r.manifest.slug === pick.slug)?.manifest.title;
  if (catalogTitle && !titleMatchesCatalog(pick.originalTitle, catalogTitle)) {
    errors.push(`${label}[${index}]: title mismatch "${pick.originalTitle}" vs "${catalogTitle}"`);
  }
  const badge = resolvePrimaryCatalogBadge(pick.slug);
  errors.push(...assertNoForbiddenPublic(`${label}[${index}] badge`, badge));

  if (scenario.expectPerformance && !isPerformance50Slug(pick.slug)) {
    errors.push(`${label}[${index}]: expected Performance catalog pick, got ${pick.slug}`);
  }

  return errors;
}

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  const errors = assertManifestGate();
  let total = 0;
  let performancePicks = 0;

  for (const scenario of SCENARIOS) {
    const perScenario = Math.ceil(100 / SCENARIOS.length);
    for (let i = 0; i < perScenario && total < 100; i++) {
      total++;
      const request: GenerateRequest = {
        ...createDefaultGenerateRequest(),
        ...scenario.patch,
      };
      const pick = pickGolden100ForGenerate(request, {
        varietySeed: `${scenario.label}:${i}`,
        recentSignatures: [],
        recentSlugs: [],
      });
      if (pick && isPerformance50Slug(pick.slug)) performancePicks++;
      errors.push(...assertPick(scenario, pick, i));
    }
  }

  console.log(
    `\n[catalog-only QA] golden=${GOLDEN_100_RECIPES.length} performance=${PERFORMANCE_ADAPTED_RECIPES.length} generations=${total} performancePicks=${performancePicks} errors=${errors.length}`,
  );

  if (errors.length > 0) {
    for (const e of errors.slice(0, 25)) console.error(`  - ${e}`);
    if (errors.length > 25) console.error(`  ... and ${errors.length - 25} more`);
    releaseSqliteTimersForTests();
    flushSqliteToDisk();
    process.exit(1);
  }

  console.log("[catalog-only QA] PASS — dual catalog gated, clean public labels, 100/100 picks");
  releaseSqliteTimersForTests();
  flushSqliteToDisk();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
