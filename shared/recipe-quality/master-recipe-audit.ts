/**
 * Firehall Meals — 9-phase master recipe audit (content + metadata heuristics).
 */

import type { GoldenRecipePage, GoldenRecipePageStep } from "../golden-100/recipe-page-schema.js";
import { auditGoldenRecipeContent } from "../golden-100/recipe-quality/audit.js";
import { auditRecipeDetailPage } from "../golden-100/recipe-quality/recipe-detail-audit.js";
import { findTemplateLanguageInText } from "../golden-100/recipe-quality/template-language.js";
import { isBannedStepTitle, isGenericStep } from "../golden-100/recipe-quality/placeholders.js";
import { detectGenericAiWording } from "../curated-recipe/qa-engine/wording.js";
import { findMasterAiPhrases } from "./master-ai-phrases.js";
import { BANNED_INSTRUCTION_PHRASES } from "../firehall-instruction-voice.js";
import {
  auditRecipeProteinRealism,
} from "../catalog-governance/protein-realism.js";
import {
  auditTitlePrimarySideAlignment,
  hasImageTitleMismatch,
} from "../curated-image-governance/title-primary-side-rules.js";
import { auditTitleSidePairing } from "../curated-image-governance/title-side-pairing-governance.js";
import type { ApprovedCatalogEntry } from "../approved-catalog.js";

export type MasterAuditGrade = "A" | "B" | "C" | "D";

export type MasterPhaseResult = {
  phase: number;
  name: string;
  pass: boolean;
  issues: string[];
};

export type MasterRecipeAuditRow = {
  slug: string;
  collection: string;
  title: string;
  grade: MasterAuditGrade;
  phases: MasterPhaseResult[];
  issueCount: number;
  blockingIssues: string[];
};

export type MasterRecipeAuditReport = {
  generatedAt: string;
  totals: {
    recipes: number;
    gradeA: number;
    gradeB: number;
    gradeC: number;
    gradeD: number;
    phaseFailures: Record<number, number>;
  };
  rows: MasterRecipeAuditRow[];
};

const VAGUE_BEGINNER_PATTERNS: Array<{ re: RegExp; message: string }> = [
  { re: /\bbloom spices?\b/i, message: 'vague: "bloom spices" without time and visual cue' },
  { re: /\bsear meat\b/i, message: 'vague: "sear meat" — name the protein and heat level' },
  { re: /\bcook onions?\.\s*$/i, message: "vague: cook onions — missing time and doneness cue" },
  { re: /\bcook chicken\b/i, message: 'vague: "cook chicken" — specify cut, heat, and temp' },
  { re: /\bcook until done\b/i, message: 'vague: "cook until done"' },
  { re: /\bseason to taste\b/i, message: 'vague: "season to taste" without guidance' },
];

const STEP_DETAIL_FAIL =
  /\b(cook|simmer|bake|roast|grill|sear|sauté|saute|brown|fry)\b/i;
const STEP_HAS_TIME = /\b\d+\s*[-–]?\s*\d*\s*(min|minute|hour|sec|°f|°c)\b/i;
const STEP_HAS_VISUAL =
  /\b(until|golden|brown|translucent|tender|flaky|bubbl|crisp|char|soft|thick|internal|165|145|160|74)\b/i;

function pageCopyBlob(page: GoldenRecipePage): string {
  const parts = [
    page.title,
    page.displayTitle,
    page.subtitle,
    page.shortDescription,
    page.description,
    page.whyCrewsLikeIt,
    ...(page.tonightSpread ?? []),
    ...(page.proTips ?? []),
    ...(page.leftovers ?? []),
    ...(page.steps ?? []).map((s) => `${s.title} ${s.instruction}`),
  ];
  return parts.filter(Boolean).join("\n");
}

function collectTextFields(page: GoldenRecipePage): Record<string, string> {
  return {
    title: page.title || "",
    description: page.description || "",
    whyCrewsLikeIt: page.whyCrewsLikeIt || "",
    steps: (page.steps ?? []).map((s) => `${s.title} ${s.instruction}`).join(" | "),
    ingredients: (page.ingredients ?? []).map((i) => i.name).join(" | "),
    heroAlt: page.heroImageAlt || "",
  };
}

function auditPhase1SpellingGrammar(page: GoldenRecipePage): string[] {
  const issues: string[] = [];
  const blob = pageCopyBlob(page);

  issues.push(...findMasterAiPhrases(blob));
  issues.push(...findTemplateLanguageInText(blob).map((h) => `template: ${h}`));
  issues.push(...detectGenericAiWording(blob).map((h) => `ai_wording: ${h}`));

  for (const re of BANNED_INSTRUCTION_PHRASES) {
    if (re.test(blob)) {
      issues.push(`banned_phrase: ${re.source.slice(0, 40)}`);
    }
  }

  if (/\bwhilst\b/i.test(blob)) issues.push("grammar: whilst → use while");
  if (/\butilize\b/i.test(blob)) issues.push("grammar: utilize → use use");

  return [...new Set(issues)];
}

