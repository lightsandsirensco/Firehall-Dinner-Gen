/**
 * Firehall Meals — recipe ingestion & trend discovery schema.
 * Staging layer sits between external sources and recipe_catalog (Explore reads catalog only).
 */

import type { MealArchetype } from "../canonical-recipe.js";
import type { GenerateResponse } from "../schema.js";

/** Where a trend or recipe signal originated */
export type IngestSourceKind =
  | "pinterest"
  | "tiktok"
  | "publisher"
  | "spoonacular"
  | "manual"
  | "hall_classic";

export type IngestStagingStatus =
  | "pending"
  | "validated"
  | "rejected"
  | "promoted";

export type IngestRunStatus = "running" | "completed" | "failed";

/** Raw trend signal before recipe resolution (Pinterest pin, TikTok hashtag, etc.) */
export interface TrendSignal {
  id: string;
  source: IngestSourceKind;
  /** Search keyword or dish phrase to resolve via Spoonacular / publisher */
  keyword: string;
  trendScore: number;
  discoveredAt: string;
  /** Optional pin / post metadata */
  pinUrl?: string;
  destinationUrl?: string;
  titleHint?: string;
  imageUrl?: string;
  tags?: string[];
  raw?: Record<string, unknown>;
}

/** Normalized draft — not yet in recipe_catalog */
export interface IngestRecipeDraft {
  fingerprint: string;
  source: IngestSourceKind;
  title: string;
  summary?: string;
  heroImage: string;
  imageAlt: string;
  ingredients: IngestIngredient[];
  steps: IngestStep[];
  cuisine: string;
  protein: string;
  mealFormat: string;
  mealArchetype: MealArchetype;
  prepMinutes: number;
  totalMinutes: number;
  /** 1 = easiest cleanup, 5 = heavy */
  cleanupDifficulty: 1 | 2 | 3 | 4 | 5;
  servingsBase: number;
  exploreCategories: string[];
  tags: string[];
  comfortScore: number;
  healthyScore: number;
  firehallSuitabilityScore: number;
  appetiteScore: number;
  qualityScore: number;
  trendScore: number;
  sourceName: string;
  sourceUrl: string;
  license: "aggregator" | "owned" | "partner";
  spoonacularId?: number;
  curatedSlug?: string;
  /** Populated on promotion */
  generateResponse?: GenerateResponse;
}

export interface IngestIngredient {
  name: string;
  amount: number;
  unit: string;
  original: string;
  category?: string;
}

export interface IngestStep {
  number: number;
  step: string;
}

export interface IngestValidationResult {
  ok: boolean;
  reasons: string[];
  warnings: string[];
}

export interface IngestRunStats {
  signalsIn: number;
  draftsStaged: number;
  validated: number;
  rejected: number;
  promoted: number;
  duplicatesSkipped: number;
}

export interface IngestRunRecord {
  id: string;
  source: string;
  status: IngestRunStatus;
  startedAt: string;
  finishedAt?: string;
  stats: IngestRunStats;
  error?: string;
}
