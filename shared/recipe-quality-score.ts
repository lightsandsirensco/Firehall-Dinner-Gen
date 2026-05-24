/**
 * Unified recipe quality scoring — ingest, curated DB, Explore ranking.
 */

import { scoreAppetiteAppeal } from "./explore-editorial.js";
import { isPublisherHeroImage } from "./editorial-quality.js";
import { publisherQualityBonus } from "./ingestion/trusted-publishers.js";
import type { IngestRecipeDraft } from "./ingestion/recipe-ingest-schema.js";

export interface RecipeQualityDimensions {
  appetite: number;
  imageQuality: number;
  comfort: number;
  hallSuitability: number;
  cleanupDifficulty: number;
  realism: number;
  visualQuality: number;
  sideDishQuality: number;
  proteinQuality: number;
  ingredientCompleteness: number;
  /** Composite 0–100 for publish threshold */
  composite: number;
}

export interface RecipeQualityInput {
  title: string;
  summary?: string;
  heroImage?: string;
  sourceUrl?: string;
  sourceKind?: string;
  protein?: string;
  cuisine?: string;
  totalMinutes?: number;
  servingsBase?: number;
  mealFormat?: string;
  mealArchetype?: string;
  tags?: string[];
  ingredients?: { name: string; original?: string }[];
  steps?: { body?: string; step?: string }[];
  spoonacularId?: number;
  trendScore?: number;
  cleanupDifficulty?: number;
}

function ingredientCount(input: RecipeQualityInput): number {
  return input.ingredients?.filter((i) => i.name?.trim()).length ?? 0;
}

function stepCount(input: RecipeQualityInput): number {
  return input.steps?.filter((s) => (s.body || s.step || "").trim().length > 8).length ?? 0;
}

export function scoreImageQuality(heroImage?: string, sourceKind?: string): number {
  if (!heroImage?.trim()) return 15;
  if (heroImage.includes("spoonacular.com")) return 42;
  if (isPublisherHeroImage(heroImage)) return 88;
  if (/placeholder|default|1x1|emoji/i.test(heroImage)) return 20;
  return 65;
}

export function scoreIngredientCompleteness(input: RecipeQualityInput): number {
  const n = ingredientCount(input);
  if (n >= 10) return 92;
  if (n >= 7) return 78;
  if (n >= 5) return 62;
  if (n >= 3) return 45;
  return 20;
}

export function scoreProteinQuality(input: RecipeQualityInput): number {
  const text = `${input.title} ${(input.ingredients || []).map((i) => i.name).join(" ")}`.toLowerCase();
  const protein = (input.protein || "").toLowerCase();

  if (/mystery meat|protein pieces|meat product/i.test(text)) return 25;
  if (protein === "mixed" && !/chicken|beef|pork|turkey|fish|sausage|bacon/.test(text)) return 40;

  let score = 55;
  if (/chicken thigh|chicken breast|ground beef|sirloin|pork shoulder|salmon|sausage|bacon/.test(text))
    score += 25;
  if (/boneless|skinless|trimmed/.test(text)) score += 8;
  if (protein && protein !== "mixed") score += 10;
  return Math.min(100, score);
}

export function scoreSideDishQuality(input: RecipeQualityInput): number {
  const tags = input.tags || [];
  const sideTags = tags.filter((t) => t.startsWith("side:"));
  const text = `${input.title} ${input.summary || ""} ${tags.join(" ")}`.toLowerCase();

  if (sideTags.length >= 2) return 85;
  if (/mashed|roasted potato|rice|coleslaw|salad|garlic bread|vegetable|broccoli|corn/.test(text))
    return 72;
  if (/one pot|single skillet|pizza only/i.test(text)) return 50;
  return 45;
}

export function scoreRealism(input: RecipeQualityInput): number {
  let score = 70;
  const text = `${input.title} ${input.summary || ""}`.toLowerCase();

  if (/molecular|foam|deconstructed|keto dessert|detox/i.test(text)) score -= 35;
  if (/slow cooker|sheet pan|skillet|grill|oven|simmer|sear/i.test(text)) score += 8;
  if (stepCount(input) >= 4 && ingredientCount(input) >= 6) score += 12;
  if (input.totalMinutes && input.totalMinutes > 0 && input.totalMinutes <= 90) score += 5;
  if (input.sourceKind === "publisher" || input.sourceKind === "partner") score += 10;

  return Math.min(100, Math.max(0, score));
}

