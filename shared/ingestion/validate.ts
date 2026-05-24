import type { IngestRecipeDraft, IngestValidationResult } from "./recipe-ingest-schema.js";
import { isTrustedPublisherUrl } from "./trusted-publishers.js";

const MIN_QUALITY = 40;

export interface ValidateIngestOptions {
  requirePublisherSteps?: boolean;
  imageValid?: boolean;
}

export function validateIngestDraft(
  draft: IngestRecipeDraft,
  options: ValidateIngestOptions = {},
): IngestValidationResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!draft.title?.trim()) reasons.push("missing_title");
  if (!draft.heroImage?.trim()) reasons.push("missing_hero_image");
  if (options.imageValid === false) reasons.push("invalid_hero_image");

  const isPublisher = draft.source === "publisher" && isTrustedPublisherUrl(draft.sourceUrl);
  if (!draft.spoonacularId && !draft.curatedSlug && !isPublisher) {
    warnings.push("no_spoonacular_id_promotion_may_fail");
  }

  const minSteps = options.requirePublisherSteps || isPublisher ? 2 : 0;
  if ((draft.steps?.length || 0) < minSteps) {
    if (isPublisher) reasons.push("missing_instructions");
    else warnings.push("no_steps");
  }

  const minIngredients = isPublisher ? 4 : 3;
  if ((draft.ingredients?.length || 0) < minIngredients) {
    if (isPublisher) reasons.push("few_ingredients");
    else warnings.push("few_ingredients");
  }
  if (draft.totalMinutes > 120) warnings.push("very_long_cook_time");
  if (draft.firehallSuitabilityScore < 35) reasons.push("low_firehall_suitability");
  if (draft.qualityScore < MIN_QUALITY) reasons.push("low_quality_score");

  const title = draft.title.toLowerCase();
  if (/dessert|cocktail|smoothie only|keto dessert/.test(title)) reasons.push("not_dinner_meal");

  return {
    ok: reasons.length === 0,
    reasons,
    warnings,
  };
}
