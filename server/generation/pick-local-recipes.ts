/**
 * Local recipe picks for generate pipeline — Golden 100 + Performance 50 catalogs.
 */

import type { GenerateRequest, GenerateResponse } from "@shared/schema";
import type { RecipeSourceAttribution } from "../../shared/canonical-recipe.js";
import { GOLDEN_SET_TAG } from "../../shared/golden-100/types.js";
import { GOLDEN_100_RECIPES } from "../../shared/golden-100/manifest.js";
import { PERFORMANCE_SET_TAG } from "../../shared/performance-meals/types.js";
import { PERFORMANCE_ADAPTED_RECIPES } from "../../shared/performance-meals/adapted/index.js";
import { HALL_EXPANSION_ADAPTED_RECIPES } from "../../shared/hall-expansion/adapted/index.js";
import { BBQ_CATALOG_RECIPES } from "../../shared/bbq-expansion/batch-25-bbq-recipes.js";
import {
  catalogCollectionScoreBoost,
  isApprovedCatalogSlug,
  isGolden100Slug,
  isPerformance50Slug,
  isHallExpansionSlug,
  isBbqCatalogSlug,
  resolveCatalogCollection,
  resolveCatalogRankBias,
  type CatalogCollectionId,
} from "../../shared/hall-catalog/gate.js";
import { hydrateCatalogGenerateResponse } from "../meal-catalog/hydrate-golden-generate.js";
import { loadMergedHallCatalogIndex } from "../meal-catalog/load-index.js";
import { readBbqCatalogIndexFromDisk } from "../bbq-catalog/catalog.js";
import { applyCrewPortionFloors, hallProTips } from "../firehall-voice.js";
import {
  getCuratedRecipeBySlug,
  getCuratedRecipeCategoryKeysBySlug,
  listCuratedRecipeSummaries,
  listCuratedSummariesByTag,
} from "../curated-recipe-store.js";
import { proteinMatchesFilter } from "../spoonacular-converter.js";
import { computeSignature } from "../validateRecipe.js";
import { log } from "../logger.js";
import { isExcludedFromDinnerFeeds } from "../../shared/fuel-catalog/isolation.js";
import { isBreakfastMeal } from "../../shared/hall-catalog/isolation.js";
import {
  recentSlugPenalty,
  weightedPickIndex,
} from "../../shared/meal-rotation/weighted-pick.js";
import {
  buildFirehallPoolStages,
  loadFirehallCategoryPool,
  logFirehallPoolAttempt,
  type FirehallCategorySummaryRow,
} from "./firehall-category-pools.js";
import type { FirehallCategoryId } from "../../shared/firehall-categories.js";
import { FIREHALL_CATEGORY_RULES } from "../../shared/firehall-categories.js";
import { recipeMetaMatchesFirehallCategory } from "../../shared/firehall-category-validation.js";
import {
  recipePassesHardFilters,
  scoreCrewFit,
  scoreHealthinessPreference,
} from "./generator-match.js";
import { scanRecipeForAllergens } from "../allergens.js";
import { classifyRecipeDietary } from "../../shared/dietary/classify-recipe.js";
import {
  TIME_BUCKET_MAX_MINUTES as TIME_MAX_MINUTES,
  recipeFitsTimeBucket,
} from "../../shared/generation/time-buckets.js";

export interface LocalRecipePick {
  recipe: GenerateResponse;
  protein: string;
  originalTitle: string;
  catalogId: string;
  recipeSource?: RecipeSourceAttribution;
  slug: string;
  matchedCategory?: FirehallCategoryId;
}

function signatureBlocked(
  sig: string,
  recentSignatures?: string[],
  currentRecipeSignature?: string,
): boolean {
  if (currentRecipeSignature && sig === currentRecipeSignature) return true;
  if (recentSignatures?.includes(sig)) return true;
  return false;
}

