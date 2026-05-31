/**
 * Recipe detail audit — approved production standard (Phase 7).
 */

import type { GoldenRecipePage, GoldenRecipePageStep } from "../recipe-page-schema.js";
import type { ApprovedCatalogEntry } from "../../approved-catalog.js";
import { auditGoldenRecipeContent } from "./audit.js";
import { isBannedStepTitle, isGenericStep } from "./placeholders.js";

export interface RecipeDetailAuditRow {
  slug: string;
  title: string;
  kind: ApprovedCatalogEntry["kind"];
  pass: boolean;
  score: number;
  stepCount: number;
  wordCount: number;
  issues: string[];
}

export interface RecipeDetailAuditResult {
  generatedAt: string;
  totals: { recipes: number; pass: number; fail: number };
  rows: RecipeDetailAuditRow[];
}

function isSmoothieKind(kind: ApprovedCatalogEntry["kind"]): boolean {
  return kind === "smoothie";
}

function minStepsFor(page: GoldenRecipePage, kind: ApprovedCatalogEntry["kind"]): number {
  if (isSmoothieKind(kind)) return 6;
  const total = (page.cookTime ?? 0) + (page.prepTime ?? 0);
  if (total >= 90 || page.difficulty === "hard") return 10;
  if (total >= 60 || page.difficulty === "medium") return 8;
  return 8;
}

function minWordsFor(page: GoldenRecipePage, kind: ApprovedCatalogEntry["kind"]): number {
  if (isSmoothieKind(kind)) return 180;
  const total = (page.cookTime ?? 0) + (page.prepTime ?? 0);
  if (total > 45) return 400;
  if (total > 25) return 280;
  return 200;
}

function stepWordCount(steps: GoldenRecipePageStep[]): number {
  return steps.map((s) => s.instruction || "").join(" ").split(/\s+/).filter(Boolean).length;
}

function pageHasSections(page: Record<string, unknown>): {
  tonightSpread: boolean;
  proTips: boolean;
  leftovers: boolean;
  equipment: boolean;
} {
  const tonightSpread = Array.isArray(page.tonightSpread) && page.tonightSpread.length > 0;
  const proTips =
    (Array.isArray(page.proTips) && page.proTips.length >= 2) ||
    (Array.isArray(page.stationWorkflow) && page.stationWorkflow.length >= 2);
  const leftovers =
    (Array.isArray(page.leftovers) && page.leftovers.length > 0) ||
    (typeof page.leftoversStrategy === "string" && page.leftoversStrategy.trim().length > 12);
  const equipment = Array.isArray(page.equipment) && page.equipment.length > 0;
  return { tonightSpread, proTips, leftovers, equipment };
}

export function auditRecipeDetailPage(
  page: GoldenRecipePage,
  entry: Pick<ApprovedCatalogEntry, "slug" | "kind">,
): RecipeDetailAuditRow {
  const audit = auditGoldenRecipeContent(page);
  const stepCount = page.steps?.length ?? 0;
  const wordCount = stepWordCount(page.steps ?? []);
  const extra: string[] = [];
  const sections = pageHasSections(page as unknown as Record<string, unknown>);
  const minSteps = minStepsFor(page, entry.kind);

  if (stepCount < minSteps) {
    extra.push(`only ${stepCount} steps (min ${minSteps} for this meal)`);
  }

  const minWords = minWordsFor(page, entry.kind);
  if (wordCount < minWords) {
    extra.push(`thin instructions (${wordCount} words, min ${minWords})`);
  }

  if (!sections.tonightSpread) extra.push("missing tonightSpread");
  if (!sections.proTips) extra.push("missing proTips");
  if (!sections.leftovers) extra.push("missing leftovers");
  if (!sections.equipment && !isSmoothieKind(entry.kind)) extra.push("missing equipment");

  for (const step of page.steps ?? []) {
    const stepTitle = step.title?.trim() || "untitled";
    if (!step.instruction?.trim()) {
      extra.push(`vague step: ${stepTitle} (empty instruction)`);
      break;
    }
    if (isBannedStepTitle(stepTitle) || isGenericStep({ ...step, title: stepTitle, instruction: step.instruction })) {
      extra.push(`vague step: ${stepTitle}`);
      break;
    }
  }

  const pass = audit.pass && extra.length === 0;

  return {
    slug: entry.slug,
    title: page.displayTitle || page.title,
    kind: entry.kind,
    pass,
    score: audit.score,
    stepCount,
    wordCount,
    issues: [...audit.issues.map((i) => i.message), ...extra],
  };
}

export function auditRecipeDetailBatch(
  pages: Array<{ page: GoldenRecipePage; entry: Pick<ApprovedCatalogEntry, "slug" | "kind"> }>,
): RecipeDetailAuditResult {
  const rows = pages.map(({ page, entry }) => auditRecipeDetailPage(page, entry));
  const pass = rows.filter((r) => r.pass).length;
  return {
    generatedAt: new Date().toISOString(),
    totals: { recipes: rows.length, pass, fail: rows.length - pass },
    rows,
  };
}
