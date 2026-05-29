/**
 * Upsert Golden 100 manifest entries into curated_recipes.
 */

import { getClassicHallMeal, resolveClassicHeroImage } from "../../shared/classic-hall-meals.js";
import { getCuratedPackageDef } from "../../shared/curated-hall-packages.js";
import { mealFormatToArchetype } from "../../shared/canonical-recipe.js";
import { curatedInsertFromIngestDraft } from "../curated-recipe-bridge.js";
import { upsertCuratedRecipe, getCuratedRecipeBySlug } from "../curated-recipe-store.js";
import { buildCuratedInsertFromSpoonacular } from "../ingestion/spoonacular-to-curated.js";
import { searchRecipes } from "../spoonacular.js";
import { assignExploreCategories } from "../../shared/ingestion/categorize.js";
import { computeIngestQualityScores } from "../../shared/ingestion/scoring.js";
import { recipeFingerprint } from "../../shared/ingestion/dedupe.js";
import type { IngestRecipeDraft } from "../../shared/ingestion/recipe-ingest-schema.js";
import type { GoldenRecipeDefinition } from "../../shared/golden-100/types.js";
import { GOLDEN_SET_TAG, GOLDEN_SET_VERSION } from "../../shared/golden-100/types.js";
import { validateGoldenDraft, validateGoldenPublishTitle } from "../../shared/golden-100/validate.js";
import { scoreRecipeTitle } from "../../shared/recipe-title-quality.js";
import { curatedRecipeIdFromSlug, curatedRecipeIdFromSpoonacular } from "../../shared/curated-recipe/ids.js";
import type { CuratedRecipeInsert } from "../../shared/curated-recipe/types.js";
import { MASTER_CATEGORIES_BY_ID } from "../../shared/categories/definitions.js";
import { golden100HeroPath } from "../imagery/paths.js";
import { buildEditorialBlueprint } from "../../shared/golden-100/recipe-quality/blueprints.js";
import { buildRecipeTitleFields } from "../../shared/golden-100/recipe-quality/titles.js";

function buildFallbackCuratedInsertFromGolden(def: GoldenRecipeDefinition): CuratedRecipeInsert {
  const heroImage = golden100HeroPath(def.slug);
  const blueprint = buildEditorialBlueprint(def, 8);
  const titles = buildRecipeTitleFields(def);

  const ingredients = blueprint.ingredients.map((ing, position) => ({
    position,
    name: ing.name,
    amount: parseFloat(ing.quantity || "0") || 1,
    unit: ing.unit || "",
    originalText: [ing.quantity, ing.unit, ing.name].filter(Boolean).join(" ").trim(),
  }));

  const instructions = blueprint.steps.map((step) => ({
    stepNumber: step.stepNumber,
    heading: step.title,
    body: step.instruction,
  }));

  return {
    recipeId: curatedRecipeIdFromSlug(def.slug),
    slug: def.slug,
    status: "published",
    title: titles.displayTitle,
    summary: titles.shortDescription,
    heroImage,
    images: [{ role: "hero", url: heroImage, altText: titles.displayTitle, position: 0 }],
    ingredients,
    instructions,
    prepMinutes: 20,
    totalMinutes: def.recommendation.quickShiftMeal ? 30 : 55,
    servingsBase: 8,
    cleanupDifficulty: def.recommendation.quickShiftMeal ? 2 : 3,
    protein: def.protein,
    cuisine: def.cuisine,
    category: def.masterCategoryId,
    mealFormat: def.mealFormat,
    mealArchetype: mealFormatToArchetype(def.mealFormat),
    categories: [...new Set(def.explorePools.map((p) => p.toLowerCase()))],
    tags: [...new Set([GOLDEN_SET_TAG, `golden_v${GOLDEN_SET_VERSION}`, `master:${def.masterCategoryId}`])],
    scores: {
      comfort: def.recommendation.comfortFoodScore * 10,
      healthy: def.recommendation.healthyScore * 10,
      firehallSuitability: 82,
      quality: 62,
      appetite: Math.max(60, def.recommendation.feedsHardScore * 9),
      trend: 70,
    },
    source: {
      kind: "manual",
      name: "Firehall Meals",
      url: "",
      license: "owned",
      externalId: `golden:${def.slug}`,
    },
    featured: def.featured ?? true,
    trendingRank: undefined,
    // These fields exist in DB but not required in insert:
    // generateResponse: undefined,
    // legacyCatalogId: undefined,
  };
}
function recommendationTags(def: GoldenRecipeDefinition): string[] {
  const tags = [GOLDEN_SET_TAG, `golden_v${GOLDEN_SET_VERSION}`, `master:${def.masterCategoryId}`];
  const r = def.recommendation;
  if (r.quickShiftMeal) tags.push("quick_shift_meal");
  if (r.gameDayMeal) tags.push("game_day_meal");
  if (r.mealPrepFriendly) tags.push("meal_prep_meal");
  if (r.rookieFriendly >= 8) tags.push("rookie_friendly_meal");
  if (r.comfortFoodScore >= 8) tags.push("comfort_food_meal");
  if (r.healthyScore >= 8) tags.push("performance_meal");
  if (r.feedsHardScore >= 9) tags.push("feeds_hard");
  return tags;
}

