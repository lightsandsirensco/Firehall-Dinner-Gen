/**
 * Plating Accuracy Standard — food photography must show meals exactly
 * how a firefighter would receive them on shift.
 */

import type { PlatingType } from "./plating-type.js";
import { inferPlatingType } from "./plating-type.js";

export const PLATING_ACCURACY_STANDARD_VERSION = "1.0" as const;

export const PLATING_ACCURACY_MAIN_RULE = [
  "PLATING ACCURACY: Show the meal exactly how a firefighter would receive it on the line.",
  "Main protein and every major side must be clearly visible in the same frame.",
  "Do NOT hide sides behind the main dish.",
  "Do NOT stack unrelated foods on top of each other.",
  "A firefighter must identify main dish, starch, and vegetable/secondary side within 1 second.",
].join(" ");

export const PLATING_ACCURACY_BREAKFAST_RULES = [
  "BREAKFAST PLATING: Each component occupies its own zone on the plate or tray — eggs, bacon, sausage, potatoes/hash browns, pancakes/toast/biscuits each readable at a glance.",
  "Never place eggs on top of pancakes.",
  "Never bury potatoes or hash browns under other food.",
  "Never hide bacon or sausage behind other items.",
].join(" ");

export const PLATING_ACCURACY_DINNER_RULES = [
  "DINNER PLATE COMPOSITION: Protein ~40–50% of plate, starch ~25–35%, vegetable or secondary side ~15–25%.",
  "All sides visible — no hidden rice, potatoes, or vegetables under protein or sauce.",
].join(" ");

export const PLATING_ACCURACY_CURRY_RULES = [
  "CURRY / RICE DISH: Show protein, sauce, and rice in separate visible zones (hotel pan, platter, or divided plate).",
  "Rice must be clearly visible — not a bowl of sauce only.",
  "Optional naan or flatbread may appear beside the rice if culturally appropriate.",
].join(" ");

export const PLATING_ACCURACY_SANDWICH_RULES = [
  "SANDWICH PLATING: Closed sandwich on proper bun or roll (not loose toast slices unless titled toast).",
  "Named side (fries, wedges, slaw, salad) on the same frame — never crop out the side.",
].join(" ");

export const PLATING_ACCURACY_FAIL_EXAMPLES = [
  "FAIL: eggs on pancakes",
  "FAIL: butter chicken with no visible rice",
  "FAIL: potato wedges recipe without wedges visible",
  "FAIL: jerk chicken without visible rice and peas",
  "FAIL: steak sandwich on toast instead of a bun/roll",
  "FAIL: sauce-only bowl with protein and rice hidden",
] as const;

const BREAKFAST_TITLE_RE =
  /\b(breakfast|brunch|pancake|waffle|omelette|omelet|hash brown|hashbrown|biscuits?\s+and\s+gravy|bacon\s+and\s+eggs|egg\s+bake|french\s+toast|breakfast\s+burrito|breakfast\s+plate)\b/i;

const CURRY_RICE_TITLE_RE =
  /\b(jerk\s*chicken|butter\s*chicken|chicken\s*tikka|tikka\s*masala|thai\s*curry|green\s*curry|red\s*curry|massaman|korma|vindaloo|curry\b|rice\s*(?:&|and)\s*peas|peas\s*(?:&|and)\s*rice)\b/i;

const SANDWICH_TITLE_RE =
  /\b(sandwich|sub\b|hoagie|panini|french\s*dip|beef\s*dip|steak\s*sandwich|philly|po.?boy|slider)\b/i;

export function isBreakfastTitle(title: string): boolean {
  return BREAKFAST_TITLE_RE.test(title.trim());
}

export function isCurryRiceDishTitle(title: string): boolean {
  return CURRY_RICE_TITLE_RE.test(title.trim());
}

export function isSandwichMealTitle(title: string, mealFormat?: string): boolean {
  const fmt = (mealFormat || "").toLowerCase();
  return SANDWICH_TITLE_RE.test(title.trim()) || fmt === "sandwich";
}

/** Positive prompt lines injected into every food hero generation. */
export function buildPlatingAccuracyPromptLines(
  title: string,
  mealFormat?: string,
  platingType?: PlatingType,
): string[] {
  const t = title.trim();
  const type = platingType ?? inferPlatingType(t, mealFormat);
  const lines: string[] = [PLATING_ACCURACY_MAIN_RULE];

  if (isBreakfastTitle(t) || (mealFormat || "").toLowerCase() === "breakfast") {
    lines.push(PLATING_ACCURACY_BREAKFAST_RULES);
  } else if (isCurryRiceDishTitle(t) || type === "rice_plate") {
    lines.push(PLATING_ACCURACY_CURRY_RULES);
  } else if (isSandwichMealTitle(t, mealFormat) || type === "sandwich") {
    lines.push(PLATING_ACCURACY_SANDWICH_RULES);
  } else if (type === "plated" || type === "skillet" || (mealFormat || "").toLowerCase() === "plated_main") {
    lines.push(PLATING_ACCURACY_DINNER_RULES);
  }

  return lines;
}