function auditPhase2Title(page: GoldenRecipePage, slug: string): string[] {
  const issues: string[] = [];
  const title = page.displayTitle || page.title;

  for (const hit of auditTitleSidePairing({ slug, title, heroPath: page.heroImage, heroAlt: page.heroImageAlt })) {
    if (hit.severity === "critical") issues.push(`title_side: ${hit.message}`);
  }

  return issues;
}

function ingredientReferencedInSteps(name: string, stepText: string): boolean {
  const core = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!core) return true;
  if (stepText.includes(core)) return true;
  const words = core.split(/\s+/).filter((w) => w.length > 3);
  if (words.length >= 2 && words.every((w) => stepText.includes(w))) return true;
  const head = words[words.length - 1] || core.split(/\s+/).pop() || "";
  const stem = head.replace(/(ies|es|s)$/i, "");
  if (stem.length > 3 && stepText.includes(stem)) return true;
  if (/\bpotato/i.test(core) && /\bpotato|\bwedge|\bspud/i.test(stepText)) return true;
  if (/\blime/i.test(core) && /\blime|\bcitrus|\bgarnish/i.test(stepText)) return true;
  if (/\bchicken/i.test(core) && /\bchicken|\bthigh|\bbreast|\bbarbacoa|\bshred/i.test(stepText)) return true;
  return words.some((w) => stepText.includes(w));
}

function auditPhase3Ingredients(page: GoldenRecipePage): string[] {
  const issues: string[] = [];
  const ingredients = page.ingredients ?? [];
  const steps = page.steps ?? [];
  const stepText = steps.map((s) => `${s.title} ${s.instruction}`).join(" ").toLowerCase();

  let unusedMajor = 0;
  for (const ing of ingredients) {
    const name = (ing.name || "").trim();
    if (!name) continue;
    if (/^(salt|pepper|oil|water|butter|garlic|onion)$/i.test(name)) continue;
    if (/sauce|dressing|garnish|optional|serve|seasoning/i.test(ing.group || "")) continue;
    if (!ingredientReferencedInSteps(name, stepText)) {
      unusedMajor++;
      if (unusedMajor <= 2) issues.push(`unused_ingredient: ${name}`);
    }
  }

  if (unusedMajor >= 4) {
    issues.push(`unused_ingredient_count: ${unusedMajor}`);
  }

  return issues.slice(0, 4);
}

function auditPhase4Beginner(page: GoldenRecipePage): string[] {
  const issues: string[] = [];
  for (const step of page.steps ?? []) {
    const text = `${step.title} ${step.instruction}`;
    for (const { re, message } of VAGUE_BEGINNER_PATTERNS) {
      if (re.test(text)) {
        issues.push(`${message} (step: ${step.title || "untitled"})`);
        break;
      }
    }
    if (isBannedStepTitle(step.title || "") || isGenericStep({ title: step.title, instruction: step.instruction })) {
      issues.push(`beginner_vague_step: ${step.title}`);
    }
  }
  return issues;
}

function auditPhase5StepDetail(page: GoldenRecipePage): string[] {
  const issues: string[] = [];
  for (const step of page.steps ?? []) {
    const instr = step.instruction || "";
    if (instr.length < 25) {
      issues.push(`thin_step: ${step.title || "untitled"} (${instr.length} chars)`);
      continue;
    }
    if (STEP_DETAIL_FAIL.test(instr) && !STEP_HAS_TIME.test(instr) && !STEP_HAS_VISUAL.test(instr)) {
      issues.push(`missing_detail: ${step.title} — add time, heat, or doneness cue`);
    }
  }
  return issues.slice(0, 6);
}

function auditPhase6Realism(page: GoldenRecipePage, slug: string, collection: string): string[] {
  const fields = collectTextFields(page);
  const hits = auditRecipeProteinRealism({ slug, collection, title: page.title, fields });
  return hits.map((h) => `${h.term} in ${h.field}`);
}

function auditPhase7Image(page: GoldenRecipePage, slug: string): string[] {
  const issues: string[] = [];
  const title = page.displayTitle || page.title;
  const imageIssues = auditTitlePrimarySideAlignment({
    slug,
    title,
    heroPath: page.heroImage || "",
    heroAlt: page.heroImageAlt,
  });
  if (hasImageTitleMismatch(imageIssues)) {
    issues.push(...imageIssues.map((i) => i.message));
  }
  if (!page.heroImage?.trim()) issues.push("missing heroImage");
  return issues;
}

