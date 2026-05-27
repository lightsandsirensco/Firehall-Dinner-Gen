/**
 * Golden 100 related recipe suggestions — cuisine, protein, cook time, hall fit.
 */

import type { GoldenRecipeDefinition } from "./types.js";

export interface RelatedRecipeCandidate {
  slug: string;
  title: string;
  category: string;
  cuisine: string;
  protein: string;
  mealFormat: string;
  cookTimeEstimate: number;
  comfortScore: number;
  healthyScore: number;
  quickShift: boolean;
}

export interface RelatedRecipeScore {
  slug: string;
  score: number;
  reasons: string[];
}

function cookTimeEstimate(def: GoldenRecipeDefinition): number {
  const cat = def.masterCategoryId;
  if (cat === "quick_shift_meals" || cat === "rookie_friendly") return 25;
  if (cat === "bbq_grill_nights" || cat === "big_crew_feeders") return 75;
  if (cat === "meal_prep_leftovers") return 90;
  return 45;
}

export function toRelatedCandidate(def: GoldenRecipeDefinition): RelatedRecipeCandidate {
  return {
    slug: def.slug,
    title: def.title,
    category: def.masterCategoryId,
    cuisine: def.cuisine,
    protein: def.protein,
    mealFormat: def.mealFormat,
    cookTimeEstimate: cookTimeEstimate(def),
    comfortScore: def.recommendation.comfortFoodScore,
    healthyScore: def.recommendation.healthyScore,
    quickShift: def.recommendation.quickShiftMeal,
  };
}

export function scoreRelatedRecipes(
  source: GoldenRecipeDefinition,
  pool: GoldenRecipeDefinition[],
  limit = 6,
): RelatedRecipeScore[] {
  const src = toRelatedCandidate(source);
  const scored: RelatedRecipeScore[] = [];

  for (const candidate of pool) {
    if (candidate.slug === source.slug) continue;
    const c = toRelatedCandidate(candidate);
    let score = 0;
    const reasons: string[] = [];

    if (c.protein === src.protein) {
      score += 28;
      reasons.push("same protein");
    }
    if (c.cuisine === src.cuisine) {
      score += 22;
      reasons.push("same cuisine");
    }
    if (c.mealFormat === src.mealFormat) {
      score += 18;
      reasons.push("same format");
    }
    if (c.category === src.category) {
      score += 14;
      reasons.push("same hall category");
    }

    const timeDelta = Math.abs(c.cookTimeEstimate - src.cookTimeEstimate);
    if (timeDelta <= 15) {
      score += 12;
      reasons.push("similar cook time");
    } else if (timeDelta <= 30) {
      score += 6;
    }

    const comfortDelta = Math.abs(c.comfortScore - src.comfortScore);
    if (comfortDelta <= 2) {
      score += 8;
      reasons.push("similar comfort level");
    }

    const sharedPools = candidate.explorePools.filter((p) => source.explorePools.includes(p));
    score += Math.min(sharedPools.length * 5, 15);
    if (sharedPools.length) reasons.push(`shared pools: ${sharedPools.slice(0, 2).join(", ")}`);

    if (candidate.featured) score += 4;

    scored.push({ slug: c.slug, score, reasons });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .slice(0, limit);
}

export function pickRelatedSlugs(
  source: GoldenRecipeDefinition,
  pool: GoldenRecipeDefinition[],
  limit = 6,
): string[] {
  return scoreRelatedRecipes(source, pool, limit).map((r) => r.slug);
}