function scoreCuratedRow(
  row: { protein: string; totalMinutes: number; scores: { quality: number }; sourceKind: string },
  request: GenerateRequest,
): number {
  let score = row.scores.quality || 0;
  const selected = request.protein || "any";
  if (proteinMatchesFilter(row.protein, selected)) score += 40;
  const maxMin = TIME_MAX_MINUTES[request.time_available];
  if (maxMin && row.totalMinutes > 0 && row.totalMinutes <= maxMin + 10) score += 15;
  if (row.sourceKind === "publisher") score += 18;
  else if (row.sourceKind === "hall_classic") score += 12;

  const fc = request.firehall_category;
  if (fc && FIREHALL_CATEGORY_RULES[fc].preferPerformance) {
    if (/performance|healthy_performance/i.test(row.sourceKind)) score += 20;
  }

  return score;
}

function validateCategoryPick(
  slug: string,
  request: GenerateRequest,
  categoryId: FirehallCategoryId,
): boolean {
  const full = getCuratedRecipeBySlug(slug);
  const keys = getCuratedRecipeCategoryKeysBySlug(slug);
  const result = recipeMetaMatchesFirehallCategory(
    {
      slug,
      totalMinutes: full?.totalMinutes ?? 0,
      mealFormat: full?.mealFormat,
      sourceKind: full?.source?.kind,
      categoryKeys: keys,
    },
    categoryId,
  );
  if (!result.ok) {
    log(`[generate:local] reject category mismatch slug=${slug} reason=${result.reason}`, "generate");
  }
  return result.ok;
}

function hydratePick(
  slug: string,
  request: GenerateRequest,
  _recipeSource?: RecipeSourceAttribution,
): LocalRecipePick | null {
  if (!isApprovedCatalogSlug(slug)) {
    log(`[generate:local] reject non-catalog slug=${slug}`, "generate");
    return null;
  }

  const full = getCuratedRecipeBySlug(slug);
  const wantsBreakfast = request.meal_format === "breakfast";
  if (!wantsBreakfast && full && isBreakfastMeal(full)) return null;

  if (full) {
    const hard = recipePassesHardFilters(full, request);
    if (!hard.ok) {
      log(
        `[generate:local] reject hard filter slug=${slug} reason=${hard.reason} detail=${hard.detail ?? ""}`,
        "generate",
      );
      return null;
    }
  }

  const hydrated = hydrateCatalogGenerateResponse(slug, request.crew_size);
  if (!hydrated) {
    log(`[generate:local] reject unhydrated catalog slug=${slug}`, "generate");
    return null;
  }

  // Real hard time filter — uses the fully-hydrated recipe's own computed
  // timing (prep + cook), never a possibly-stale/unknown summary field. This
  // was previously only a +15 soft-scoring bonus (see scoreCuratedRow), which
  // meant a 90+ minute recipe could still win and be served to someone who
  // asked for "15-25 min." Time is now enforced the same way allergens and
  // dietary restrictions are: reject before ever reaching the client.
  const totalMinutes = hydrated.recipe.timing?.total_minutes;
  if (!recipeFitsTimeBucket(totalMinutes, request.time_available)) {
    log(
      `[generate:local] reject time slug=${slug} total_minutes=${totalMinutes} bucket=${request.time_available}`,
      "generate",
    );
    return null;
  }

  const protein = hydrated.protein || defProtein(full, hydrated.recipe);
  const scaled: GenerateResponse = {
    ...hydrated.recipe,
    title: hydrated.title,
    chosen_protein: protein,
    ingredients: applyCrewPortionFloors(hydrated.recipe.ingredients || [], request.crew_size),
    pro_tips:
      hydrated.recipe.pro_tips?.length
        ? hydrated.recipe.pro_tips
        : hallProTips(request.crew_size, full?.servingsBase || 4),
    _recipe_source: (hydrated.recipe._recipe_source ?? full?.source) as RecipeSourceAttribution,
    hall_curated: true,
  };

  const allergens = request.allergens_to_avoid || [];
  if (allergens.length > 0) {
    const scan = scanRecipeForAllergens(
      (scaled.ingredients || []).map((i) => ({
        item: i.item,
        amount: i.amount,
        notes: i.notes,
      })),
      scaled.steps || [],
      scaled.title,
      allergens,
    );
    if (scan.found) {
      log(
        `[generate:local] reject hydrated allergen slug=${slug} violations=${scan.violations.join(";")}`,
        "generate",
      );
      return null;
    }
  }

  // Strict dietary restrictions (vegan, pork-free, vegetarian, etc.) go through the SAME
  // canonical classifier used by Explore/Browse — never the separate `allergens.ts` keyword
  // scanner above, and never a trusted-but-unverified catalog `protein` tag. Classified live
  // from this candidate's own scaled ingredient list, so it can never be stale. A candidate
  // is rejected (not substituted — you cannot safely "swap out" meat from a meat dish) unless
  // classification confidence is "high" AND every requested flag is confirmed true.
  const dietaryRestrictions = request.dietary_restrictions || [];
  if (dietaryRestrictions.length > 0) {
    const profile = classifyRecipeDietary(
      (scaled.ingredients || []).map((i) => ({ name: i.item, notes: i.notes })),
    );
    const violated = profile.confidence !== "high" || dietaryRestrictions.some((key) => !profile.flags[key]);
    if (violated) {
      log(
        `[generate:local] reject hydrated dietary slug=${slug} requested=${dietaryRestrictions.join(",")} confidence=${profile.confidence} flags=${JSON.stringify(profile.flags)}`,
        "generate",
      );
      return null;
    }
  }

  return {
    recipe: scaled,
    protein,
    originalTitle: hydrated.title,
    catalogId: hydrated.catalogId,
    recipeSource: (full?.source ?? hydrated.recipe._recipe_source) as RecipeSourceAttribution,
    slug,
  };
}

