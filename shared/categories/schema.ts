/**
 * Zod schemas — master category platform model.
 */

import { z } from "zod";
import {
  MASTER_CATEGORY_IDS,
  MASTER_CATEGORY_SCHEMA_VERSION,
  CATEGORY_THEME_TOKENS,
  SHIFT_CONTEXTS,
  CREW_DYNAMICS,
  LEGACY_EXPLORE_POOL_IDS,
} from "./constants.js";
import { MEAL_TYPES, PROTEINS, CUISINES } from "../recipe/constants.js";

const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const masterCategoryIdSchema = z.enum(MASTER_CATEGORY_IDS);

export const subcategorySchema = z.object({
  id: slugSchema,
  slug: slugSchema,
  displayName: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(160).optional(),
  /** Extra tag slugs for assignment matching */
  matchTags: z.array(z.string().trim().max(48)).max(16).default([]),
});

export const emotionalProfileSchema = z.object({
  headline: z.string().trim().min(4).max(120),
  shiftContexts: z.array(z.enum(SHIFT_CONTEXTS)).min(1).max(6),
  crewDynamics: z.array(z.enum(CREW_DYNAMICS)).min(1).max(5),
  cravingType: z.string().trim().max(80),
  trustPromise: z.string().trim().max(200),
  /** Short UX hook — generator / explore cards */
  firefighterHook: z.string().trim().max(160),
});

export const visualIdentitySchema = z.object({
  themeToken: z.enum(CATEGORY_THEME_TOKENS),
  palettePrimary: z.string().trim().max(24),
  paletteAccent: z.string().trim().max(24),
  lighting: z.string().trim().max(200),
  typographyMood: z.string().trim().max(120),
  textureNotes: z.array(z.string().trim().max(80)).max(8),
  steamLevel: z.enum(["none", "subtle", "prominent"]),
  platingDensity: z.enum(["light", "standard", "hearty"]),
});

export const imageryStyleSchema = z.object({
  shotPresetAffinity: z.array(z.string().trim().max(32)).max(6),
  promptLighting: z.string().trim().max(300),
  promptMood: z.string().trim().max(200),
  promptTexture: z.string().trim().max(300),
  negativePromptHints: z.array(z.string().trim().max(80)).max(8).default([]),
  styleVersion: z.string().trim().max(16).default("4.0"),
});

export const recommendationWeightsSchema = z.object({
  /** 0–1 affinity anchors for future personalization */
  shiftUrgency: z.number().min(0).max(1),
  crewScale: z.number().min(0).max(1),
  comfortSeeking: z.number().min(0).max(1),
  performanceFocus: z.number().min(0).max(1),
  socialSharing: z.number().min(0).max(1),
  /** Higher = easier / lower skill bar */
  skillFloor: z.number().min(0).max(1),
  appetiteBoost: z.number().int().min(-20).max(30).default(0),
});

export const categoryScoringRulesSchema = z.object({
  titleKeywords: z.array(z.string().trim().max(48)).max(24),
  mealTypeAffinity: z.array(z.enum(MEAL_TYPES)).max(12),
  cuisineAffinity: z.array(z.enum(CUISINES)).max(12),
  proteinAffinity: z.array(z.enum(PROTEINS)).max(8),
  maxMinutesBoost: z.number().int().min(0).max(180).optional(),
  minCrewSizeBoost: z.number().int().min(2).max(20).optional(),
});

export const masterCategoryDefinitionSchema = z.object({
  schemaVersion: z.literal(MASTER_CATEGORY_SCHEMA_VERSION),
  id: masterCategoryIdSchema,
  slug: slugSchema,
  displayName: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(4).max(160),
  editorialDescription: z.string().trim().min(20).max(600),
  emoji: z.string().trim().max(8).optional(),
  sortOrder: z.number().int().min(0).max(100),
  emotional: emotionalProfileSchema,
  visual: visualIdentitySchema,
  imagery: imageryStyleSchema,
  recommendation: recommendationWeightsSchema,
  scoring: categoryScoringRulesSchema,
  /** Controlled tag slugs from recipe platform */
  tagSlugs: z.array(z.string().trim().max(48)).max(24),
  /** Legacy explore pool bridge */
  legacyExplorePools: z.array(z.enum(LEGACY_EXPLORE_POOL_IDS)).max(8),
  subcategories: z.array(subcategorySchema).max(12),
  /** Explore / home featured priority */
  feedPriority: z.number().int().min(0).max(100).default(50),
});

export const categoryAssignmentSchema = z.object({
  recipeKey: z.string().trim().min(1).max(120),
  primaryCategoryId: masterCategoryIdSchema,
  secondaryCategoryIds: z.array(masterCategoryIdSchema).max(4).default([]),
  subcategoryIds: z.array(slugSchema).max(6).default([]),
  confidence: z.number().min(0).max(100),
  source: z.enum(["rules", "curated", "manual", "ml_stub"]),
});

export const recommendationIndexEntrySchema = z.object({
  recipeKey: z.string().trim().min(1).max(120),
  categoryScores: z.record(masterCategoryIdSchema, z.number().min(0).max(100)),
  primaryCategoryId: masterCategoryIdSchema,
  vector: z.array(z.number().min(0).max(1)).max(24),
  indexedAt: z.string().trim().max(40),
});

export type MasterCategoryDefinition = z.infer<typeof masterCategoryDefinitionSchema>;
export type MasterSubcategory = z.infer<typeof subcategorySchema>;
export type CategoryAssignment = z.infer<typeof categoryAssignmentSchema>;
export type RecommendationIndexEntry = z.infer<typeof recommendationIndexEntrySchema>;
