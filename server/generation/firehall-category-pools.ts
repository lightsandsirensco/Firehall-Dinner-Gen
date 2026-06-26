/**
 * Firehall category pools for curated-only generation.
 * Game Day uses tiered safe broadening before dropping the category filter.
 */

import type { GenerateRequest } from "@shared/schema";
import {
  type FirehallCategoryId,
} from "../../shared/firehall-categories.js";
import { listCuratedRecipeSummariesForFirehallCategory } from "../curated-recipe-store.js";
import { isApprovedCatalogSlug } from "../../shared/hall-catalog/gate.js";
import { log } from "../logger.js";

/** When Game Day pool is thin, widen into these curated categories (never external AI). */
export const GAME_DAY_SAFE_FALLBACK_CATEGORIES: FirehallCategoryId[] = [
  "bbq_smoker",
  "comfort_food",
  "crew_favorites",
];

export type FirehallPoolStage =
  | "primary"
  | "game_day_safe"
  | "relaxed_hero";

export interface FirehallCategorySummaryRow {
  slug: string;
  protein: string;
  totalMinutes: number;
  scores: { quality: number };
  sourceKind: string;
  hasHero: boolean;
}

export interface FirehallPoolSnapshot {
  stage: FirehallPoolStage;
  categoryIds: FirehallCategoryId[];
  rawCount: number;
  heroCount: number;
  rows: FirehallCategorySummaryRow[];
}

function rowsForCategory(
  categoryId: FirehallCategoryId,
): { all: FirehallCategorySummaryRow[]; withHero: FirehallCategorySummaryRow[] } {
  const summaries = listCuratedRecipeSummariesForFirehallCategory(categoryId, {
    status: "published",
    minQuality: 35,
    limit: 100,
    orderBy: "publisherFirst",
  });

  const all = summaries
    .filter((r) => isApprovedCatalogSlug(r.slug))
    .map((r) => ({
    slug: r.slug,
    protein: r.protein,
    totalMinutes: r.totalMinutes || 0,
    scores: { quality: r.scores.quality },
    sourceKind: r.sourceKind,
    hasHero: Boolean(r.heroImage?.trim()),
  }));

  return {
    all,
    withHero: all.filter((r) => r.hasHero),
  };
}

function mergeBySlug(
  batches: FirehallCategorySummaryRow[][],
): FirehallCategorySummaryRow[] {
  const seen = new Set<string>();
  const out: FirehallCategorySummaryRow[] = [];
  for (const batch of batches) {
    for (const row of batch) {
      if (seen.has(row.slug)) continue;
      seen.add(row.slug);
      out.push(row);
    }
  }
  return out;
}

/** Load merged pool for one or more categories (deduped by slug). */
export function loadFirehallCategoryPool(
  categoryIds: FirehallCategoryId[],
  options: { requireHero: boolean },
): FirehallPoolSnapshot {
  const allBatches: FirehallCategorySummaryRow[][] = [];
  const heroBatches: FirehallCategorySummaryRow[][] = [];

  for (const id of categoryIds) {
    const { all, withHero } = rowsForCategory(id);
    allBatches.push(all);
    heroBatches.push(withHero);
  }

  const mergedAll = mergeBySlug(allBatches);
  const mergedHero = mergeBySlug(heroBatches);

  return {
    stage: "primary",
    categoryIds,
    rawCount: mergedAll.length,
    heroCount: mergedHero.length,
    rows: options.requireHero ? mergedHero : mergedAll,
  };
}

/** Staged pools for a Firehall category request (Game Day gets safe fallbacks). */
export function buildFirehallPoolStages(
  categoryId: FirehallCategoryId,
): Array<{
  stage: FirehallPoolStage;
  categoryIds: FirehallCategoryId[];
  requireHero: boolean;
  minScore: number;
}> {
  const stages: Array<{
    stage: FirehallPoolStage;
    categoryIds: FirehallCategoryId[];
    requireHero: boolean;
    minScore: number;
  }> = [
    { stage: "primary", categoryIds: [categoryId], requireHero: true, minScore: 1 },
  ];

  if (categoryId === "game_day") {
    stages.push({
      stage: "game_day_safe",
      categoryIds: GAME_DAY_SAFE_FALLBACK_CATEGORIES,
      requireHero: true,
      minScore: 1,
    });
    stages.push({
      stage: "relaxed_hero",
      categoryIds: [categoryId, ...GAME_DAY_SAFE_FALLBACK_CATEGORIES],
      requireHero: false,
      minScore: 0,
    });
  } else {
    stages.push({
      stage: "relaxed_hero",
      categoryIds: [categoryId],
      requireHero: false,
      minScore: 0,
    });
  }

  return stages;
}

export function logFirehallPoolAttempt(
  request: GenerateRequest,
  snapshot: FirehallPoolSnapshot,
  picked: boolean,
): void {
  const cat = request.firehall_category || "none";
  log(
    `[generate:firehall] category=${cat} stage=${snapshot.stage} pools=${snapshot.categoryIds.join("+")} raw=${snapshot.rawCount} hero=${snapshot.heroCount} pool=${snapshot.rows.length} picked=${picked}`,
    "generate",
  );
}