function defProtein(full: ReturnType<typeof getCuratedRecipeBySlug>, gr: GenerateResponse): string {
  return full?.protein || gr.chosen_protein || "chicken";
}

function pickFromSummaries(
  summaries: Array<{
    slug: string;
    protein: string;
    totalMinutes: number;
    scores: { quality: number };
    sourceKind: string;
    catalogBoost?: number;
  }>,
  request: GenerateRequest,
  options: {
    recentSignatures?: string[];
    recentSlugs?: string[];
    currentRecipeSignature?: string;
    varietySeed: string;
    excludeSlugs?: Set<string>;
    /** Allow score 0 when pool is very small (category-filtered picks). */
    minScore?: number;
  },
): LocalRecipePick | null {
  const selectedProtein = request.protein || "any";
  const strictProtein = selectedProtein !== "any";
  const ranked = summaries
    .filter((r) => !isExcludedFromDinnerFeeds(r))
    .filter((r) => !options.excludeSlugs?.has(r.slug))
    // If the user explicitly picked a protein, don't serve mismatched curated meals.
    .filter((r) => !strictProtein || proteinMatchesFilter(r.protein, selectedProtein))
    .filter((r) => !request.vegetarian_swap_needed || r.protein === "vegetarian")
    .map((row) => {
      let score = scoreCuratedRow(row, request);
      const full = getCuratedRecipeBySlug(row.slug);
      if (full) {
        const hard = recipePassesHardFilters(full, request);
        if (!hard.ok) return { row, score: -9999 };
        score += scoreHealthinessPreference(request.healthiness_preference || "balanced", full);
        score += scoreCrewFit(full, request.crew_size);
      }
      score -= recentSlugPenalty(row.slug, options.recentSlugs);
      if (typeof row.catalogBoost === "number") score += row.catalogBoost;
      return { row, score };
    })
    .filter((x) => x.score >= (options.minScore ?? 1))
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;

  const band = ranked.slice(0, 16);
  const weights = band.map((x) => Math.max(1, x.score));
  const startIdx = weightedPickIndex(weights, options.varietySeed);

  // Try to hydrate + pass variety constraints across the band.
  // Some curated rows may not have a generateResponse yet — skip those gracefully.
  const ordered = [...band.slice(startIdx), ...band.slice(0, startIdx)];
  for (const candidate of ordered) {
    const pick = hydratePick(candidate.row.slug, request);
    if (!pick) continue;
    const sig = computeSignature(pick.recipe);
    if (signatureBlocked(sig, options.recentSignatures, options.currentRecipeSignature)) continue;
    return pick;
  }

  // As a last resort, return any hydrated pick (even if it repeats) to avoid a blank state.
  for (const candidate of ordered) {
    const pick = hydratePick(candidate.row.slug, request);
    if (pick) return pick;
  }

  return null;
}

