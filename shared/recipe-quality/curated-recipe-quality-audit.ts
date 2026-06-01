/**
 * Firehall Meals — curated recipe quality audit (beginner-proof, accuracy, authenticity).
 */

import type { GoldenRecipePage, GoldenRecipePageStep, GoldenRecipePageIngredient } from "../golden-100/recipe-page-schema.js";
import type { ApprovedCatalogEntry } from "../approved-catalog.js";
import { auditGoldenRecipeContent } from "../golden-100/recipe-quality/audit.js";
import { auditRecipeDetailPage } from "../golden-100/recipe-quality/recipe-detail-audit.js";
import { findMasterAiPhrases } from "./master-ai-phrases.js";
import { findTemplateLanguageInText } from "../golden-100/recipe-quality/template-language.js";
import { detectGenericAiWording } from "../curated-recipe/qa-engine/wording.js";
import { isBannedStepTitle, isGenericStep, hasTemperatureCue, hasTimingCue } from "../golden-100/recipe-quality/placeholders.js";
import { auditProteinOzPerFirefighter } from "../recipe/crew-portion-limits.js";
import { BANNED_INSTRUCTION_PHRASES } from "../firehall-instruction-voice.js";
import { titleMatchesDishIdentity } from "../meal-format-contract.js";

export type QualityIssueCategory =
  | "spelling_grammar"
  | "ingredient_unused"
  | "ingredient_missing"
  | "quantity_unrealistic"
  | "temperature_missing"
  | "internal_temp_missing"
  | "cook_time_unrealistic"
  | "vague_step"
  | "completeness"
  | "authenticity";

export type QualityIssue = {
  category: QualityIssueCategory;
  message: string;
};

export type CuratedRecipeQualityRow = {
  slug: string;
  title: string;
  kind: ApprovedCatalogEntry["kind"];
  pass: boolean;
  score: number;
  issues: QualityIssue[];
  issueCount: number;
};

export type CuratedRecipeQualityReport = {
  generatedAt: string;
  totals: {
    recipes: number;
    pass: number;
    fail: number;
    byCategory: Record<QualityIssueCategory, number>;
  };
  rows: CuratedRecipeQualityRow[];
};

const PANTRY_SKIP = /^(salt|pepper|black pepper|water|oil|olive oil|vegetable oil|butter|garlic|onion)$/i;
const PROTEIN_WORD = /\b(chicken|beef|pork|turkey|salmon|shrimp|cod|fish|sausage|steak|ground|thigh|breast|lamb|ham|bacon|tofu|chickpea)\b/i;
const HOT_COOK = /\b(bake|roast|grill|griddle|sear|fry|simmer|boil|smoke|broil|sauté|saute|oven|skillet)\b/i;
const INTERNAL_TEMP = /\b(165|145|160|125|135|155|175|180|190|200|210|225|250|275|300|325|350|375|400|425|450)\s*°\s*f|\d+\s*degrees?\s*f\b/i;
const SAFE_INTERNAL = /\b(165|145|160)\s*°\s*f|internal temp/i;

const PROTEIN_SAFE_TEMP: Record<string, string> = {
  chicken: "165°F",
  turkey: "165°F",
  beef: "145°F for steaks, 160°F for ground",
  pork: "145°F with a 3-minute rest",
  seafood: "145°F",
  fish: "145°F",
  salmon: "145°F",
  shrimp: "145°F until opaque",
  vegetarian: "165°F for any egg-based components",
};

function pageCopyBlob(page: GoldenRecipePage): string {
  return [
    page.title,
    page.displayTitle,
    page.subtitle,
    page.description,
    page.whyCrewsLikeIt,
    ...(page.tonightSpread ?? []),
    ...(page.proTips ?? []),
    ...(page.leftovers ?? []),
    ...(page.steps ?? []).map((s) => `${s.title} ${s.instruction}`),
    ...(page.ingredients ?? []).map((i) => i.name),
  ]
    .filter(Boolean)
    .join("\n");
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
  if (/\bchicken/i.test(core) && /\bchicken|\bthigh|\bbreast|\bshred/i.test(stepText)) return true;
  return words.some((w) => stepText.includes(w));
}