/** Extra negative hints for image models. */
export function buildPlatingAccuracyNegativeHints(
  title: string,
  mealFormat?: string,
  platingType?: PlatingType,
): string[] {
  const t = title.trim();
  const type = platingType ?? inferPlatingType(t, mealFormat);
  const hints: string[] = [
    "sides hidden behind main dish",
    "unrelated foods stacked on each other",
    "protein-only hero with no visible starch or side",
    "sauce-only bowl hiding rice",
  ];

  if (isBreakfastTitle(t)) {
    hints.push(
      "eggs on top of pancakes",
      "hash browns buried under other food",
      "bacon hidden behind other items",
      "single merged breakfast pile",
    );
  }

  if (isCurryRiceDishTitle(t) || type === "rice_plate") {
    hints.push("curry with no visible rice", "bowl of sauce only", "rice completely hidden under sauce");
  }

  if (isSandwichMealTitle(t, mealFormat) || type === "sandwich") {
    hints.push("sandwich without visible side", "cropped fries", "open-faced toast when titled sandwich");
  }

  if (/\bsteak\s*sandwich/i.test(t)) {
    hints.push("steak on toast slices", "steak sandwich without bun or kaiser roll");
  }

  if (/\bwedge/i.test(t)) {
    hints.push("missing potato wedges", "fries substituted for wedges when title says wedges");
  }

  return hints;
}

/** Appended to vision QA system prompt. */
export function getPlatingAccuracyVisionRubric(): string {
  return [
    "PLATING ACCURACY (mandatory):",
    PLATING_ACCURACY_MAIN_RULE,
    PLATING_ACCURACY_BREAKFAST_RULES,
    PLATING_ACCURACY_DINNER_RULES,
    PLATING_ACCURACY_CURRY_RULES,
    PLATING_ACCURACY_SANDWICH_RULES,
    "FAIL if a firefighter cannot within 1 second identify: (1) main dish, (2) starch, (3) vegetable or secondary side.",
    `Known fails: ${PLATING_ACCURACY_FAIL_EXAMPLES.join("; ")}.`,
  ].join("\n");
}

export type PlatingAccuracyAuditResult = {
  pass: boolean;
  issues: string[];
};

/** Metadata / alt-text heuristic — catches obvious plating fails before vision. */
export function auditPlatingAccuracyMetadata(input: {
  title: string;
  mealFormat?: string;
  heroPath?: string;
  heroAlt?: string;
}): PlatingAccuracyAuditResult {
  const issues: string[] = [];
  const blob = `${input.heroPath || ""} ${input.heroAlt || ""}`.toLowerCase();
  const title = input.title.trim();

  if (isBreakfastTitle(title)) {
    if (
      /\begg.*pancake|pancake.*egg|on top of pancake/i.test(blob) &&
      !/\b(separate zones?|separate zone|not on top|egg zone|pancake stack zone|scrambled-egg zone)\b/i.test(blob)
    ) {
      issues.push("breakfast_fail: eggs on pancakes");
    }
    if (/\bburied|hidden.*bacon|bacon.*hidden/i.test(blob)) {
      issues.push("breakfast_fail: bacon hidden");
    }
  }

  if (isCurryRiceDishTitle(title)) {
    const riceHidden = /\b(sauce.?only|no rice|without rice|hidden rice|rice not visible)\b/i.test(blob);
    const riceVisible =
      /\b(rice|peas and rice|coconut rice|jasmine rice|basmati|rice and peas)\b/i.test(blob) && !riceHidden;
    if (riceHidden || (blob.length > 0 && !riceVisible)) {
      issues.push("curry_fail: rice not clearly visible");
    }
  }

  if (/\bsteak\s*sandwich/i.test(title)) {
    if (/\btoast\b/i.test(blob) && !/\b(bun|kaiser|hoagie|roll|ciabatta|sub)\b/i.test(blob)) {
      issues.push("sandwich_fail: steak sandwich on toast not bun");
    }
  }

  if (/\bpotato wedges?\b/i.test(title)) {
    if (blob && !/\b(wedge|wedges)\b/i.test(blob)) {
      issues.push("side_fail: potato wedges not indicated in hero metadata");
    }
  }

  if (/\brice\s*(?:&|and)\s*peas\b/i.test(title)) {
    if (blob && (!/\brice\b/i.test(blob) || !/\bpeas\b/i.test(blob))) {
      issues.push("side_fail: rice and peas not both indicated in hero metadata");
    }
  }

  return { pass: issues.length === 0, issues };
}