function pickForFirehallCategory(
  request: GenerateRequest,
  categoryId: FirehallCategoryId,
  options: {
    recentSignatures?: string[];
    recentSlugs?: string[];
    currentRecipeSignature?: string;
    varietySeed: string;
  },
): LocalRecipePick | null {
  const stages = buildFirehallPoolStages(categoryId);

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i]!;
    const snapshot = loadFirehallCategoryPool(stage.categoryIds, {
      requireHero: stage.requireHero,
    });
    snapshot.stage = stage.stage;

    const pool: FirehallCategorySummaryRow[] = snapshot.rows;
    const pick = pickFromSummaries(pool, request, {
      ...options,
      varietySeed: `${options.varietySeed}:fh:${stage.stage}:${i}`,
      minScore: stage.minScore,
    });

    logFirehallPoolAttempt(request, snapshot, Boolean(pick));
    if (pick) {
      const matchedId =
        stage.categoryIds.find((id) => validateCategoryPick(pick.slug, request, id)) ?? null;
      if (!matchedId) continue;
      log(
        `[generate:local] firehall(${categoryId}/${stage.stage}) hit slug=${pick.slug} title="${pick.originalTitle.slice(0, 48)}" matched=${matchedId}`,
        "generate",
      );
      return { ...pick, matchedCategory: matchedId };
    }
  }

  log(
    `[generate:local] firehall(${categoryId}) exhausted all stages — no pick`,
    "generate",
  );
  return null;
}

/** Layer A — published editorial curated (publisher / hall classics, not Golden 100). */
export function pickEditorialCuratedForGenerate(
  request: GenerateRequest,
  options: {
    recentSignatures?: string[];
    recentSlugs?: string[];
    currentRecipeSignature?: string;
    varietySeed: string;
  },
): LocalRecipePick | null {
  const goldenSlugs = new Set(
    listCuratedSummariesByTag(GOLDEN_SET_TAG, 120).map((r) => r.slug),
  );

  const rows = listCuratedRecipeSummaries({
    status: "published",
    minQuality: 40,
    limit: 80,
    orderBy: "publisherFirst",
  }).filter((r) => !goldenSlugs.has(r.slug) && r.heroImage?.trim());

  const pick = pickFromSummaries(rows, request, {
    ...options,
    excludeSlugs: goldenSlugs,
  });

  if (pick) {
    log(
      `[generate:local] editorial hit slug=${pick.slug} title="${pick.originalTitle.slice(0, 48)}"`,
      "generate",
    );
  }
  return pick;
}

/**
 * Real cook-time lookup for the combined-pool summary rows below, sourced
 * from the exact same pre-built catalog indexes Explore reads (which already
 * carry a computed `cookTime` — see shared/golden-100/recipe-page-schema.ts).
 * Building each of the ~300 full recipe pages just to read a time field would
 * be far too slow to do per-request, so this cheap index read is the correct
 * source. A slug missing here (not yet present in the on-disk index) simply
 * falls back to "unknown" (0), which the shared time-bucket helper treats as
 * "don't penalize" rather than "always fits."
 */
function loadCatalogCookTimeMinutes(): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of loadMergedHallCatalogIndex().recipes) map.set(r.slug, r.cookTime);
  for (const r of readBbqCatalogIndexFromDisk()?.recipes ?? []) map.set(r.slug, r.cookTime);
  return map;
}

