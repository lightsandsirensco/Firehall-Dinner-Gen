/**
 * Production-grade recipe scoring for Explore discovery.
 */

import { scoreRecipeForCategory } from "../../../shared/categories/scoring.js";
import type { MasterCategoryId } from "../../../shared/categories/constants.js";
import { MASTER_CATEGORIES_BY_ID } from "../../../shared/categories/definitions.js";
import { scoreAppetiteAppeal } from "../../../shared/explore-editorial.js";
import type { ExploreRecipeCard } from "../../../shared/explore-recipe.js";
import {
  EXPLORE_COMPOSITE_WEIGHTS,
  MIN_EXPLORE_COMPOSITE,
  PENALTY_LOW_QUALITY_TITLE,
  PENALTY_REPEAT_PROTEIN,
  PENALTY_SEEN_RECIPE,
  CONTEXT_CATEGORY_BOOST,
} from "../../../shared/recommendation/weights.js";
import type {
  RecommendationContext,
  RecommendationDimensionScores,
  ScoredExploreCard,
} from "../../../shared/recommendation/types.js";
import { computeTrendingBoost } from "../trending/score.js";
import { buildTasteProfile, personalizationBoost } from "../personalization/profile.js";

const LOW_QUALITY: RegExp[] = [
  /keto dessert|smoothie only|detox water/i,
  /molecular gastronomy|foam\b/i,
  /instant.*only|microwave only/i,
];

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function proteinKey(card: ExploreRecipeCard): string {
  const p = (card.primaryProtein || "").toLowerCase();
  if (p) return p;
  const t = card.title.toLowerCase();
  if (/chicken/.test(t)) return "chicken";
  if (/beef|steak/.test(t)) return "beef";
  if (/pork|bacon|sausage/.test(t)) return "pork";
  if (/fish|salmon|shrimp|seafood/.test(t)) return "seafood";
  if (/turkey/.test(t)) return "turkey";
  if (/pizza|pie/.test(t)) return "pizza";
  return "mixed";
}

function scoreCleanup(card: ExploreRecipeCard): number {
  const text = `${card.title} ${card.summary || ""}`.toLowerCase();
  if (/one pot|sheet pan|skillet|slow cooker|crockpot/i.test(text)) return 88;
  if (/grill|bbq|oven bake/i.test(text)) return 62;
  if (/deep fry|multiple pans/i.test(text)) return 35;
  return 55;
}

function scoreHealthy(card: ExploreRecipeCard): number {
  const text = `${card.title} ${card.summary || ""} ${(card.diets || []).join(" ")}`.toLowerCase();
  if (/salad only|broth only|detox/i.test(text)) return 20;
  if (/grilled|lean|vegetable|salmon|turkey/i.test(text)) return 78;
  if (/cheesy|bacon|fried|loaded/i.test(text)) return 38;
  return 52;
}

function scoreComfort(card: ExploreRecipeCard): number {
  const text = `${card.title} ${card.summary || ""}`.toLowerCase();
  let s = 50;
  if (/mac and cheese|chili|stew|mashed|comfort|hearty|parm/i.test(text)) s += 28;
  if (/grilled|lean|salad/i.test(text)) s -= 12;
  if (card.comfortLabel) s += 10;
  return clamp(s);
}

function scoreHallSuitability(card: ExploreRecipeCard): number {
  const servings = card.servings || 0;
  const mins = card.readyInMinutes || 0;
  let s = 55;
  if (servings >= 6) s += 15;
  if (servings >= 10) s += 8;
  if (mins > 0 && mins <= 45) s += 10;
  if (mins > 75) s -= 8;
  if (card.fromCuratedDb || card.publisherMedia) s += 12;
  return clamp(s);
}

function scoreRookieFriendly(card: ExploreRecipeCard): number {
  const text = `${card.title} ${card.summary || ""}`.toLowerCase();
  if (/one pot|sheet pan|5 ingredient|easy/i.test(text)) return 85;
  if (/sous vide|ferment|molecular/i.test(text)) return 25;
  const mins = card.readyInMinutes || 0;
  if (mins > 0 && mins <= 35) return 72;
  return 58;
}

function scoreCrewScaling(card: ExploreRecipeCard, ctx: RecommendationContext): number {
  const servings = card.servings || 6;
  let s = 50 + Math.min(30, servings * 3);
  if (ctx.crewSize != null && ctx.crewSize >= 10 && servings >= 8) s += 15;
  return clamp(s);
}

function scoreImageAndVisual(card: ExploreRecipeCard): { imageQuality: number; visualQuality: number } {
  let imageQuality = 45;
  let visualQuality = 50;
  if (!card.image?.trim()) {
    return { imageQuality: 5, visualQuality: 5 };
  }
  if (card.publisherMedia || !card.image.includes("spoonacular.com")) {
    imageQuality = 92;
    visualQuality = 88;
  } else if (card.image.includes("spoonacular.com")) {
    imageQuality = 48;
    visualQuality = 52;
  }
  return { imageQuality, visualQuality };
}

