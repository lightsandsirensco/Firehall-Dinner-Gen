/**
 * Golden 100 recipe page validation — reject weak or incoherent pages.
 */

import { goldenRecipePageSchema, type GoldenRecipePage } from "../../shared/golden-100/recipe-page-schema.js";
import { auditGoldenRecipeContent } from "../../shared/golden-100/recipe-quality/audit.js";
import {
  countPlaceholderIngredients,
  isGenericStep,
} from "../../shared/golden-100/recipe-quality/placeholders.js";
import type { GoldenRecipeAuditIssue } from "../../shared/golden-100/types.js";

const FAKE_TITLE = /\b(plated main|protein bowl|mystery|fusion surprise|deconstructed)\b/i;

export interface PageValidationResult {
  pass: boolean;
  page?: GoldenRecipePage;
  issues: GoldenRecipeAuditIssue[];
  realismScore: number;
  firefighterScore: number;
}

function scoreInstructions(steps: GoldenRecipePage["steps"]): number {
  let score = 50;
  for (const step of steps) {
    if (step.instruction.length >= 80) score += 8;
    if (step.minutes != null && step.minutes > 0) score += 4;
    if (step.heatLevel) score += 3;
    if (isGenericStep(step)) score -= 15;
  }
  return Math.min(100, Math.max(0, score));
}

function scoreCoherence(page: GoldenRecipePage): number {
  let score = 60;
  const titleLower = page.title.toLowerCase();
  const protein = page.tags.find((t) => t.startsWith("protein:"))?.replace("protein:", "") ?? "";

  if (protein && titleLower.includes(protein)) score += 10;
  if (page.ingredients.length >= 6) score += 10;
  if (page.proTips.length >= 3) score += 8;
  if (page.tonightSpread.length >= 2) score += 7;
  if (page.steps.length >= 4) score += 10;

  return Math.min(100, score);
}

export function validateGoldenRecipePage(raw: unknown): PageValidationResult {
  const issues: GoldenRecipeAuditIssue[] = [];
  const parsed = goldenRecipePageSchema.safeParse(raw);

  if (!parsed.success) {
    const slug =
      typeof raw === "object" && raw && "slug" in raw ? String((raw as { slug: string }).slug) : "";
    for (const err of parsed.error.issues.slice(0, 5)) {
      issues.push({
        slug,
        code: "schema",
        message: `${err.path.join(".")}: ${err.message}`,
        severity: "error",
      });
    }
    return { pass: false, issues, realismScore: 0, firefighterScore: 0 };
  }

  const page = parsed.data;

  if (FAKE_TITLE.test(page.title)) {
    issues.push({
      slug: page.slug,
      code: "fake_title",
      message: "title sounds generic or fake",
      severity: "error",
    });
  }

  const contentAudit = auditGoldenRecipeContent(page);
  issues.push(...contentAudit.issues);

  const placeholderCount = countPlaceholderIngredients(page.ingredients);
  if (placeholderCount > 0) {
    issues.push({
      slug: page.slug,
      code: "placeholder_ingredient",
      message: `${placeholderCount} placeholder ingredient(s)`,
      severity: "error",
    });
  }

  const realismScore = Math.round(
    (scoreInstructions(page.steps) + scoreCoherence(page) + contentAudit.score) / 3,
  );
  const firefighterScore = page.firefighterScore;

  const errors = issues.filter((i) => i.severity === "error");
  return {
    pass: errors.length === 0 && contentAudit.pass,
    page,
    issues,
    realismScore,
    firefighterScore,
  };
}