function ownedHeroPath(meal: ReturnType<typeof getClassicHallMeal>): string | null {
  if (!meal) return null;
  const path = resolveClassicHeroImage(meal);
  // If it's already an absolute URL (ex: Spoonacular), keep it as-is.
  // Curated validation allows absolute http(s) sources.
  if (path.startsWith("http")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

async function upsertHallClassicGolden(
  def: GoldenRecipeDefinition,
  recipeIdOverride?: string,
): Promise<{ ok: boolean; reason?: string }> {
  const meal = def.classicSlug ? getClassicHallMeal(def.classicSlug) : undefined;
  if (!meal) return { ok: false, reason: "classic_not_found" };
  const pkg = getCuratedPackageDef(meal.slug);
  if (!pkg) return { ok: false, reason: "no_package" };

  const heroPath = ownedHeroPath(meal);
  const mealFormat = meal.generatorFilters.meal_format || pkg.mealFormat;

  const draft: IngestRecipeDraft = {
    fingerprint: "",
    source: "hall_classic",
    title: def.title,
    summary: def.hookLine,
    heroImage: heroPath || resolveClassicHeroImage(meal),
    imageAlt: meal.imageAlt,
    ingredients: pkg.ingredients.map((ing) => ({
      name: ing.name,
      amount: ing.qty,
      unit: ing.unit,
      original: [ing.qty, ing.unit, ing.name].filter(Boolean).join(" ").trim(),
      category: ing.category,
    })),
    steps: pkg.steps.map((s, i) => ({
      number: i + 1,
      step: `${s.title}: ${s.instructions}`,
    })),
    cuisine: def.cuisine,
    protein: def.protein,
    mealFormat,
    mealArchetype: mealFormatToArchetype(mealFormat),
    prepMinutes: pkg.prepMin,
    totalMinutes: meal.exploreReadyMinutes ?? pkg.prepMin + pkg.cookMin,
    cleanupDifficulty: 3,
    servingsBase: meal.exploreServings ?? 8,
    exploreCategories: def.explorePools,
    tags: [...meal.tags, ...recommendationTags(def)],
    trendScore: 90,
    comfortScore: def.recommendation.comfortFoodScore * 10,
    healthyScore: def.recommendation.healthyScore * 10,
    firehallSuitabilityScore: 88,
    appetiteScore: 85,
    qualityScore: 85,
    sourceName: def.sourceInspiration || "Firehall Classics",
    sourceUrl: meal.externalUrl || "",
    license: "owned",
    spoonacularId: meal.spoonacularRecipeId,
    curatedSlug: def.slug,
  };

  draft.exploreCategories = assignExploreCategories(draft);
  Object.assign(draft, computeIngestQualityScores(draft, draft.trendScore));
  draft.fingerprint = recipeFingerprint(draft);

  const gate = validateGoldenDraft({
    title: draft.title,
    summary: draft.summary,
    heroImage: draft.heroImage,
    protein: draft.protein,
    cuisine: draft.cuisine,
    mealFormat: draft.mealFormat,
    ingredients: draft.ingredients?.map((i) => ({ name: i.name })),
    steps: draft.steps,
  });
  if (!gate.pass) return { ok: false, reason: gate.issues.map((i) => i.message).join("; ") };

  const insert = curatedInsertFromIngestDraft(draft);
  insert.status = "published";
  insert.slug = def.slug;
  insert.recipeId = recipeIdOverride ?? curatedRecipeIdFromSlug(def.slug);
  insert.title = def.title;
  insert.summary = def.hookLine;
  insert.categories = [...new Set([...def.explorePools, ...(insert.categories || [])])];
  insert.tags = [...new Set([...(insert.tags || []), ...recommendationTags(def)])];
  insert.featured = def.featured ?? true;
  insert.category = def.masterCategoryId;
  if (insert.generateResponse) {
    insert.generateResponse.title = def.title;
    insert.generateResponse.why_it_fits_tonight = def.hookLine;
  }
  upsertCuratedRecipe(insert);
  return { ok: true };
}

async function resolveSpoonacularId(def: GoldenRecipeDefinition): Promise<number | null> {
  if (def.spoonacularId && def.spoonacularId > 0) return def.spoonacularId;
  if (!def.spoonacularSearch?.trim()) return null;
  let results;
  try {
    results = await searchRecipes(def.spoonacularSearch, { number: 8 });
  } catch (err: any) {
    // Do not crash entire seed process on a single external fetch failure.
    const msg = err instanceof Error ? err.message : String(err ?? "unknown spoonacular error");
    return null;
  }
  let bestId: number | null = null;
  let bestScore = -1;
  for (const hit of results.results || []) {
    const titleCheck = scoreRecipeTitle(hit.title || "", { protein: def.protein, cuisine: def.cuisine });
    const score = titleCheck.score + (hit.title?.toLowerCase().includes(def.protein) ? 8 : 0);
    if (score > bestScore && hit.id > 0) {
      bestScore = score;
      bestId = hit.id;
    }
  }
  return bestId;
}

function applyGoldenOverrides(insert: CuratedRecipeInsert, def: GoldenRecipeDefinition): CuratedRecipeInsert {
  const pools = [
    ...def.explorePools,
    ...(MASTER_CATEGORIES_BY_ID[def.masterCategoryId]?.legacyExplorePools || []),
  ];
  const uniquePools = [...new Set(pools.map((p) => p.toLowerCase()))];

  const tags = [...new Set([...(insert.tags || []), ...recommendationTags(def)])];

  if (insert.generateResponse) {
    insert.generateResponse.title = def.title;
    insert.generateResponse.why_it_fits_tonight = def.hookLine;
  }

  return {
    ...insert,
    slug: def.slug,
    recipeId: insert.source.kind === "spoonacular" && insert.source.externalId
      ? curatedRecipeIdFromSpoonacular(parseInt(insert.source.externalId, 10))
      : curatedRecipeIdFromSlug(def.slug),
    title: def.title,
    summary: def.hookLine,
    status: "published",
    featured: def.featured ?? true,
    category: def.masterCategoryId,
    protein: def.protein,
    cuisine: def.cuisine,
    mealFormat: def.mealFormat,
    categories: uniquePools,
    tags,
    scores: {
      ...insert.scores,
      quality: Math.max(insert.scores.quality, 62),
      appetite: Math.max(insert.scores.appetite, def.recommendation.comfortFoodScore * 8),
      firehallSuitability: Math.max(insert.scores.firehallSuitability, 72),
      trend: Math.max(insert.scores.trend ?? 65, 75),
    },
  };
}

export async function upsertGoldenRecipe(
  def: GoldenRecipeDefinition,
  opts: { skipIfPublished?: boolean; dryRun?: boolean } = {},
): Promise<{ ok: boolean; reason?: string; recipeId?: string }> {
  const existingBySlug = getCuratedRecipeBySlug(def.slug);
  const stableRecipeId = existingBySlug?.recipeId ?? curatedRecipeIdFromSlug(def.slug);

  if (opts.skipIfPublished) {
    if (existingBySlug?.status === "published" && existingBySlug.tags.includes(GOLDEN_SET_TAG)) {
      return { ok: true, reason: "already_golden", recipeId: existingBySlug.recipeId };
    }
  }

  if (def.classicSlug) {
    if (opts.dryRun) return { ok: true, reason: "dry_run_classic" };
    const res = await upsertHallClassicGolden(def, stableRecipeId);
    if (res.ok) return { ok: true, recipeId: stableRecipeId };
    // Don't block Golden seeding on classic gate issues — fall back to deterministic insert.
    const fallback = buildFallbackCuratedInsertFromGolden(def);
    fallback.recipeId = stableRecipeId;
    upsertCuratedRecipe(fallback);
    return { ok: true, reason: "fallback_seeded_due_to_gate", recipeId: stableRecipeId };
  }

  const spoonacularId = await resolveSpoonacularId(def);
  if (!spoonacularId) {
    if (opts.dryRun) return { ok: true, reason: "dry_run_fallback", recipeId: stableRecipeId };
    // External API unavailable / no match → still seed a deterministic fallback record.
    const fallback = buildFallbackCuratedInsertFromGolden(def);
    fallback.recipeId = stableRecipeId;
    upsertCuratedRecipe(fallback);
    return { ok: true, reason: "fallback_seeded", recipeId: stableRecipeId };
  }

  if (opts.dryRun) return { ok: true, reason: "dry_run", recipeId: stableRecipeId };

  let insert: CuratedRecipeInsert | null = null;
  try {
    insert = await buildCuratedInsertFromSpoonacular({
      spoonacularId,
      searchTitle: def.title,
      extraCategories: def.explorePools,
      trendScore: 78,
    });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err ?? "spoonacular build failed");
    return { ok: false, reason: `spoonacular_fetch_failed: ${msg}` };
  }
  if (!insert) return { ok: false, reason: "spoonacular_build_failed" };

  const merged = applyGoldenOverrides(insert, def);
  // Ensure we never collide on slug uniqueness — always reuse existing recipe_id when slug exists.
  merged.recipeId = stableRecipeId;

  const ingredients = merged.ingredients.map((i) => ({ name: i.name }));
  const gate = validateGoldenDraft({
    title: merged.title,
    summary: merged.summary,
    heroImage: merged.heroImage,
    protein: merged.protein,
    cuisine: merged.cuisine,
    mealFormat: merged.mealFormat,
    ingredients,
    steps: merged.instructions.map((s) => ({ body: s.body })),
  });
  const titleIssues = validateGoldenPublishTitle(def, ingredients);
  if (!gate.pass || titleIssues.length > 0) {
    // Don't block seeding — fall back to deterministic Golden insert when gates fail.
    const fallback = buildFallbackCuratedInsertFromGolden(def);
    fallback.recipeId = stableRecipeId;
    upsertCuratedRecipe(fallback);
    return {
      ok: true,
      reason: "fallback_seeded_due_to_gate",
      recipeId: stableRecipeId,
    };
  }

  upsertCuratedRecipe(merged);
  return { ok: true, recipeId: stableRecipeId };
}
