/**
 * Machine-readable editorial QA flag codes — stable for DB, APIs, and exports.
 */

export const EDITORIAL_QA_FLAG_CODES = [
  "duplicate_title",
  "near_duplicate_title",
  "duplicate_ingredient",
  "near_duplicate_ingredient",
  "similar_recipe_structure",
  "repeated_step_text",
  "weak_step",
  "thin_step",
  "step_filler",
  "missing_metadata",
  "metadata_incomplete",
  "unrealistic_total_time",
  "unrealistic_prep_cook_split",
  "missing_cook_temperature",
  "ingredient_missing_in_steps",
  "invalid_image_path",
  "image_governance",
  "missing_local_image",
  "short_description",
  "generic_ai_wording",
  "robotic_title",
  "thin_ingredient_list",
  "ingredients_empty",
  "thin_step_count",
  "steps_missing",
  "missing_tags",
  "variant_near_duplicate",
  "variant_missing_parent",
  "family_orphan_variant",
  "family_missing_archetype",
  "formatting_spacing_issue",
] as const;

export type EditorialQaFlagCode = (typeof EDITORIAL_QA_FLAG_CODES)[number];

export const EDITORIAL_QA_ENGINE_VERSION = 1 as const;
