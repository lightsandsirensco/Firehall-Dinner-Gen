/**
 * Unified image integrity scoring — title, plating, cuisine, governance alignment.
 */

import {
  buildCuratedMealImageProfile,
  validateCuratedImageGovernance,
} from "./curated-image-governance/index.js";
import {
  inferPlatingType,
  inferPlatingTypeFromHeroPath,
  platingTypesConflict,
  type PlatingType,
} from "./plating-type.js";
import {
  auditTitlePrimarySideAlignment,
  hasImageTitleMismatch,
} from "./curated-image-governance/title-primary-side-rules.js";
import {
  heroPathConflictsTitle,
  scoreImageTitleAlignment,
  inferVisualSignalsFromImagePath,
} from "./meal-image-title-match.js";

export const IMAGE_INTEGRITY_PASS_THRESHOLD = 72;
export const IMAGE_INTEGRITY_REGEN_THRESHOLD = 58;

export type ImageIntegrityFlag =
  | "plating_mismatch"
  | "title_path_conflict"
  | "format_mismatch"
  | "protein_mismatch"
  | "unapproved_image"
  | "missing_hero"
  | "low_realism"
  | "semantic_drift"
  | "image_title_mismatch"
  | "needs_regeneration";

export interface ImageIntegrityResult {
  score: number;
  pass: boolean;
  needsRegeneration: boolean;
  needsManualReview: boolean;
  platingType: PlatingType;
  depictedPlating: PlatingType | null;
  flags: ImageIntegrityFlag[];
  conflicts: string[];
}

export function scoreImageIntegrity(input: {
  slug: string;
  title: string;
  protein?: string;
  cuisine?: string;
  mealFormat?: string;
  heroImage?: string;
  heroAlt?: string;
  imageApproved?: boolean;
  publishGate?: boolean;
}): ImageIntegrityResult {
  const flags: ImageIntegrityFlag[] = [];
  const conflicts: string[] = [];
  let score = 88;

  const platingType = inferPlatingType(input.title, input.mealFormat);
  const hero = (input.heroImage || "").trim();
  const depictedPlating = hero ? inferPlatingTypeFromHeroPath(hero, input.heroAlt || input.title) : null;

  if (!hero) {
    flags.push("missing_hero");
    score -= 35;
  }

  if (depictedPlating && platingTypesConflict(platingType, depictedPlating)) {
    flags.push("plating_mismatch");
    conflicts.push(`expected_${platingType}_got_${depictedPlating}`);
    score -= 42;
  }

  if (hero && heroPathConflictsTitle(hero, input.title, input.mealFormat)) {
    flags.push("title_path_conflict");
    conflicts.push("hero_path_conflicts_title");
    score -= 38;
  }

  const pathSignals = hero ? [...inferVisualSignalsFromImagePath(hero, input.heroAlt || "")] : [];
  const titleAlign = scoreImageTitleAlignment(input.title, input.mealFormat, {
    depictedSignals: pathSignals,
    heroSource: "generated",
  });
  if (!titleAlign.pass) {
    flags.push("semantic_drift");
    conflicts.push(...titleAlign.conflicts);
    score = Math.min(score, titleAlign.score);
  } else {
    score = Math.round((score + titleAlign.score) / 2);
  }

  const sideIssues = hero
    ? auditTitlePrimarySideAlignment({
        slug: input.slug,
        title: input.title,
        mealFormat: input.mealFormat,
        heroPath: hero,
        heroAlt: input.heroAlt || input.title,
      })
    : [];
  if (hasImageTitleMismatch(sideIssues)) {
    flags.push("image_title_mismatch");
    flags.push("needs_regeneration");
    conflicts.push("image_title_mismatch");
    score = Math.min(score, 42);
  }

  const gov = validateCuratedImageGovernance({
    profile: buildCuratedMealImageProfile({
      slug: input.slug,
      title: input.title,
      protein: input.protein,
      cuisine: input.cuisine,
      mealFormat: input.mealFormat,
    }),
    heroImage: hero,
    imageApproved: input.imageApproved,
    heroAlt: input.heroAlt || input.title,
    publishGate: input.publishGate ?? false,
  });

  if (!gov.pass) {
    for (const m of gov.mismatches) {
      if (m.code === "format_mismatch" || m.code === "protein_mismatch") {
        flags.push(m.code === "protein_mismatch" ? "protein_mismatch" : "format_mismatch");
      }
    }
    score = Math.min(score, 100 - gov.mismatchConfidence);
  }

  if (input.imageApproved === false) {
    flags.push("unapproved_image");
    score -= 12;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const pass = score >= IMAGE_INTEGRITY_PASS_THRESHOLD && !flags.includes("plating_mismatch");
  const needsRegeneration =
    !pass &&
    (score < IMAGE_INTEGRITY_REGEN_THRESHOLD || flags.includes("image_title_mismatch")) &&
    flags.length > 0;
  const needsManualReview = !pass || gov.needsManualReview;

  return {
    score,
    pass,
    needsRegeneration,
    needsManualReview,
    platingType,
    depictedPlating,
    flags: [...new Set(flags)],
    conflicts,
  };
}
