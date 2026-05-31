/**
 * Meal image completeness — title ingredients, sides, and complete-plate requirements.
 * Heuristic (path/metadata) + optional vision QA (see server/imagery/audit-meal-image-vision.ts).
 */

import type { ImageAccuracyIssue } from "./image-accuracy-rules.js";
import { extractTitleVisualRequirements } from "./title-primary-side-rules.js";

export type MealImageRequirements = {
  title: string;
  protein: string | null;
  titleIngredients: string[];
  primarySides: string[];
  titleRequiredSides: string[];
  spreadSides: string[];
  requiredVisible: string[];
  requiresCompleteMeal: boolean;
  forbiddenSubstitutes: string[];
};

const PANTRY_SKIP =
  /\b(salt|pepper|oil|water|stock|broth|garlic powder|onion powder|paprika|oregano|basil dried|thyme|parsley garnish|kosher|black pepper|olive oil|vegetable oil|canola|butter for greasing|nonstick spray)\b/i;

const SIDE_STOP = new Set([
  "fresh",
  "hot",
  "warm",
  "cold",
  "side",
  "sides",
  "optional",
  "extra",
  "simple",
  "creamy",
  "crusty",
  "grilled",
  "roasted",
  "steamed",
]);

function normalizePhrase(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function titleIngredientPhrases(title: string): string[] {
  const phrases: string[] = [];
  const t = title.trim();

  const withMatch = t.match(/\bwith\s+(.+?)(?:\s*[—–-]|$)/i);
  if (withMatch?.[1]) phrases.push(normalizePhrase(withMatch[1]));

  const andParts = t.split(/\s+(?:and|\&)\s+/i);
  if (andParts.length >= 2) {
    for (let i = 1; i < andParts.length; i++) {
      const part = normalizePhrase(andParts[i]!);
      if (part.length > 2) phrases.push(part);
    }
  }

  if (/\bsweet potato\b/i.test(t)) phrases.push("sweet potato");
  if (/\bspinach\b/i.test(t)) phrases.push("spinach");
  if (/\bcornbread\b/i.test(t)) phrases.push("cornbread");
  if (/\bpotato wedges?\b/i.test(t)) phrases.push("potato wedges");
  if (/\bmac\b.*\bcheese\b/i.test(t)) phrases.push("mac and cheese");
  if (/\brice\b/i.test(t) && /\bpeas\b/i.test(t)) phrases.push("rice and peas");

  return [...new Set(phrases.filter(Boolean))];
}

function visualIngredientTokens(name: string): string[] {
  const n = normalizePhrase(name);
  if (PANTRY_SKIP.test(n)) return [];
  const tokens = n.split(/[\s,/]+/).filter((t) => t.length > 2 && !SIDE_STOP.has(t));
  return tokens.slice(0, 4);
}

function isWorkflowSpreadLine(line: string): boolean {
  const s = line.trim();
  if (s.length > 85) return true;
  if (/^(keep|set|label|portion|serve family|warm tortillas|put hot|store|cool|add a splash)/i.test(s)) return true;
  if (/\b(°f|200°|170°|cambro|sheet tray|line runs|returning from a run)\b/i.test(s)) return true;
  return false;
}

function parseTonightSpreadFood(spread: string[]): string[] {
  const food: string[] = [];
  for (const raw of spread) {
    const line = String(raw).trim();
    if (!line || isWorkflowSpreadLine(line)) continue;

    const sidesMatch = line.match(/^sides?:\s*(.+)$/i);
    if (sidesMatch?.[1]) {
      for (const part of sidesMatch[1].split(/[,;]/)) {
        const p = normalizePhrase(part);
        if (p.length > 2) food.push(p);
      }
      continue;
    }

    const mainMatch = line.match(/^main:\s*(.+)$/i);
    if (mainMatch?.[1]) {
      food.push(normalizePhrase(mainMatch[1]));
      continue;
    }

    if (line.length <= 60) food.push(normalizePhrase(line.replace(/\.$/, "")));
  }
  return [...new Set(food.filter(Boolean))].slice(0, 4);
}

function spreadSidePhrases(spread: string[]): string[] {
  return parseTonightSpreadFood(spread);
}

export function extractMealImageRequirements(input: {
  title: string;
  mealFormat?: string;
  ingredients?: Array<{ name: string }>;
  tonightSpread?: string[];
}): MealImageRequirements {
  const titleReq = extractTitleVisualRequirements(input.title, input.mealFormat);
  const titleIngredients = titleIngredientPhrases(input.title);

  const ingredientVisuals: string[] = [];
  for (const ing of input.ingredients ?? []) {
    for (const tok of visualIngredientTokens(ing.name)) {
      if (!ingredientVisuals.includes(tok)) ingredientVisuals.push(tok);
    }
  }

  const spreadSides = spreadSidePhrases(input.tonightSpread ?? []);
  const titleSides = [...new Set([...titleReq.primarySides, ...titleIngredients])];
  const primarySides = [...new Set([...titleSides, ...spreadSides])];

  const requiredVisible = [
    ...(titleReq.protein ? [titleReq.protein] : []),
    ...titleIngredients,
    ...titleReq.primarySides,
  ].filter(Boolean);

  const requiresCompleteMeal =
    titleIngredients.length > 0 ||
    titleReq.primarySides.length > 0 ||
    (/\b(with|and|\&)\b/i.test(input.title) && requiredVisible.length >= 2) ||
    (ingredientVisuals.filter((v) => !/chicken|beef|pork|turkey|salmon|shrimp|fish/.test(v)).length >= 2 &&
      /\b(plate|tray|bowl|with)\b/i.test(input.title));

  const forbiddenSubstitutes: string[] = [];
  if (/\bsweet potato\b/i.test(input.title)) {
    forbiddenSubstitutes.push("tomato", "zucchini", "curry", "stew", "coconut");
  }
  if (/\bspinach\b/i.test(input.title) && !/\bsalad\b/i.test(input.title)) {
    forbiddenSubstitutes.push("broccoli only", "kale salad", "caesar");
  }
  if (/\bcornbread\b/i.test(input.title)) {
    forbiddenSubstitutes.push("protein only", "chicken only");
  }

  return {
    title: input.title,
    protein: titleReq.protein,
    titleIngredients,
    primarySides,
    titleRequiredSides: titleSides,
    spreadSides,
    requiredVisible: [...new Set(requiredVisible)],
    requiresCompleteMeal,
    forbiddenSubstitutes,
  };
}

function cueReForPhrase(phrase: string): RegExp {
  const p = normalizePhrase(phrase);
  if (/sweet potato/.test(p)) return /\b(sweet.?potato|yam|orange.?potato)\b/i;
  if (/spinach/.test(p)) return /\b(spinach|greens|wilted.?green)\b/i;
  if (/cornbread/.test(p)) return /\b(cornbread|corn.?bread|corn.?muffin)\b/i;
  if (/potato wedge/.test(p)) return /\b(wedge|wedges|potato)\b/i;
  if (/mac and cheese/.test(p)) return /\b(mac|macaroni|cheese|pasta)\b/i;
  if (/rice and peas/.test(p)) return /\b(rice|peas)\b/i;
  if (/caesar/.test(p)) return /\b(caesar|romaine|lettuce|salad)\b/i;
  if (/spaghetti|marinara|pasta/.test(p)) return /\b(spaghetti|pasta|marinara|noodle)\b/i;
  if (/garlic bread/.test(p)) return /\b(garlic.?bread|bread|baguette|toast)\b/i;
  if (/coleslaw|slaw/.test(p)) return /\b(coleslaw|slaw|cabbage)\b/i;
  if (/fries/.test(p)) return /\b(fries|french.?fries|potato)\b/i;
  if (/tortilla/.test(p)) return /\b(tortilla|taco)\b/i;
  if (/pickled/.test(p)) return /\b(pickled|onion|slaw)\b/i;
  if (/bun/.test(p)) return /\b(bun|roll|bread)\b/i;
  if (/chicken parm|cutlets/.test(p)) return /\b(chicken|parm|cutlet|cheese)\b/i;
  if (/pita/.test(p)) return /\b(pita|flatbread|bread)\b/i;
  if (/hummus/.test(p)) return /\b(hummus|dip)\b/i;
  if (/salad/.test(p) && p.length < 40) return /\b(salad|greens|lettuce|cucumber|tomato)\b/i;
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b(${escaped.replace(/\s+/g, "|")})\\b`, "i");
}

function issue(code: ImageAccuracyIssue["code"], message: string, confidence = 92): ImageAccuracyIssue {
  return { code, severity: "critical", message, confidence };
}

/** Metadata/path heuristic audit — fast pass before vision. */
export function auditMealImageCompleteness(input: {
  slug: string;
  title: string;
  mealFormat?: string;
  heroPath: string;
  heroAlt?: string;
  ingredients?: Array<{ name: string }>;
  tonightSpread?: string[];
  metadataOnly?: boolean;
}): ImageAccuracyIssue[] {
  const issues: ImageAccuracyIssue[] = [];
  const req = extractMealImageRequirements(input);
  const blob = `${input.slug} ${input.heroPath} ${input.heroAlt || ""} ${input.title}`.toLowerCase();
  const metadataOnly = input.metadataOnly !== false;

  const sidesToCheck = req.titleIngredients;

  for (const side of [...new Set(sidesToCheck)]) {
    if (!cueReForPhrase(side).test(blob)) {
      issues.push(
        issue(
          "image_title_mismatch",
          `Title component not represented in hero path/slug: "${side}"`,
          82,
        ),
      );
    }
  }

  for (const forbidden of req.forbiddenSubstitutes) {
    if (new RegExp(`\\b${forbidden.replace(/\s+/g, "[\\s-]?")}\\b`, "i").test(blob)) {
      issues.push(
        issue(
          "generic_substitute_meal",
          `Hero suggests wrong substitute (${forbidden}) for "${input.title}"`,
          94,
        ),
      );
    }
  }

  if (!metadataOnly && req.requiresCompleteMeal && req.requiredVisible.length >= 2) {
    const visibleCount = req.requiredVisible.filter((v) => cueReForPhrase(v).test(blob)).length;
    if (visibleCount < Math.min(2, req.requiredVisible.length)) {
      issues.push(
        issue(
          "image_title_mismatch",
          `Complete meal required — hero metadata shows too few title components (${visibleCount}/${req.requiredVisible.length})`,
          93,
        ),
      );
    }
  }

  const proteinOnlyPath =
    /\b(grill.?chicken|grilled.?chicken|chicken.?only|chicken.?breast|chicken.?thigh)\b/i.test(blob) &&
    !/\b(sweet.?potato|spinach|cornbread|rice|pasta|potato|wedge|salad|broccoli|bean|bread|pita)\b/i.test(blob);

  if (!metadataOnly && req.requiresCompleteMeal && proteinOnlyPath) {
    issues.push(
      issue(
        "image_title_mismatch",
        `Protein-only hero for complete meal title: "${input.title}"`,
        95,
      ),
    );
  }

  return issues;
}

/** Prompt block for replacement image generation. */
export function buildCompleteMealImagePromptBlock(input: {
  title: string;
  mealFormat?: string;
  ingredients?: Array<{ name: string }>;
  tonightSpread?: string[];
  cuisine?: string;
}): string {
  const req = extractMealImageRequirements(input);
  const visible = req.requiredVisible.length
    ? req.requiredVisible
    : (input.ingredients ?? []).slice(0, 6).map((i) => i.name);

  const lines = [
    `Complete firefighter crew meal for: ${input.title}`,
    "Family-style serving on platter, hotel pan, or wide prep table — wider camera angle, not tight restaurant macro crop",
    "Visible protein + carb/starch + vegetable where recipe includes them",
    `Required visible elements: ${visible.join("; ") || "all key recipe components"}`,
    "Firehall Meals visual style — commercial kitchen background, warm lighting, crew-sized portions",
    "NO protein-only close-up. NO garnish-only AI photography. NO unrelated donor meal substitute.",
  ];

  if (req.spreadSides.length) {
    lines.push(`Tonight spread cues: ${req.spreadSides.slice(0, 3).join("; ")}`);
  }

  return lines.join("\n");
}

export function hasMealCompletenessFailure(issues: ImageAccuracyIssue[]): boolean {
  return issues.some(
    (i) =>
      i.severity === "critical" &&
      (i.code === "image_title_mismatch" ||
        i.code === "generic_substitute_meal" ||
        i.code === "title_path_keyword_conflict"),
  );
}
