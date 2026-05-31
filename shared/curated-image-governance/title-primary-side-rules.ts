/**
 * P0 image accuracy — hero must visibly match title protein, cooking style,
 * primary side dishes, and meal format (metadata/path heuristics; vision QA separate).
 *
 * FAIL code: image_title_mismatch (severity P0 / critical)
 */

import { lookupConfiguredImageDonorSlug } from "../image-donor-resolver.js";
import type { ImageAccuracyIssue } from "./image-accuracy-rules.js";

export const IMAGE_TITLE_MISMATCH_CODE = "image_title_mismatch" as const;

export interface TitleVisualRequirements {
  protein: string | null;
  cookingStyle: string | null;
  primarySides: string[];
  mealFormat: string | null;
}

/** Side phrase → cues that must appear in hero path / alt / prompt metadata. */
type SideCueRule = {
  sideRe: RegExp;
  requiredRe: RegExp;
  forbiddenRe?: RegExp;
  message: string;
};

const GENERIC_SUBSTITUTE_PATH_RE =
  /\b(chicken-bowl|chicken-bowls|rice-bowl|grain-bowl|power-bowl|generic-bowl|greek-chicken-bowls|teriyaki-chicken-bowls|bibimbap|meal-prep-bowl)\b/i;

const COOKING_STYLE_PATTERNS: Array<{ style: string; re: RegExp }> = [
  { style: "jerk", re: /\bjerk\b/i },
  { style: "barbacoa", re: /\bbarbacoa\b/i },
  { style: "pulled", re: /\bpulled\b/i },
  { style: "crock", re: /\bcrock\b/i },
  { style: "smoked", re: /\bsmoked\b/i },
  { style: "grilled", re: /\bgrilled\b/i },
  { style: "roasted", re: /\broasted\b/i },
  { style: "fried", re: /\bfried\b/i },
  { style: "braised", re: /\bbraised\b/i },
  { style: "bbq", re: /\b(bbq|barbecue)\b/i },
];

const SIDE_CUE_RULES: SideCueRule[] = [
  {
    sideRe: /potato wedges?|\bwedges\b/i,
    requiredRe: /\b(wedge|wedges|potato|fries|roasted potato)\b/i,
    forbiddenRe: GENERIC_SUBSTITUTE_PATH_RE,
    message: "title requires potato wedges visible — hero must show wedges, not a generic bowl",
  },
  {
    sideRe: /caesar\s+salad|\bcaesar\b/i,
    requiredRe: /\b(caesar|romaine|lettuce|salad|parmesan|dressing)\b/i,
    forbiddenRe: /\b(bowl|sandwich|burger|pasta)\b/i,
    message: "Caesar salad title — hero must show lettuce, dressing, and parmesan cues",
  },
  {
    sideRe: /rice\s*(?:&|and)\s*peas|\bpeas and rice\b/i,
    requiredRe: /\b(rice|peas|jerk|caribbean)\b/i,
    forbiddenRe: GENERIC_SUBSTITUTE_PATH_RE,
    message: "rice & peas title — hero must show rice and peas, not a generic rice bowl",
  },
  {
    sideRe: /mac\s*(?:&|and)\s*cheese|\bmacaroni\b/i,
    requiredRe: /\b(mac|macaroni|cheese|pasta|elbow)\b/i,
    forbiddenRe: /\b(sandwich|bun|taco|generic-bowl)\b/i,
    message: "mac and cheese title — hero must show mac and cheese, not a substitute meal",
  },
  {
    sideRe: /mashed potatoes?|\bmash\b/i,
    requiredRe: /\b(mash|mashed|potato)\b/i,
    forbiddenRe: GENERIC_SUBSTITUTE_PATH_RE,
    message: "mashed potato side — hero must show mashed potatoes",
  },
  {
    sideRe: /\bcoleslaw\b/i,
    requiredRe: /\b(coleslaw|slaw|cabbage)\b/i,
    message: "coleslaw side — hero must show slaw",
  },
  {
    sideRe: /\bcornbread\b/i,
    requiredRe: /\b(cornbread|corn bread)\b/i,
    message: "cornbread side — hero must show cornbread",
  },
  {
    sideRe: /\bbaked beans?\b/i,
    requiredRe: /\b(bean|baked)\b/i,
    message: "baked beans side — hero must show beans",
  },
  {
    sideRe: /\bfried rice\b/i,
    requiredRe: /\b(fried.?rice|rice)\b/i,
    forbiddenRe: GENERIC_SUBSTITUTE_PATH_RE,
    message: "fried rice side — hero must show fried rice",
  },
  {
    sideRe: /\bgarlic bread\b/i,
    requiredRe: /\b(garlic.?bread|bread|toast)\b/i,
    message: "garlic bread side — hero must show bread",
  },
  {
    sideRe: /\bnaan\b/i,
    requiredRe: /\b(naan|bread|flatbread)\b/i,
    message: "naan side — hero must show naan or flatbread",
  },
  {
    sideRe: /\bpeas\b/i,
    requiredRe: /\b(peas|rice)\b/i,
    message: "peas side — hero must show peas",
  },
];

