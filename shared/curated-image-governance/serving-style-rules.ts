/**
 * Serving-style image governance — protein, carb, and vessel must match the recipe.
 */

import type { MealVisualSignal } from "../meal-image-title-match.js";
import type { CuratedMealImageProfile } from "./types.js";
import type { ImageGovernanceMismatch } from "./types.js";
import type { InferredImageTags } from "./infer-tags.js";

const STEW_CURRY_PATH_RE = /\b(curry|stew|chili|chowder|bisque|broth|one-pot|one_pot|coconut)\b/i;
const BOWL_PATH_RE = /\b(bowl|rice-bowl|grain-bowl|bibimbap|poke)\b/i;
const SOUP_PATH_RE = /\b(soup|chili|chowder|stew|bisque)\b/i;

const PROTEIN_TITLE_RULES: Array<{
  titleRe: RegExp;
  forbiddenPathRe: RegExp;
  message: string;
}> = [
  {
    titleRe: /\bchicken thighs?\b/i,
    forbiddenPathRe: /\b(breast|tender|cutlet|nugget|diced-chicken|shredded-chicken)\b/i,
    message: "title specifies chicken thighs but hero path suggests breast, tender, or shredded chicken",
  },
  {
    titleRe: /\bsalmon\b/i,
    forbiddenPathRe: /\b(cod|tilapia|white-fish|fish-taco|generic-fish)\b/i,
    message: "title specifies salmon but hero path suggests a different fish",
  },
  {
    titleRe: /\bpulled pork\b/i,
    forbiddenPathRe: /\b(pork-loin|pork-chop|sliced-pork|ham-slice)\b/i,
    message: "title specifies pulled pork but hero path suggests sliced pork loin or chops",
  },
  {
    titleRe: /\bsteak\b/i,
    forbiddenPathRe: /\b(roast-beef|pot-roast|brisket-slice|meatloaf)\b/i,
    message: "title specifies steak but hero path suggests roast beef or pot roast",
  },
];

const PLATED_FORBIDDEN_SIGNALS: MealVisualSignal[] = ["soup", "bowl"];
const BOWL_REQUIRED_SIGNALS: MealVisualSignal[] = ["bowl"];
const SOUP_REQUIRED_SIGNALS: MealVisualSignal[] = ["soup"];

function mismatch(
  code: ImageGovernanceMismatch["code"],
  severity: ImageGovernanceMismatch["severity"],
  message: string,
  confidence: number,
): ImageGovernanceMismatch {
  return { code, severity, message, confidence };
}

function titleMentionsSweetPotato(title: string): boolean {
  return /\bsweet potato\b/i.test(title);
}

function titleMentionsSpinach(title: string): boolean {
  return /\bspinach\b/i.test(title);
}

function pathSuggestsStewOrCurry(heroPath: string, altText = ""): boolean {
  return STEW_CURRY_PATH_RE.test(`${heroPath} ${altText}`);
}

export function validateServingStyleImageMatch(input: {
  profile: CuratedMealImageProfile;
  heroImage: string;
  heroAlt?: string;
  tags: InferredImageTags;
}): ImageGovernanceMismatch[] {
  const mismatches: ImageGovernanceMismatch[] = [];
  const hero = input.heroImage.trim();
  const blob = `${hero} ${input.heroAlt || ""}`.toLowerCase();
  const { profile, tags } = input;

  if (!hero) return mismatches;

  for (const rule of PROTEIN_TITLE_RULES) {
    if (rule.titleRe.test(profile.title) && rule.forbiddenPathRe.test(blob)) {
      mismatches.push(mismatch("protein_mismatch", "critical", rule.message, 90));
    }
  }

  if (profile.platingType === "plated" || profile.mealFormat === "plated_main") {
    if (pathSuggestsStewOrCurry(hero, input.heroAlt)) {
      mismatches.push(
        mismatch(
          "format_mismatch",
          "critical",
          "plated meal title but hero path suggests curry/stew/one-pot — never mix categories",
          93,
        ),
      );
    }
    if (BOWL_PATH_RE.test(blob) || tags.signals.includes("bowl")) {
      mismatches.push(
        mismatch(
          "plating_mismatch",
          "critical",
          "plated meal but hero suggests a bowl presentation",
          91,
        ),
      );
    }
    if (SOUP_PATH_RE.test(blob) || tags.signals.includes("soup")) {
      mismatches.push(
        mismatch(
          "plating_mismatch",
          "critical",
          "plated meal but hero suggests soup or stew",
          91,
        ),
      );
    }
  }

  if (profile.platingType === "bowl" || profile.mealFormat === "bowl") {
    const hasBowlCue = tags.signals.some((s) => BOWL_REQUIRED_SIGNALS.includes(s)) || BOWL_PATH_RE.test(blob);
    const looksPlatedOnly =
      /\b(plated|platter|sheet-pan|tray-bake)\b/i.test(blob) &&
      !hasBowlCue &&
      !tags.signals.includes("bowl");
    if (looksPlatedOnly) {
      mismatches.push(
        mismatch(
          "plating_mismatch",
          "critical",
          "bowl recipe but hero suggests a plated or tray meal",
          88,
        ),
      );
    }
  }

  if (profile.platingType === "soup" || profile.mealFormat === "soup_chili" || profile.mealFormat === "stew") {
    if (!tags.signals.includes("soup") && !SOUP_PATH_RE.test(blob) && !pathSuggestsStewOrCurry(hero, input.heroAlt)) {
      mismatches.push(
        mismatch(
          "format_mismatch",
          "warning",
          "soup/chili recipe but hero lacks soup/stew visual cues — manual review",
          55,
        ),
      );
    }
  }

  if (titleMentionsSweetPotato(profile.title) && profile.platingType === "plated") {
    if (pathSuggestsStewOrCurry(hero, input.heroAlt) && !/\bsweet-potato\b/i.test(blob)) {
      mismatches.push(
        mismatch(
          "format_mismatch",
          "critical",
          "sweet potato side dish title but hero suggests stew/curry rather than distinct roasted wedges",
          89,
        ),
      );
    }
  }

  if (titleMentionsSpinach(profile.title) && profile.platingType === "plated") {
    if (pathSuggestsStewOrCurry(hero, input.heroAlt) && !/\bspinach\b/i.test(blob)) {
      mismatches.push(
        mismatch(
          "format_mismatch",
          "warning",
          "fresh spinach side title but hero path suggests mixed soup/curry — verify spinach is a distinct side",
          62,
        ),
      );
    }
  }

  return mismatches;
}