function proteinListedInIngredients(
  phrase: string,
  ingredients: GoldenRecipePageIngredient[],
): boolean {
  const p = phrase.toLowerCase().trim();
  const ingBlob = ingredients.map((i) => i.name.toLowerCase()).join(" ");
  if (ingredientReferencedInSteps(p, ingBlob)) return true;
  if (/\bsausage\b/.test(p) && /\b(linguica|chorizo|andouille|sausage|bratwurst|kielbasa)\b/i.test(ingBlob)) {
    return true;
  }
  if (/\bsteaks?\b/.test(p) && /\b(shoulder|steak|chop|sirloin|ribeye|strip)\b/i.test(ingBlob)) {
    return true;
  }
  if (/beef slices/.test(p) && /\b(ribeye|sirloin|flank|skirt|beef)\b/i.test(ingBlob)) {
    return true;
  }
  return false;
}

function auditSpellingGrammar(page: GoldenRecipePage): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const blob = pageCopyBlob(page);

  for (const hit of findMasterAiPhrases(blob)) {
    issues.push({ category: "spelling_grammar", message: `ai_phrase: ${hit}` });
  }
  for (const hit of findTemplateLanguageInText(blob)) {
    issues.push({ category: "authenticity", message: `template: ${hit}` });
  }
  for (const hit of detectGenericAiWording(blob)) {
    issues.push({ category: "authenticity", message: `ai_wording: ${hit}` });
  }
  for (const re of BANNED_INSTRUCTION_PHRASES) {
    if (re.test(blob)) {
      issues.push({ category: "spelling_grammar", message: `banned_phrase: ${re.source.slice(0, 36)}` });
      break;
    }
  }
  if (/\bwhilst\b/i.test(blob)) issues.push({ category: "spelling_grammar", message: "whilst → use while" });
  if (/\butilize\b/i.test(blob)) issues.push({ category: "spelling_grammar", message: "utilize → use use" });

  return issues;
}

function auditIngredientAlignment(page: GoldenRecipePage): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const stepText = (page.steps ?? []).map((s) => `${s.title} ${s.instruction}`).join(" ").toLowerCase();

  for (const ing of page.ingredients ?? []) {
    const name = (ing.name || "").trim();
    if (!name || ing.optional) continue;
    if (PANTRY_SKIP.test(name)) continue;
    if (/sauce|dressing|garnish|optional|serve|seasoning/i.test(ing.group || "")) continue;
    if (!ingredientReferencedInSteps(name, stepText)) {
      issues.push({ category: "ingredient_unused", message: `unused: ${name}` });
    }
  }

  const ingNames = (page.ingredients ?? []).map((i) => i.name.toLowerCase()).join(" ");
  for (const step of page.steps ?? []) {
    if (/gather|mise|serve|portion|hold|leftover/i.test(step.title || "")) continue;
    const text = step.instruction || "";
    const proteinMatch = text.match(
      /\b(?:sear|grill|bake|roast|cook|smoke|fry)\s+(?:the\s+)?((?:boneless\s+)?(?:chicken thighs?|chicken breasts?|ground beef|beef slices?|steaks?|pork chops?|turkey|salmon|shrimp|cod|sausages?|sausage links?|sausage))\b/gi,
    );
    if (proteinMatch) {
      for (const m of proteinMatch) {
        const key = m
          .replace(/^(?:sear|grill|bake|roast|cook|smoke|fry)\s+(?:the\s+)?/i, "")
          .trim()
          .toLowerCase();
        if (key.length > 4 && !proteinListedInIngredients(key, page.ingredients ?? [])) {
          issues.push({ category: "ingredient_missing", message: `in steps but not listed: ${key}` });
          break;
        }
      }
    }
  }

  return issues.slice(0, 8);
}

function auditQuantities(page: GoldenRecipePage): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const crew = page.baseServings ?? page.crewSize ?? 8;

  for (const ing of page.ingredients ?? []) {
    if (PROTEIN_WORD.test(ing.name) && ing.quantity && ing.unit) {
      const oz = auditProteinOzPerFirefighter(ing.name, ing.quantity, ing.unit, crew);
      if (oz != null && oz > 14) {
        issues.push({
          category: "quantity_unrealistic",
          message: `${ing.name}: ${Math.round(oz * 10) / 10} oz/person (max ~12)`,
        });
      }
    }
    if (!ing.quantity?.trim() && !ing.optional && !PANTRY_SKIP.test(ing.name)) {
      issues.push({ category: "quantity_unrealistic", message: `missing quantity: ${ing.name}` });
    }
  }

  return issues.slice(0, 6);
}