export function scoreVisualQuality(input: RecipeQualityInput): number {
  const img = scoreImageQuality(input.heroImage, input.sourceKind);
  const title = input.title?.trim() || "";
  let score = img * 0.7;
  if (title.length >= 12 && !/easy|simple|recipe/i.test(title)) score += 10;
  if (/crispy|smoked|glazed|loaded|cheesy|charred/i.test(title.toLowerCase())) score += 8;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function scoreCleanupDifficulty(input: RecipeQualityInput): number {
  if (input.cleanupDifficulty) return input.cleanupDifficulty;
  const text = `${input.title} ${input.mealFormat || ""}`.toLowerCase();
  if (/one pot|sheet pan|slow cooker|casserole/i.test(text)) return 2;
  if (/grill|bbq|fried/i.test(text)) return 4;
  return 3;
}

export function scoreHallSuitabilityFromInput(input: RecipeQualityInput): number {
  let score = 60;
  if ((input.servingsBase || 0) >= 6) score += 10;
  if (input.totalMinutes && input.totalMinutes <= 45) score += 10;
  if (input.totalMinutes && input.totalMinutes > 90) score -= 12;
  const text = `${input.title} ${input.mealFormat || ""}`.toLowerCase();
  if (/one pot|sheet pan|chili|pasta|taco|burger|slow/i.test(text)) score += 8;
  return Math.min(100, Math.max(0, score));
}

export function scoreComfortFromInput(input: RecipeQualityInput): number {
  const t = input.title.toLowerCase();
  if (/mac and cheese|chili|meatloaf|pot pie|cheesy|loaded/.test(t)) return 88;
  if (/salad|grilled salmon|lean/i.test(t)) return 38;
  return 55;
}

export function scoreRecipeQuality(input: RecipeQualityInput): RecipeQualityDimensions {
  const appetiteCard = {
    id: input.spoonacularId || 0,
    title: input.title,
    image: input.heroImage || "",
    imageAlt: input.title,
    readyInMinutes: input.totalMinutes || 45,
    servings: input.servingsBase || 6,
    summary: input.summary || "",
    sourceUrl: input.sourceUrl || "",
    cuisines: input.cuisine ? [input.cuisine] : [],
    diets: [],
  };

  const appetite = scoreAppetiteAppeal(appetiteCard, 0);
  const imageQuality = scoreImageQuality(input.heroImage, input.sourceKind);
  const comfort = scoreComfortFromInput(input);
  const hallSuitability = scoreHallSuitabilityFromInput(input);
  const cleanupDifficulty = scoreCleanupDifficulty(input);
  const realism = scoreRealism(input);
  const visualQuality = scoreVisualQuality(input);
  const sideDishQuality = scoreSideDishQuality(input);
  const proteinQuality = scoreProteinQuality(input);
  const ingredientCompleteness = scoreIngredientCompleteness(input);

  let publisherBonus = 0;
  if (input.sourceUrl) publisherBonus = publisherQualityBonus(input.sourceUrl);

  const composite = Math.round(
    appetite * 0.18 +
      imageQuality * 0.14 +
      visualQuality * 0.08 +
      comfort * 0.1 +
      hallSuitability * 0.16 +
      realism * 0.1 +
      ingredientCompleteness * 0.1 +
      proteinQuality * 0.06 +
      sideDishQuality * 0.04 +
      (input.trendScore ?? 50) * 0.04 +
      publisherBonus,
  );

  return {
    appetite,
    imageQuality,
    comfort,
    hallSuitability,
    cleanupDifficulty,
    realism,
    visualQuality,
    sideDishQuality,
    proteinQuality,
    ingredientCompleteness,
    composite: Math.min(100, Math.max(0, composite)),
  };
}

export function qualityInputFromIngestDraft(draft: IngestRecipeDraft): RecipeQualityInput {
  return {
    title: draft.title,
    summary: draft.summary,
    heroImage: draft.heroImage,
    sourceUrl: draft.sourceUrl,
    sourceKind: draft.source,
    protein: draft.protein,
    cuisine: draft.cuisine,
    totalMinutes: draft.totalMinutes,
    servingsBase: draft.servingsBase,
    mealFormat: draft.mealFormat,
    mealArchetype: draft.mealArchetype,
    tags: draft.tags,
    ingredients: draft.ingredients,
    steps: draft.steps,
    spoonacularId: draft.spoonacularId,
    trendScore: draft.trendScore,
  };
}

export function applyQualityToIngestDraft(
  draft: IngestRecipeDraft,
  trendScore: number,
): IngestRecipeDraft {
  const q = scoreRecipeQuality({ ...qualityInputFromIngestDraft(draft), trendScore });
  return {
    ...draft,
    appetiteScore: q.appetite,
    comfortScore: q.comfort,
    healthyScore: draft.healthyScore ?? 50,
    firehallSuitabilityScore: q.hallSuitability,
    qualityScore: q.composite,
  };
}

/** Minimum composite to publish via expansion pipeline */
export function meetsPublishQualityThreshold(
  q: RecipeQualityDimensions,
  options: { minComposite?: number; requirePublisherImage?: boolean } = {},
): boolean {
  const min = options.minComposite ?? 52;
  if (q.composite < min) return false;
  if (q.ingredientCompleteness < 40) return false;
  if (q.realism < 35) return false;
  if (options.requirePublisherImage && q.imageQuality < 55) return false;
  return true;
}