function normalizeSidePhrase(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function looksLikeMainDishOnly(phrase: string): boolean {
  return /^(chicken|beef|pork|salmon|shrimp|turkey|lamb|fish)\s*$/i.test(phrase.trim());
}

/** Extract primary sides and cooking cues named in the recipe title. */
export function extractTitleVisualRequirements(
  title: string,
  mealFormat?: string,
): TitleVisualRequirements {
  const sides: string[] = [];
  const t = title.trim();

  const withMatch = t.match(/\bwith\s+(.+)$/i);
  if (withMatch?.[1]) sides.push(normalizeSidePhrase(withMatch[1]));

  const overMatch = t.match(/\bover\s+([^.]+)/i);
  if (overMatch?.[1]) sides.push(normalizeSidePhrase(overMatch[1]));

  const andParts = t.split(/\s+(?:and|\&)\s+/i);
  if (andParts.length >= 2) {
    for (let i = 1; i < andParts.length; i++) {
      const part = normalizeSidePhrase(andParts[i]!);
      if (part && !looksLikeMainDishOnly(part)) sides.push(part);
    }
  }

  if (/\bmac\b.*\bcheese\b/i.test(t)) sides.push("mac and cheese");
  if (/\bcaesar\s+salad\b/i.test(t)) sides.push("caesar salad");
  if (/\brice\s*(?:&|and)\s*peas\b/i.test(t)) sides.push("rice and peas");
  if (/\bpotato wedges?\b/i.test(t)) sides.push("potato wedges");

  const uniqueSides = [...new Set(sides.filter(Boolean))];

  let protein: string | null = null;
  if (/\bchicken\b/i.test(t)) protein = "chicken";
  else if (/\b(pulled pork|pork)\b/i.test(t)) protein = "pork";
  else if (/\b(beef|steak|brisket)\b/i.test(t)) protein = "beef";
  else if (/\b(salmon|fish|cod|tilapia|shrimp)\b/i.test(t)) protein = "seafood";
  else if (/\bturkey\b/i.test(t)) protein = "turkey";
  else if (/\blamb\b/i.test(t)) protein = "lamb";

  let cookingStyle: string | null = null;
  for (const { style, re } of COOKING_STYLE_PATTERNS) {
    if (re.test(t)) {
      cookingStyle = style;
      break;
    }
  }

  let format: string | null = mealFormat?.trim().toLowerCase() || null;
  if (/\bsalad\b/i.test(t)) format = format || "salad";
  if (/\bsandwich\b/i.test(t)) format = format || "sandwich";
  if (/\btaco\b/i.test(t)) format = format || "tacos";
  if (/\bburger\b/i.test(t)) format = format || "burger";
  if (/\bpizza\b/i.test(t)) format = format || "pizza";
  if (/\b(mac and cheese|macaroni)\b/i.test(t)) format = format || "pasta";

  return {
    protein,
    cookingStyle,
    primarySides: uniqueSides,
    mealFormat: format,
  };
}

/** Prompt line for image generation — required visible sides. */
export function buildRequiredVisibleSidesPromptLine(title: string, mealFormat?: string): string {
  const req = extractTitleVisualRequirements(title, mealFormat);
  const parts: string[] = [];

  if (req.protein) parts.push(`${req.protein} protein clearly visible`);
  if (req.cookingStyle) parts.push(`${req.cookingStyle} cooking style evident`);
  for (const side of req.primarySides) parts.push(`${side} clearly visible on plate`);

  if (parts.length === 0) return "";

  return (
    `Required visible elements (P0 — image fails if missing): ${parts.join("; ")}. ` +
    "No generic bowl substitutes. No unrelated donor meals."
  );
}

function p0Issue(message: string, confidence = 95): ImageAccuracyIssue {
  return {
    code: IMAGE_TITLE_MISMATCH_CODE,
    severity: "critical",
    message,
    confidence,
  };
}

export function auditTitlePrimarySideAlignment(input: {
  slug: string;
  title: string;
  mealFormat?: string;
  heroPath: string;
  heroAlt?: string;
  promptText?: string;
}): ImageAccuracyIssue[] {
  const issues: ImageAccuracyIssue[] = [];
  const req = extractTitleVisualRequirements(input.title, input.mealFormat);
  const blob = `${input.heroPath} ${input.heroAlt || ""} ${input.promptText || ""}`.toLowerCase();

  if (req.primarySides.length === 0 && !req.cookingStyle) {
    return issues;
  }

  const donor = lookupConfiguredImageDonorSlug(input.slug);
  if (donor && donor !== input.slug) {
    issues.push(
      p0Issue(
        `donor image from "${donor}" forbidden for "${input.title}" — queue AI regeneration with title-locked sides`,
        98,
      ),
    );
  }

  if (GENERIC_SUBSTITUTE_PATH_RE.test(input.heroPath) && req.primarySides.length > 0) {
    issues.push(
      p0Issue(
        `generic bowl/substitute hero path for title with named sides (${req.primarySides.join(", ")})`,
        96,
      ),
    );
  }

  for (const side of req.primarySides) {
    const matchedRule = SIDE_CUE_RULES.find((r) => r.sideRe.test(side));
    if (!matchedRule) continue;

    if (!matchedRule.requiredRe.test(blob)) {
      issues.push(
        p0Issue(`${matchedRule.message} (title side: "${side}")`, 94),
      );
    }
    if (matchedRule.forbiddenRe?.test(blob)) {
      issues.push(
        p0Issue(`${matchedRule.message} — forbidden substitute imagery detected`, 97),
      );
    }
  }

  if (req.cookingStyle === "barbacoa" && req.primarySides.some((s) => /wedge|potato/i.test(s))) {
    if (/\b(rice|corn|bowl)\b/i.test(blob) && !/\b(wedge|wedges|potato)\b/i.test(blob)) {
      issues.push(
        p0Issue("Barbacoa with potato wedges — hero must not show rice, corn, or bowl presentation", 96),
      );
    }
  }

  if (req.cookingStyle === "jerk" && req.primarySides.some((s) => /rice|peas/i.test(s))) {
    if (!/\b(jerk|rice|peas|caribbean)\b/i.test(blob)) {
      issues.push(
        p0Issue("Jerk chicken with rice & peas — hero must show jerk chicken and rice/peas", 95),
      );
    }
  }

  if (req.protein === "pork" && /\bmac\b.*\bcheese\b/i.test(input.title)) {
    if (!/\b(mac|macaroni|cheese|pasta)\b/i.test(blob)) {
      issues.push(
        p0Issue("Pulled pork mac and cheese — hero must visibly contain mac and cheese", 96),
      );
    }
    if (/\b(sandwich|bun|sliders?)\b/i.test(blob) && !/\bmac\b/i.test(blob)) {
      issues.push(
        p0Issue("mac and cheese title but hero suggests sandwich without mac and cheese", 94),
      );
    }
  }

  if (/\bcaesar\s+salad\b/i.test(input.title)) {
    if (!/\b(salad|caesar|romaine|lettuce|parmesan)\b/i.test(blob)) {
      issues.push(
        p0Issue("Chicken Caesar Salad — hero must show salad greens, dressing, and parmesan cues", 95),
      );
    }
  }

  return issues;
}

/** Whether any P0 title mismatch was detected. */
export function hasImageTitleMismatch(issues: ImageAccuracyIssue[]): boolean {
  return issues.some((i) => i.code === IMAGE_TITLE_MISMATCH_CODE && i.severity === "critical");
}