function stepNeedsInternalTemp(step: GoldenRecipePageStep): boolean {
  const title = (step.title || "").toLowerCase();
  if (
    /gather|mise|equipment|hold for|portion|open the line|scale for|quality check|leftover|verify safe|preheat ovens|backup tray|label hotel/i.test(
      title,
    )
  ) {
    return false;
  }
  const blob = `${step.title} ${step.instruction}`.toLowerCase();
  if (!HOT_COOK.test(blob)) return false;
  if (!PROTEIN_WORD.test(blob)) return false;
  if (/serve|plate|build bowl|assemble|toss salad|garnish|mix sauce|whisk dressing/i.test(blob) && !/sear|grill|bake|roast|fry|simmer|smoke|broil|internal|165|145|160/i.test(blob)) {
    return false;
  }
  return /sear|grill|bake|roast|fry|simmer|smoke|broil|sauté|saute|cook (the )?(chicken|beef|pork|turkey|sausage|steak|fish|cod|salmon|shrimp|meat)/i.test(blob);
}

function auditTemperatures(page: GoldenRecipePage): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const allSteps = (page.steps ?? []).map((s) => s.instruction).join(" ");
  const needsHot = HOT_COOK.test(allSteps);

  if (needsHot && !hasTemperatureCue(allSteps) && !page.steps.some((s) => s.heatLevel)) {
    issues.push({ category: "temperature_missing", message: "hot cooking steps lack oven/grill/surface temperature" });
  }

  for (const step of page.steps ?? []) {
    if (stepNeedsInternalTemp(step) && !SAFE_INTERNAL.test(step.instruction)) {
      issues.push({
        category: "internal_temp_missing",
        message: `step ${step.stepNumber} (${step.title}) needs safe internal temp cue`,
      });
    }
  }

  return issues.slice(0, 6);
}

function auditCookTimes(page: GoldenRecipePage, detailPass: boolean): QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (detailPass) return issues;

  const prep = page.prepTime ?? 0;
  const cook = page.cookTime ?? 0;
  const declared = prep + cook;
  const stepSum = (page.steps ?? [])
    .filter((s) => !/gather|mise|hold for call|scale for|quality check/i.test(s.title || ""))
    .reduce((s, st) => s + (st.minutes ?? 0), 0);

  if (declared <= 0) {
    issues.push({ category: "cook_time_unrealistic", message: "missing prep/cook time metadata" });
    return issues;
  }

  if (stepSum > 0 && stepSum > declared * 2.5) {
    issues.push({
      category: "cook_time_unrealistic",
      message: `active step minutes (${stepSum}) exceed declared total (${declared})`,
    });
  }

  return issues;
}

function auditBeginnerSteps(page: GoldenRecipePage): QualityIssue[] {
  const issues: QualityIssue[] = [];

  for (const step of page.steps ?? []) {
    const title = step.title || "untitled";
    const instr = step.instruction || "";

    if (isBannedStepTitle(title) || isGenericStep({ title, instruction: instr })) {
      issues.push({ category: "vague_step", message: `rewrite needed: ${title}` });
      continue;
    }

    if (/^cook (the )?chicken\.?$/i.test(instr.trim()) || /^cook onions?\.?$/i.test(instr.trim())) {
      issues.push({ category: "vague_step", message: `too vague: ${title}` });
      continue;
    }

    const hasAction = HOT_COOK.test(instr) || /add|mix|whisk|fold|toss|drain|shred|slice|chop|season/i.test(instr);
    const hasTime = hasTimingCue(instr) || (step.minutes != null && step.minutes > 0);
    const hasSuccess = /until|golden|brown|translucent|tender|flaky|crisp|165|145|160|internal|bubbl|char|soft|thick/i.test(instr);

    if (hasAction && (!hasTime || !hasSuccess) && instr.length < 80) {
      issues.push({
        category: "vague_step",
        message: `${title}: missing time, heat, or doneness cue`,
      });
    }
  }

  return issues.slice(0, 8);
}

