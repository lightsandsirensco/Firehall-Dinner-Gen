/**
 * Category-aware meal scoring — recommendation-ready affinity.
 */

import type { GenerateResponse } from "../schema.js";
import type { FirehallRecipe } from "../recipe/schema.js";
import { coerceCuisine, coerceMealType, coerceProtein } from "../recipe/tags.js";
import { MASTER_CATEGORY_DEFINITIONS, MASTER_CATEGORIES_BY_ID } from "./definitions.js";
import type { CategoryAffinityScore, MasterCategoryId } from "./types.js";
import { MASTER_CATEGORY_IDS } from "./constants.js";

export interface CategoryScoreInput {
  title?: string;
  summary?: string;
  mealFormat?: string;
  protein?: string;
  cuisine?: string;
  totalMinutes?: number;
  crewSize?: number;
  tags?: string[];
  /** Legacy generate payload */
  recipe?: GenerateResponse | FirehallRecipe;
}

function textBlob(input: CategoryScoreInput): string {
  const parts = [
    input.title || "",
    input.summary || "",
    (input.tags || []).join(" "),
  ];
  if (input.recipe && "identity" in input.recipe) {
    const r = input.recipe as FirehallRecipe;
    parts.push(r.identity.title, r.identity.shortDescription || "");
    parts.push(...(r.classification?.tags || []));
  } else if (input.recipe && "title" in input.recipe) {
    const g = input.recipe as GenerateResponse;
    parts.push(g.title, g.why_it_fits_tonight || "");
    parts.push(g.tags?.cuisine || "", ...(g.tags?.key_ingredients || []));
  }
  return parts.join(" ").toLowerCase();
}

/** Score one recipe against one master category (0–100). */
export function scoreRecipeForCategory(
  categoryId: MasterCategoryId,
  input: CategoryScoreInput,
): CategoryAffinityScore {
  const def = MASTER_CATEGORIES_BY_ID[categoryId];
  const reasons: string[] = [];
  if (!def) return { categoryId, score: 0, reasons: ["unknown_category"] };

  let score = 28;
  const blob = textBlob(input);
  const mealType = coerceMealType(input.mealFormat);
  const protein = coerceProtein(input.protein);
  const cuisine = coerceCuisine(input.cuisine);

  for (const kw of def.scoring.titleKeywords) {
    if (blob.includes(kw.toLowerCase())) {
      score += 6;
      reasons.push(`kw:${kw}`);
    }
  }
  if (def.scoring.mealTypeAffinity.includes(mealType)) {
    score += 14;
    reasons.push(`meal:${mealType}`);
  }
  if (def.scoring.cuisineAffinity.includes(cuisine)) {
    score += 10;
    reasons.push(`cuisine:${cuisine}`);
  }
  if (def.scoring.proteinAffinity.includes(protein)) {
    score += 8;
    reasons.push(`protein:${protein}`);
  }

  const mins = input.totalMinutes ?? 0;
  if (def.scoring.maxMinutesBoost && mins > 0 && mins <= def.scoring.maxMinutesBoost) {
    score += 12;
    reasons.push(`time:<=${def.scoring.maxMinutesBoost}`);
  }
  const crew = input.crewSize ?? 6;
  if (def.scoring.minCrewSizeBoost && crew >= def.scoring.minCrewSizeBoost) {
    score += 10;
    reasons.push(`crew:>=${def.scoring.minCrewSizeBoost}`);
  }

  for (const tag of input.tags || []) {
    if (def.tagSlugs.includes(tag) || def.subcategories.some((s) => s.matchTags.includes(tag))) {
      score += 5;
      reasons.push(`tag:${tag}`);
    }
  }

  score = Math.min(100, Math.max(0, score + def.recommendation.appetiteBoost * 0.5));
  return { categoryId, score, reasons };
}

/** Rank all master categories for a recipe. */
export function rankCategoriesForRecipe(input: CategoryScoreInput): CategoryAffinityScore[] {
  return MASTER_CATEGORY_IDS.map((id) => scoreRecipeForCategory(id, input))
    .sort((a, b) => b.score - a.score);
}

/** Primary + secondary assignment from scores */
export function pickPrimaryAndSecondary(
  scores: CategoryAffinityScore[],
  minPrimary = 52,
): { primary: MasterCategoryId; secondary: MasterCategoryId[] } {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const primary = sorted[0]?.score >= minPrimary ? sorted[0].categoryId : "firehall_classics";
  const secondary = sorted
    .slice(1, 5)
    .filter((s) => s.score >= 45 && s.categoryId !== primary)
    .map((s) => s.categoryId);
  return { primary, secondary };
}

/** Category-aware boost layered on existing trust quality composite */
export function categoryAwareMealScore(
  baseComposite: number,
  input: CategoryScoreInput,
  primaryCategoryId?: MasterCategoryId,
): number {
  const primary = primaryCategoryId || pickPrimaryAndSecondary(rankCategoriesForRecipe(input)).primary;
  const affinity = scoreRecipeForCategory(primary, input).score;
  return Math.round(Math.min(100, baseComposite * 0.85 + affinity * 0.15));
}

export function titleQualityScoreForCategory(
  title: string,
  categoryId: MasterCategoryId,
): number {
  const def = MASTER_CATEGORIES_BY_ID[categoryId];
  if (!def) return 50;
  const t = title.toLowerCase();
  let score = 60;
  for (const kw of def.scoring.titleKeywords) {
    if (t.includes(kw.toLowerCase())) score += 5;
  }
  if (/\b(plated main|protein bowl|comfort bowl|station classic)\b/i.test(t)) score -= 40;
  return Math.max(0, Math.min(100, score));
}
