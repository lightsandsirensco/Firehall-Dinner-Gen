/**
 * Curated image governance — locked heroes, metadata alignment, manual-review flags.
 */

import type { MealVisualSignal } from "../meal-image-title-match.js";
import type { MealShotCategory } from "../food-imagery/shot-presets.js";
import type { PlatingType } from "../plating-type.js";

export type CuratedImageRole = "hero" | "thumb" | "mobile";

export type ImageGovernanceMismatchCode =
  | "missing_locked_hero"
  | "missing_locked_thumb"
  | "missing_locked_mobile"
  | "external_image_forbidden"
  | "duplicate_hero_reuse"
  | "protein_mismatch"
  | "cuisine_mismatch"
  | "format_mismatch"
  | "archetype_mismatch"
  | "path_title_conflict"
  | "plating_mismatch"
  | "unapproved_image"
  | "stock_photo_heuristic"
  | "over_zoom_heuristic"
  | "manual_review_required"
  | "image_title_mismatch"
  | "donor_image_forbidden"
  | "generic_substitute_meal";

export interface ImageGovernanceMismatch {
  code: ImageGovernanceMismatchCode;
  severity: "critical" | "warning" | "info";
  message: string;
  field?: CuratedImageRole | "bundle";
  confidence: number;
}

export interface CuratedMealImageProfile {
  slug: string;
  title: string;
  protein: string;
  cuisine: string;
  mealFormat: string;
  mealArchetype?: string;
  shotCategory: MealShotCategory;
  visualSignals: Set<MealVisualSignal>;
  platingType: PlatingType;
}

export interface LockedCuratedImages {
  hero: string;
  thumb: string;
  mobile: string;
  rail?: string;
  imageApproved: boolean;
  shotPreset?: string;
  locked: true;
}

export interface CuratedImageGovernanceInput {
  profile: CuratedMealImageProfile;
  heroImage: string;
  thumbImage?: string;
  mobileImage?: string;
  imageApproved?: boolean;
  heroAlt?: string;
  /** When true, missing local files are critical (publish gate). */
  publishGate?: boolean;
}

export interface CuratedImageGovernanceResult {
  pass: boolean;
  mismatchConfidence: number;
  mismatches: ImageGovernanceMismatch[];
  needsManualReview: boolean;
  inferredImageSignals: MealVisualSignal[];
}

/** Build fails when published curated meals exceed this score. */
export const IMAGE_GOVERNANCE_BUILD_FAIL_THRESHOLD = 72;
