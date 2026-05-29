import type { EditorialQaDimensionScores, EditorialQaFlag } from "./types.js";

const CRITICAL_PENALTY = 12;
const WARNING_PENALTY = 5;
const INFO_PENALTY = 1;

const CONTENT_CODES = new Set([
  "duplicate_title",
  "near_duplicate_title",
  "duplicate_ingredient",
  "near_duplicate_ingredient",
  "similar_recipe_structure",
  "thin_ingredient_list",
  "short_description",
  "missing_tags",
  "generic_ai_wording",
  "robotic_title",
]);

const INSTRUCTION_CODES = new Set([
  "repeated_step_text",
  "weak_step",
  "thin_step",
  "step_filler",
  "thin_step_count",
  "missing_cook_temperature",
  "ingredient_missing_in_steps",
  "unrealistic_total_time",
  "unrealistic_prep_cook_split",
  "formatting_spacing_issue",
]);

const MEDIA_CODES = new Set(["invalid_image_path", "missing_local_image"]);
const METADATA_CODES = new Set(["missing_metadata", "metadata_incomplete"]);
const AUTH_CODES = new Set(["generic_ai_wording", "robotic_title", "step_filler"]);
const FAMILY_CODES = new Set([
  "variant_near_duplicate",
  "variant_missing_parent",
  "family_orphan_variant",
  "family_missing_archetype",
]);

function penalize(flags: EditorialQaFlag[]): number {
  let score = 100;
  for (const f of flags) {
    if (f.severity === "critical") score -= CRITICAL_PENALTY;
    else if (f.severity === "warning") score -= WARNING_PENALTY;
    else score -= INFO_PENALTY;
  }
  return Math.max(0, Math.min(100, score));
}

function filterByCodes(flags: EditorialQaFlag[], codes: Set<string>): EditorialQaFlag[] {
  return flags.filter((f) => codes.has(f.code));
}

export function scoreEditorialQa(activeFlags: EditorialQaFlag[]): {
  overallScore: number;
  dimensionScores: EditorialQaDimensionScores;
  publishReady: boolean;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  blockedReasons: string[];
} {
  const criticals = activeFlags.filter((f) => f.severity === "critical");
  const warnings = activeFlags.filter((f) => f.severity === "warning");
  const infos = activeFlags.filter((f) => f.severity === "info");

  const content = penalize(filterByCodes(activeFlags, CONTENT_CODES));
  const instructions = penalize(filterByCodes(activeFlags, INSTRUCTION_CODES));
  const media = penalize(filterByCodes(activeFlags, MEDIA_CODES));
  const metadata = penalize(filterByCodes(activeFlags, METADATA_CODES));
  const authenticity = penalize(filterByCodes(activeFlags, AUTH_CODES));

  const overallScore = Math.round(
    content * 0.22 + instructions * 0.28 + media * 0.15 + metadata * 0.2 + authenticity * 0.15,
  );

  /** Only these critical flags block publish / needs_review */
  const BLOCKING_CODES = new Set<string>([
    "invalid_image_path",
    "missing_local_image",
    "ingredients_empty",
    "steps_missing",
    "duplicate_title",
    "robotic_title",
    "variant_near_duplicate",
    "missing_metadata",
  ]);
  const blockedBy = criticals.filter((f) => BLOCKING_CODES.has(f.code));
  const blockedReasons = [...new Set(blockedBy.map((b) => b.code))];

  return {
    overallScore,
    dimensionScores: { content, instructions, media, metadata, authenticity },
    publishReady: blockedBy.length === 0,
    criticalCount: criticals.length,
    warningCount: warnings.length,
    infoCount: infos.length,
    blockedReasons,
  };
}