/**
 * Golden 100 and Performance 50 are mixed catalogs — a handful of entries are
 * editorially breakfast items (pancakes, egg muffins, etc.) living in the same
 * manifest file as dinner recipes. Explore's own dinner index already strips
 * these via isBreakfastMeal() (see server/meal-catalog/load-index.ts); the
 * Generator's default (dinner) pool must apply the exact same rule so a
 * breakfast recipe can never surface as tonight's dinner pick.
 */
function isManifestBreakfastLike(entry: { mealFormat?: string; category?: string; tags?: string[] }): boolean {
  return isBreakfastMeal(entry);
}

/**
 * Every slug reachable via the default (non-firehall_category) Generator pool —
 * i.e. everything `pickGolden100ForGenerate` can possibly return before any
 * filter (protein/time/dietary/etc.) narrows it down. This is the single
 * source of truth for "what is Generator-eligible by default," used by both
 * the picker below and the Explore/Generator parity audit + tests so the two
 * can never drift apart.
 */
export function getDefaultGeneratorPoolSlugs(): {
  slugs: Set<string>;
  bySource: Record<CatalogCollectionId, string[]>;
} {
  // Manifest arrays are the canonical, always-complete source for every
  // collection (they're what Explore's own catalog is ultimately built from —
  // see server/meal-catalog/load-index.ts and server/approved-catalog.ts).
  // `curated_recipes`/`curated_recipe_tags` DB rows are a secondary,
  // independently-synced index used elsewhere for richer editorial metadata,
  // but the sync can lag behind the manifests. Golden 100 previously had
  // 10/104 recipes un-synced and Performance 50 had 22/71 un-synced — this
  // partial gap was silently narrowing the Generator's pool to "whatever
  // happens to be DB-tagged" whenever that set was non-empty, dropping every
  // untagged recipe. We always UNION the manifest with the DB tags now, so a
  // DB-sync gap can never shrink Generator eligibility below what Explore shows.
  const goldenSlugs = GOLDEN_100_RECIPES.filter((r) => !isManifestBreakfastLike(r)).map(
    (r) => r.slug,
  );
  const performanceSlugs = PERFORMANCE_ADAPTED_RECIPES.filter(
    (r) => !isManifestBreakfastLike(r.manifest),
  ).map((r) => r.manifest.slug);

  const hallExpansionSlugs = HALL_EXPANSION_ADAPTED_RECIPES.filter(
    (r) => isHallExpansionSlug(r.slug) && !isManifestBreakfastLike(r),
  ).map((r) => r.slug);

  const bbqSlugs = BBQ_CATALOG_RECIPES.filter((r) => isBbqCatalogSlug(r.manifest.slug)).map(
    (r) => r.manifest.slug,
  );

  const bySource: Record<CatalogCollectionId, string[]> = {
    golden_100: goldenSlugs,
    performance_50: performanceSlugs,
    hall_expansion_74: hallExpansionSlugs,
    bbq_catalog: bbqSlugs,
  } as Record<CatalogCollectionId, string[]>;

  return {
    slugs: new Set([...goldenSlugs, ...performanceSlugs, ...hallExpansionSlugs, ...bbqSlugs]),
    bySource,
  };
}