function auditPhase8Completeness(
  page: GoldenRecipePage,
  entry: Pick<ApprovedCatalogEntry, "slug" | "kind">,
): string[] {
  const issues: string[] = [];
  const isSmoothie = entry.kind === "smoothie";
  const isBreakfast = entry.kind === "breakfast_catalog";

  if (!page.description?.trim() && !page.subtitle?.trim()) issues.push("missing intro/description");
  if ((page.ingredients?.length ?? 0) < 4) issues.push("ingredient list too short");
  if ((page.steps?.length ?? 0) < 4) issues.push("instructions too short");
  if (!page.crewSize && !page.baseServings) issues.push("missing serving size");
  if (page.prepTime == null && page.cookTime == null) issues.push("missing prep/cook time");

  const hasSpread =
    (Array.isArray(page.tonightSpread) && page.tonightSpread.length > 0) ||
    (typeof page.whyCrewsLikeIt === "string" && page.whyCrewsLikeIt.length > 20);
  const hasTips =
    (Array.isArray(page.proTips) && page.proTips.length >= 1) ||
    (Array.isArray((page as Record<string, unknown>).stationWorkflow) &&
      ((page as Record<string, unknown>).stationWorkflow as string[]).length >= 1);
  const hasLeftovers =
    (Array.isArray(page.leftovers) && page.leftovers.length > 0) ||
    (typeof (page as Record<string, unknown>).leftoversStrategy === "string" &&
      String((page as Record<string, unknown>).leftoversStrategy).trim().length > 12);

  if (!hasSpread && !isSmoothie) issues.push("missing serving/spread copy");
  if (!hasTips && !isSmoothie) issues.push("missing pro tips");
  if (!hasLeftovers && !isSmoothie && !isBreakfast) issues.push("missing leftovers/storage");
  if (!page.equipment?.length && !isSmoothie && !isBreakfast) issues.push("missing equipment");

  return issues;
}

function gradeFromIssues(phases: MasterPhaseResult[]): MasterAuditGrade {
  const p6 = phases.find((p) => p.phase === 6)?.issues.length ?? 0;
  const p7 = phases.find((p) => p.phase === 7)?.issues.length ?? 0;
  const p2 = phases.find((p) => p.phase === 2)?.issues.length ?? 0;
  const blocking = phases.filter((p) => p.phase <= 8 && !p.pass).flatMap((p) => p.issues);
  const total = blocking.length;

  if (p6 > 0 || p7 > 0 || p2 > 0) return "D";
  if (total >= 10) return "C";
  if (total >= 3) return "B";
  return "A";
}

export function auditMasterRecipe(input: {
  page: GoldenRecipePage;
  slug: string;
  collection: string;
  kind: ApprovedCatalogEntry["kind"];
}): MasterRecipeAuditRow {
  const { page, slug, collection, kind } = input;
  const entry = { slug, kind };

  const phases: MasterPhaseResult[] = [
    { phase: 1, name: "Spelling & grammar", pass: false, issues: auditPhase1SpellingGrammar(page) },
    { phase: 2, name: "Title accuracy", pass: false, issues: auditPhase2Title(page, slug) },
    { phase: 3, name: "Ingredient alignment", pass: false, issues: auditPhase3Ingredients(page) },
    { phase: 4, name: "Beginner-proof steps", pass: false, issues: auditPhase4Beginner(page) },
    { phase: 5, name: "Step detail", pass: false, issues: auditPhase5StepDetail(page) },
    { phase: 6, name: "Firehall protein realism", pass: false, issues: auditPhase6Realism(page, slug, collection) },
    { phase: 7, name: "Image accuracy (metadata)", pass: false, issues: auditPhase7Image(page, slug) },
    { phase: 8, name: "Recipe completeness", pass: false, issues: auditPhase8Completeness(page, entry) },
  ];

  for (const p of phases) {
    p.pass = p.issues.length === 0;
  }

  const golden = auditGoldenRecipeContent(page);
  phases.push({
    phase: 9,
    name: "Quality score",
    pass: golden.pass,
    issues: golden.pass ? [] : golden.issues.map((i) => i.message),
  });

  const grade = gradeFromIssues(phases.filter((p) => p.phase <= 8));
  const blockingIssues = phases
    .filter((p) => p.phase <= 8 && !p.pass)
    .flatMap((p) => p.issues.map((i) => `[P${p.phase}] ${i}`));

  return {
    slug,
    collection,
    title: page.displayTitle || page.title,
    grade,
    phases,
    issueCount: blockingIssues.length,
    blockingIssues,
  };
}

export function buildMasterRecipeAuditReport(
  rows: MasterRecipeAuditRow[],
): MasterRecipeAuditReport {
  const phaseFailures: Record<number, number> = {};
  for (let i = 1; i <= 9; i++) phaseFailures[i] = 0;
  for (const row of rows) {
    for (const p of row.phases) {
      if (!p.pass) phaseFailures[p.phase] = (phaseFailures[p.phase] || 0) + 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      recipes: rows.length,
      gradeA: rows.filter((r) => r.grade === "A").length,
      gradeB: rows.filter((r) => r.grade === "B").length,
      gradeC: rows.filter((r) => r.grade === "C").length,
      gradeD: rows.filter((r) => r.grade === "D").length,
      phaseFailures,
    },
    rows,
  };
}