function scoreDimensions(
  card: ExploreRecipeCard,
  masterCategoryId: MasterCategoryId,
  ctx: RecommendationContext,
  sectionBoost: number,
): RecommendationDimensionScores {
  const text = `${card.title} ${card.summary || ""}`;
  const affinity = scoreRecipeForCategory(masterCategoryId, {
    title: card.title,
    summary: card.summary,
    protein: card.primaryProtein,
    cuisine: card.cuisines?.[0],
    totalMinutes: card.readyInMinutes,
    crewSize: ctx.crewSize,
  });

  const { imageQuality, visualQuality } = scoreImageAndVisual(card);
  const appetiteAppeal = clamp(scoreAppetiteAppeal(card, sectionBoost) * 2.2);
  const storedQuality = card.qualityScore ?? 0;

  return {
    appetiteAppeal,
    imageQuality,
    visualQuality,
    comfortScore: scoreComfort(card),
    healthyScore: scoreHealthy(card),
    cleanupScore: scoreCleanup(card),
    hallSuitability: scoreHallSuitability(card),
    popularity: clamp(storedQuality * 0.6 + (card.fromCuratedDb ? 15 : 0)),
    generationSuccess: card.fromCuratedDb ? 88 : 70,
    freshness: card.fromCuratedDb ? 82 : 65,
    realism: storedQuality > 0 ? clamp(storedQuality) : 68,
    rookieFriendly: scoreRookieFriendly(card),
    crewScaling: scoreCrewScaling(card, ctx),
    categoryAffinity: affinity.score,
    trendingBoost: computeTrendingBoost({
      recipeId: card.id,
      curatedRecipeId: card.curatedRecipeId,
    }),
    trustScore: clamp(
      (card.publisherMedia ? 18 : 0) +
        (card.fromCuratedDb ? 22 : 0) +
        (storedQuality * 0.5),
    ),
  };
}

function compositeFromDimensions(d: RecommendationDimensionScores): number {
  const w = EXPLORE_COMPOSITE_WEIGHTS;
  let total = 0;
  total += d.appetiteAppeal * w.appetiteAppeal;
  total += d.imageQuality * w.imageQuality;
  total += d.visualQuality * w.visualQuality;
  total += d.comfortScore * w.comfortScore;
  total += d.healthyScore * w.healthyScore;
  total += d.cleanupScore * w.cleanupScore;
  total += d.hallSuitability * w.hallSuitability;
  total += d.popularity * w.popularity;
  total += d.trendingBoost * w.trendingBoost;
  total += d.freshness * w.freshness;
  total += d.realism * w.realism;
  total += d.rookieFriendly * w.rookieFriendly;
  total += d.crewScaling * w.crewScaling;
  total += d.categoryAffinity * w.categoryAffinity;
  total += d.trustScore * w.trustScore;
  total += d.generationSuccess * w.generationSuccess;
  return Math.round(total);
}

export function scoreExploreCardForRecommendation(
  card: ExploreRecipeCard,
  masterCategoryId: MasterCategoryId,
  ctx: RecommendationContext,
  sectionBoost = 0,
  feedProteins?: Set<string>,
): ScoredExploreCard {
  const dimensions = scoreDimensions(card, masterCategoryId, ctx, sectionBoost);
  let composite = compositeFromDimensions(dimensions);
  const reasons: string[] = [];

  if (ctx.preferredCategories.includes(masterCategoryId)) {
    composite += CONTEXT_CATEGORY_BOOST;
    reasons.push("context_match");
  }

  if (ctx.seenRecipeIds.includes(card.id)) {
    composite -= PENALTY_SEEN_RECIPE;
    reasons.push("seen_recently");
  }

  const pk = proteinKey(card);
  if (ctx.recentProteins.includes(pk) || feedProteins?.has(pk)) {
    composite -= PENALTY_REPEAT_PROTEIN;
    reasons.push("protein_rotation");
  }

  const text = `${card.title} ${card.summary || ""}`;
  for (const re of LOW_QUALITY) {
    if (re.test(text)) {
      composite -= PENALTY_LOW_QUALITY_TITLE;
      reasons.push("low_quality_pattern");
      break;
    }
  }

  const profile = buildTasteProfile();
  composite += personalizationBoost(profile, masterCategoryId, pk);

  const cat = MASTER_CATEGORIES_BY_ID[masterCategoryId];
  if (dimensions.categoryAffinity >= 70) {
    reasons.push(cat?.emotional.firefighterHook || "category_fit");
  }

  return {
    card,
    compositeScore: Math.max(0, composite),
    dimensions,
    primaryCategoryId: masterCategoryId,
    reasons,
  };
}

export function isPublishableExploreScore(composite: number): boolean {
  return composite >= MIN_EXPLORE_COMPOSITE;
}
