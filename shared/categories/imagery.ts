/**
 * Category-aware food imagery — prompt fragments + shot affinity.
 */

import type { FoodImageryContext } from "../food-imagery/types.js";
import type { MasterCategoryId } from "./constants.js";
import { MASTER_CATEGORIES_BY_ID } from "./definitions.js";
import { rankCategoriesForRecipe } from "./scoring.js";
import type { CategoryImageryEnrichment } from "./types.js";
import { heroPathConflictsTitle } from "../meal-image-title-match.js";

export function getMasterCategoryDefinition(categoryId: MasterCategoryId) {
  return MASTER_CATEGORIES_BY_ID[categoryId];
}

/** Resolve dominant master category from recipe context */
export function resolvePrimaryCategoryFromContext(ctx: {
  title: string;
  mealFormat?: string;
  protein?: string;
  cuisine?: string;
  tags?: string[];
  summary?: string;
}): MasterCategoryId {
  const ranked = rankCategoriesForRecipe({
    title: ctx.title,
    mealFormat: ctx.mealFormat,
    protein: ctx.protein,
    cuisine: ctx.cuisine,
    tags: ctx.tags,
    summary: ctx.summary,
  });
  return ranked[0]?.categoryId || "firehall_classics";
}

export function buildCategoryImageryEnrichment(
  categoryIds: MasterCategoryId[],
): CategoryImageryEnrichment {
  const primary = categoryIds[0] || "firehall_classics";
  const def = MASTER_CATEGORIES_BY_ID[primary];
  if (!def) {
    return {
      masterCategoryIds: categoryIds,
      lighting: "warm appetizing kitchen light",
      mood: "crew-ready dinner",
      texture: "natural appetizing texture",
      negativeHints: [],
      shotPresetHints: [],
    };
  }

  const secondaryDefs = categoryIds.slice(1, 2).map((id) => MASTER_CATEGORIES_BY_ID[id]).filter(Boolean);
  const moodBlend = secondaryDefs.length
    ? `${def.imagery.promptMood}; subtle notes of ${secondaryDefs[0]!.imagery.promptMood}`
    : def.imagery.promptMood;

  return {
    masterCategoryIds: categoryIds,
    lighting: def.imagery.promptLighting,
    mood: moodBlend,
    texture: def.imagery.promptTexture,
    negativeHints: [...def.imagery.negativePromptHints],
    shotPresetHints: [...def.imagery.shotPresetAffinity],
  };
}

/** Extend food imagery context with category prompt lines */
export function enrichImageryContextFromCategories(
  ctx: FoodImageryContext,
  categoryIds?: MasterCategoryId[],
): FoodImageryContext & { categoryEnrichment: CategoryImageryEnrichment } {
  const ids =
    categoryIds && categoryIds.length > 0
      ? categoryIds
      : [resolvePrimaryCategoryFromContext(ctx)];
  const enrichment = buildCategoryImageryEnrichment(ids);
  return {
    ...ctx,
    tags: [...(ctx.tags || []), ...enrichment.masterCategoryIds.map((id) => `cat:${id}`)],
    categoryEnrichment: enrichment,
  };
}

export function imageMatchConfidence(
  title: string,
  mealFormat: string | undefined,
  heroPath: string | undefined,
  primaryCategoryId: MasterCategoryId,
): { score: number; pass: boolean } {
  if (!heroPath) return { score: 70, pass: true };
  const conflict = heroPathConflictsTitle(heroPath, title, mealFormat);
  if (conflict) return { score: 25, pass: false };
  const def = MASTER_CATEGORIES_BY_ID[primaryCategoryId];
  const blob = `${title} ${mealFormat || ""}`.toLowerCase();
  let score = 75;
  for (const kw of def?.scoring.titleKeywords || []) {
    if (blob.includes(kw.toLowerCase())) score += 3;
  }
  return { score: Math.min(100, score), pass: score >= 55 };
}

/** Lines appended to editorial imagery prompts */
export function categoryPromptFragments(categoryId: MasterCategoryId): {
  lighting: string;
  mood: string;
  texture: string;
  negative: string;
} {
  const def = MASTER_CATEGORIES_BY_ID[categoryId];
  if (!def) {
    return {
      lighting: "",
      mood: "",
      texture: "",
      negative: "",
    };
  }
  return {
    lighting: def.imagery.promptLighting,
    mood: def.imagery.promptMood,
    texture: def.imagery.promptTexture,
    negative: def.imagery.negativePromptHints.join(", "),
  };
}