function auditDishIdentity(page: GoldenRecipePage): QualityIssue[] {
  const check = titleMatchesDishIdentity(page.title, page.ingredients);
  if (!check.ok) {
    return [
      {
        category: "authenticity",
        message: `title_dish_mismatch: ${check.reason} — "${page.title}"`,
      },
    ];
  }
  return [];
}

export function auditCuratedRecipeQuality(
  page: GoldenRecipePage,
  entry: Pick<ApprovedCatalogEntry, "slug" | "kind">,
): CuratedRecipeQualityRow {
  const core = auditGoldenRecipeContent(page);
  const detail = auditRecipeDetailPage(page, entry);

  const issues: QualityIssue[] = [
    ...auditSpellingGrammar(page),
    ...auditIngredientAlignment(page),
    ...auditQuantities(page),
    ...auditTemperatures(page),
    ...auditCookTimes(page, detail.pass),
    ...auditBeginnerSteps(page),
    ...auditDishIdentity(page),
  ];

  if (!detail.pass) {
    for (const msg of detail.issues.slice(0, 4)) {
      issues.push({ category: "completeness", message: msg });
    }
  }

  const unique = [...new Map(issues.map((i) => [`${i.category}:${i.message}`, i])).values()];
  const pass = unique.length === 0;
  const score = Math.max(0, Math.min(100, 100 - unique.length * 8));

  return {
    slug: entry.slug,
    title: page.displayTitle || page.title,
    kind: entry.kind,
    pass,
    score,
    issues: unique,
    issueCount: unique.length,
  };
}

export function buildCuratedQualityReport(
  rows: CuratedRecipeQualityRow[],
): CuratedRecipeQualityReport {
  const byCategory = {} as Record<QualityIssueCategory, number>;
  const categories: QualityIssueCategory[] = [
    "spelling_grammar",
    "ingredient_unused",
    "ingredient_missing",
    "quantity_unrealistic",
    "temperature_missing",
    "internal_temp_missing",
    "cook_time_unrealistic",
    "vague_step",
    "completeness",
    "authenticity",
  ];
  for (const c of categories) byCategory[c] = 0;
  for (const row of rows) {
    for (const issue of row.issues) {
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      recipes: rows.length,
      pass: rows.filter((r) => r.pass).length,
      fail: rows.filter((r) => !r.pass).length,
      byCategory,
    },
    rows,
  };
}

/** Weave unused listed ingredients into the first step so rookies see them used. */
export function patchUnusedIngredients(page: GoldenRecipePage): { page: GoldenRecipePage; fixed: string[] } {
  const stepText = (page.steps ?? []).map((s) => `${s.title} ${s.instruction}`).join(" ").toLowerCase();
  const unused: string[] = [];

  for (const ing of page.ingredients ?? []) {
    const name = (ing.name || "").trim();
    if (!name || ing.optional) continue;
    if (PANTRY_SKIP.test(name)) continue;
    if (/garnish|optional/i.test(ing.group || "")) continue;
    if (!ingredientReferencedInSteps(name, stepText)) unused.push(name);
  }

  if (!unused.length || !page.steps?.length) return { page, fixed: [] };

  const list = unused.slice(0, 4).join(", ");
  const steps = page.steps.map((s, i) => ({ ...s }));
  const first = steps[0]!;
  if (!first.instruction.includes(unused[0]!.split(/\s+/)[0]!)) {
    first.instruction = `${first.instruction.trim()} Use ${list} as listed — measure each before heat goes on.`;
    steps[0] = first;
  }

  return { page: { ...page, steps }, fixed: unused.slice(0, 4) };
}

/** Add safe internal temp cues to protein cook steps that lack them. */
export function patchInternalTemps(page: GoldenRecipePage, protein = "chicken"): GoldenRecipePage {
  const safeTemp = PROTEIN_SAFE_TEMP[protein] || PROTEIN_SAFE_TEMP.chicken;
  const steps = (page.steps ?? []).map((step) => {
    if (!stepNeedsInternalTemp(step) || SAFE_INTERNAL.test(step.instruction)) return step;
    return {
      ...step,
      instruction: `${step.instruction.trim()} Target ${safeTemp} at the thickest point before moving to the next batch.`,
    };
  });
  return { ...page, steps };
}

export { ingredientReferencedInSteps };
