import type { CuratedRecipeMetadata } from "../metadata/types.js";
import type { EditorialQaFlagCode } from "./flags.js";
import type { EDITORIAL_QA_ENGINE_VERSION } from "./flags.js";

export type EditorialQaSeverity = "info" | "warning" | "critical";

/** Single machine-readable finding */
export interface EditorialQaFlag {
  code: EditorialQaFlagCode;
  severity: EditorialQaSeverity;
  message: string;
  field?: string;
  /** Optional structured context for tooling */
  data?: Record<string, string | number | boolean | string[]>;
}

/** Manual editorial suppressions — never auto-modifies recipe content */
export interface EditorialQaOverrides {
  /** Flag codes ignored for scoring (still visible if includeSuppressed=true) */
  suppressFlags?: EditorialQaFlagCode[];
  /** Per-field notes from reviewers */
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface EditorialQaInput {
  recipeId: string;
  slug: string;
  status: string;
  title: string;
  summary?: string;
  heroImage: string;
  thumbImage?: string;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  servingsBase: number;
  cleanupDifficulty: number;
  protein: string;
  cuisine: string;
  mealFormat?: string;
  tags?: string[];
  ingredients: Array<{ name: string; originalText?: string }>;
  steps: Array<{ n: number; heading?: string; body: string }>;
  /** Extra user-facing copy (pro tips, leftovers, editorial notes) for QA scans */
  extraCopy?: string[];
  metadata?: CuratedRecipeMetadata | null;
  metadataCompleteness?: number;
  /** Optional reviewer overrides */
  qaOverrides?: EditorialQaOverrides;
  /** Family / variant editorial context */
  recipeRole?: string;
  archetypeId?: string;
  parentRecipeId?: string;
  variantKey?: string;
}

export interface EditorialQaCatalogPeer {
  recipeId: string;
  slug: string;
  title: string;
  titleKey: string;
  structureKey: string;
  archetypeId?: string;
  recipeRole?: string;
  parentRecipeId?: string;
}

export interface EditorialQaVariantPair {
  recipeIdA: string;
  recipeIdB: string;
  slugA: string;
  slugB: string;
  similarity: number;
}

export interface EditorialQaDimensionScores {
  content: number;
  instructions: number;
  media: number;
  metadata: number;
  authenticity: number;
}

export interface EditorialQaReport {
  engineVersion: typeof EDITORIAL_QA_ENGINE_VERSION;
  recipeId: string;
  slug: string;
  /** 0–100 overall editorial quality */
  overallScore: number;
  dimensionScores: EditorialQaDimensionScores;
  /** True when no blocking errors (after overrides applied) */
  publishReady: boolean;
  flags: EditorialQaFlag[];
  /** Active flags after applying suppressFlags */
  activeFlags: EditorialQaFlag[];
  suppressedFlags: EditorialQaFlag[];
  /** Count of active flags by severity */
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  /** Short codes explaining why publishReady=false */
  blockedReasons: string[];
  overrides?: EditorialQaOverrides;
}
