/**
 * Golden 100 — elite curated recipe foundation (Stage 3.5).
 */

import type { MasterCategoryId } from "../categories/constants.js";

export const GOLDEN_SET_TAG = "golden_100" as const;
export const GOLDEN_SET_VERSION = 1 as const;

export interface GoldenRecommendationMeta {
  feedsHardScore: number;
  cleanupScore: number;
  rookieFriendly: number;
  comfortFoodScore: number;
  healthyScore: number;
  gameDayMeal: boolean;
  quickShiftMeal: boolean;
  mealPrepFriendly: boolean;
}

export interface GoldenImageryMeta {
  shotPreset: string;
  /** Extra prompt fragment for food-imagery pipeline */
  promptFocus: string;
  /** Mobile card crop — center-weighted hero */
  mobileCrop: "center" | "top" | "left";
  lightingStyle: "warm_editorial" | "grill_char" | "morning_soft" | "game_day_bright";
}

export interface GoldenRecipeDefinition {
  slug: string;
  /** Editorial title — always used on publish */
  title: string;
  masterCategoryId: MasterCategoryId;
  protein: string;
  cuisine: string;
  mealFormat: string;
  /** Legacy explore pool keys for curated_recipe_categories */
  explorePools: string[];
  hookLine: string;
  /** Trusted publisher inspiration — structure only, not verbatim copy */
  sourceInspiration?: string;
  /** Hall classic slug — uses package steps + owned hero when present */
  classicSlug?: string;
  /** Fixed Spoonacular id when verified */
  spoonacularId?: number;
  /** Spoonacular search query when id unknown */
  spoonacularSearch?: string;
  recommendation: GoldenRecommendationMeta;
  imagery: GoldenImageryMeta;
  featured?: boolean;
}

export interface GoldenRecipeAuditIssue {
  slug: string;
  code: string;
  message: string;
  severity: "error" | "warn";
}

export interface GoldenManifestAudit {
  version: number;
  manifestCount: number;
  publishedGoldenCount: number;
  matchedInDb: number;
  missingInDb: string[];
  extraGoldenInDb: string[];
  weakTitles: GoldenRecipeAuditIssue[];
  missingImagery: string[];
  duplicateTitleKeys: string[];
  categoryDistribution: Record<MasterCategoryId, { target: number; manifest: number; db: number }>;
  qualityFailures: GoldenRecipeAuditIssue[];
  proteinBalance: Record<string, number>;
  passesGoldenGate: number;
}