/** Hall catalog pick — Golden 100 + Performance 50 with request-aware ranking. */
export function pickGolden100ForGenerate(
  request: GenerateRequest,
  options: {
    recentSignatures?: string[];
    recentSlugs?: string[];
    currentRecipeSignature?: string;
    varietySeed: string;
  },
): LocalRecipePick | null {
  if (request.firehall_category) {
    return pickForFirehallCategory(request, request.firehall_category, options);
  }

  const rankBias = resolveCatalogRankBias(request);

  // DB-tagged rows carry a curated heroImage/quality score when available, but
  // the tag sync (curated_recipe_tags) can lag behind the manifests — see
  // getDefaultGeneratorPoolSlugs() for the full explanation. We therefore
  // ALWAYS union the manifest (guaranteed-complete) with the DB-tagged rows
  // (richer scoring when present), keyed by slug, instead of using the DB rows
  // exclusively whenever any exist. This guarantees the Generator's pool can
  // never be narrower than Explore's for these two collections.
  const goldenTaggedBySlug = new Map(
    listCuratedSummariesByTag(GOLDEN_SET_TAG, 200)
      .filter((r) => r.heroImage?.trim())
      .filter((r) => isGolden100Slug(r.slug))
      .map((r) => [r.slug, r]),
  );
  const performanceTaggedBySlug = new Map(
    listCuratedSummariesByTag(PERFORMANCE_SET_TAG, 200)
      .filter((r) => r.heroImage?.trim())
      .filter((r) => isPerformance50Slug(r.slug))
      .map((r) => [r.slug, r]),
  );

  const goldenRows = GOLDEN_100_RECIPES.filter((r) => !isManifestBreakfastLike(r)).map((r) => {
    const tagged = goldenTaggedBySlug.get(r.slug);
    return {
      slug: r.slug,
      protein: tagged?.protein || r.protein,
      quality: tagged?.quality ?? 80,
      sourceKind: r.classicSlug ? "hall_classic" : "golden_100",
    };
  });

  const performanceRows = PERFORMANCE_ADAPTED_RECIPES.filter(
    (r) => !isManifestBreakfastLike(r.manifest),
  ).map((r) => {
    const tagged = performanceTaggedBySlug.get(r.manifest.slug);
    return {
      slug: r.manifest.slug,
      protein: tagged?.protein || r.manifest.protein,
      quality: tagged?.quality ?? 82,
      sourceKind: "performance_meals_50",
    };
  });

  // Hall Expansion + BBQ catalog — same "normal dinner meal" collections shown in
  // Explore's approved catalog (see shared/hall-catalog/gate.ts isApprovedCatalogSlug
  // and server/approved-catalog.ts). These previously had NO path into the default
  // (non-firehall_category) generator pool, so every Explore-visible recipe from
  // these two collections was unreachable by the standalone Generator page —
  // the root cause of "Explore meals missing from Generator." Manifest arrays are
  // used directly (not a DB tag lookup) since these collections are always fully
  // populated there and don't rely on curated_recipe_tags being backfilled.
  const hallExpansionRows = HALL_EXPANSION_ADAPTED_RECIPES.filter(
    (r) => isHallExpansionSlug(r.slug) && !isManifestBreakfastLike(r),
  ).map((r) => ({
    slug: r.slug,
    protein: r.protein,
    quality: 78,
    sourceKind: "hall_expansion_74",
  }));

  const bbqRows = BBQ_CATALOG_RECIPES.filter((r) => isBbqCatalogSlug(r.manifest.slug)).map(
    (r) => ({
      slug: r.manifest.slug,
      protein: r.manifest.protein,
      quality: 78,
      sourceKind: "bbq_catalog",
    }),
  );

  const cookTimeBySlug = loadCatalogCookTimeMinutes();

  const toSummary = (
    r: { slug: string; protein: string; quality?: number; sourceKind: string },
    collection: CatalogCollectionId,
  ) => ({
    slug: r.slug,
    protein: r.protein,
    totalMinutes: cookTimeBySlug.get(r.slug) ?? 0,
    scores: { quality: r.quality ?? 80 },
    sourceKind: r.sourceKind,
    catalogBoost: catalogCollectionScoreBoost(collection, rankBias),
  });

  const combined = [
    ...goldenRows.map((r) => toSummary(r, "golden_100")),
    ...performanceRows.map((r) => toSummary(r, "performance_50")),
    ...hallExpansionRows.map((r) => toSummary(r, "hall_expansion_74")),
    ...bbqRows.map((r) => toSummary(r, "bbq_catalog")),
  ];

  if (combined.length === 0) return null;

  const pick = pickFromSummaries(combined, request, options);
  if (pick) {
    const collection = resolveCatalogCollection(pick.slug) || "golden_100";
    log(
      `[generate:local] hall_catalog(${collection}) hit slug=${pick.slug} title="${pick.originalTitle.slice(0, 48)}" bias=${rankBias}`,
      "generate",
    );
  }
  return pick;
}
