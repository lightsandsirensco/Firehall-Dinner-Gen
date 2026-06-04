/**
 * Golden 100 quality gate — title, coherence, recommendation readiness.
 */

import { scoreRecipeTitle } from "../recipe-title-quality.js";
import { meetsPublishQualityThreshold, scoreRecipeQuality } from "../recipe-quality-score.js";
import type { GoldenRecipeAuditIssue, GoldenRecipeDefinition } from "./types.js";
import { GOLDEN_100_RECIPES } from "./recipes-data.js";
import { normalizeTitleKey } from "../ingestion/dedupe.js";

const ROBOTIC_TITLE = /\b(plated main|comfort bowl|meal prep dish|protein bowl|asian beef)\b/i;

export interface GoldenDraftValidationInput {
  title: string;
  summary?: string;
  heroImage?: string;
  protein?: string;
  cuisine?: string;
  mealFormat?: string;
  ingredients?: { name: string }[];
  steps?: { body?: string; step?: string }[];
}

function validateManifestTitleOnly(title: string): GoldenRecipeAuditIssue[] {
  const issues: GoldenRecipeAuditIssue[] = [];
  const t = title.trim();
  if (t.length < 6 || t.length > 72) {
    issues.push({ slug: "", code: "title_length", message: "title length out of range", severity: "error" });
  }
  if (ROBOTIC_TITLE.test(t) || /\b(plated main|protein bowl|comfort bowl|meal prep dish)\b/i.test(t)) {
    issues.push({ slug: "", code: "robotic_title", message: "robotic or generic phrasing", severity: "error" });
  }
  if (/^(classic|simple|easy|quick|healthy|hearty|traditional)\s+/i.test(t) && !/firehall|smash|hall/i.test(t)) {
    issues.push({ slug: "", code: "generic_opener", message: "weak generic opener", severity: "warn" });
  }
  return issues;
}

export function validateGoldenManifestEntry(def: GoldenRecipeDefinition): GoldenRecipeAuditIssue[] {
  const issues: GoldenRecipeAuditIssue[] = [];
  for (const issue of validateManifestTitleOnly(def.title)) {
    issues.push({ ...issue, slug: def.slug });
  }
  if (!def.spoonacularId && !def.spoonacularSearch && !def.classicSlug) {
    issues.push({
      slug: def.slug,
      code: "missing_source",
      message: "needs spoonacularId, search, or classicSlug",
      severity: "error",
    });
  }
  if (!def.imagery?.shotPreset) {
    issues.push({
      slug: def.slug,
      code: "missing_imagery",
      message: "imagery metadata required",
      severity: "warn",
    });
  }
  return issues;
}

/** Strict title check at publish time (ingredients + format coherence). */
export function validateGoldenPublishTitle(
  def: GoldenRecipeDefinition,
  ingredients: { name: string }[],
): GoldenRecipeAuditIssue[] {
  const titleCheck = scoreRecipeTitle(def.title, {
    mealFormat: def.mealFormat,
    protein: def.protein,
    cuisine: def.cuisine,
    ingredients: ingredients.map((i) => ({ item: i.name })),
  });
  if (titleCheck.pass) return [];
  return [
    {
      slug: def.slug,
      code: "title_quality",
      message: titleCheck.messages.join("; ") || "title_failed",
      severity: "error",
    },
  ];
}

export function validateGoldenDraft(input: GoldenDraftValidationInput): {
  pass: boolean;
  issues: GoldenRecipeAuditIssue[];
  qualityComposite: number;
} {
  const issues: GoldenRecipeAuditIssue[] = [];
  const titleCheck = scoreRecipeTitle(input.title, {
    mealFormat: input.mealFormat,
    protein: input.protein,
    cuisine: input.cuisine,
    ingredients: input.ingredients?.map((i) => ({ item: i.name })),
  });
  if (!titleCheck.pass) {
    issues.push({
      slug: "draft",
      code: "title_quality",
      message: titleCheck.messages.join("; "),
      severity: "error",
    });
  }

  const ingredientCount = input.ingredients?.filter((i) => i.name?.trim()).length ?? 0;
  const stepCount = input.steps?.filter((s) => (s.body || s.step || "").trim().length > 12).length ?? 0;
  if (ingredientCount < 5) {
    issues.push({ slug: "draft", code: "ingredients", message: "fewer than 5 ingredients", severity: "error" });
  }
  if (stepCount < 3) {
    issues.push({ slug: "draft", code: "instructions", message: "fewer than 3 steps", severity: "error" });
  }

  const quality = scoreRecipeQuality({
    title: input.title,
    summary: input.summary,
    heroImage: input.heroImage,
    protein: input.protein,
    cuisine: input.cuisine,
    mealFormat: input.mealFormat,
    ingredients: input.ingredients,
    steps: input.steps,
  });

  const minGoldenComposite = 58;
  if (quality.composite < minGoldenComposite) {
    issues.push({
      slug: "draft",
      code: "low_composite",
      message: `composite ${quality.composite} < ${minGoldenComposite}`,
      severity: "error",
    });
  }
  if (!meetsPublishQualityThreshold(quality)) {
    issues.push({
      slug: "draft",
      code: "publish_threshold",
      message: "below standard publish threshold",
      severity: "warn",
    });
  }

  return {
    pass: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    qualityComposite: quality.composite,
  };
}

export function validateGoldenManifest(): GoldenRecipeAuditIssue[] {
  const issues: GoldenRecipeAuditIssue[] = [];
  const titleKeys = new Map<string, string>();

  for (const def of GOLDEN_100_RECIPES) {
    issues.push(...validateGoldenManifestEntry(def));
    const key = normalizeTitleKey(def.title);
    if (titleKeys.has(key)) {
      issues.push({
        slug: def.slug,
        code: "duplicate_title",
        message: `duplicate of ${titleKeys.get(key)}`,
        severity: "error",
      });
    } else {
      titleKeys.set(key, def.slug);
    }
  }

  const expectedCount = 111;
  if (GOLDEN_100_RECIPES.length !== expectedCount) {
    issues.push({
      slug: "_manifest",
      code: "count_mismatch",
      message: `expected ${expectedCount} recipes, got ${GOLDEN_100_RECIPES.length}`,
      severity: "error",
    });
  }

  return issues;
}
