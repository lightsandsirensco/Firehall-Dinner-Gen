/**

 * Recipe content quality audit — Golden pages and curated rows.

 */



import type { GoldenRecipePage } from "../recipe-page-schema.js";

import type { GoldenRecipeAuditIssue } from "../types.js";

import { scoreRecipeTitle } from "../../recipe-title-quality.js";

import {

  countPlaceholderIngredients,

  hasTemperatureCue,

  hasTimingCue,

  hasWeakTitle,

  isBannedStepTitle,

  isGenericStep,

  isPlaceholderIngredient,

} from "./placeholders.js";

import { usesGenericGrillTemplate } from "./recipe-instruction-class.js";



export interface RecipeContentAuditResult {

  slug: string;

  pass: boolean;

  score: number;

  issues: GoldenRecipeAuditIssue[];

  needsManualReview: boolean;

}



const VAGUE_PATTERNS = [

  /\bto taste\b/i,

  /\bcook until done\b/i,

  /\bseason to taste\b/i,

  /\bpat the protein dry\b/i,

];



const SAUCE_TITLE_HINT =
  /\b(\w+\s+)?(sauce|alfredo|chimichurri|glaze|dressing|dip|gravy|marinara|white bbq)\b/i;



function pageHasTemperature(page: GoldenRecipePage): boolean {

  const joined = page.steps.map((s) => s.instruction).join(" ");

  return hasTemperatureCue(joined) || page.steps.some((s) => s.heatLevel && s.heatLevel.length > 0);

}



function pageHasTiming(page: GoldenRecipePage): boolean {

  if (page.steps.some((s) => s.minutes != null && s.minutes > 0)) return true;

  return page.steps.some((s) => hasTimingCue(s.instruction));

}



function needsDedicatedSauceSection(page: GoldenRecipePage): boolean {

  const title = (page.displayTitle || page.title).toLowerCase();

  if (!SAUCE_TITLE_HINT.test(title)) return false;

  const sauceIng = page.ingredients.filter((i) =>
    /sauce|dressing|glaze|dip|gravy|chimichurri|marinara/i.test(i.group || "") ||
    /mayo|vinegar|horseradish|alfredo|bbq sauce|chimichurri|marinara|gravy/i.test(i.name),
  );

  const sauceStep = page.steps.some((s) =>
    /sauce|dressing|glaze|dip|chimichurri|marinara|gravy|toss/i.test(s.title || "") ||
    /mix|whisk|stir.*(sauce|chimichurri|marinara|gravy)/i.test(s.instruction),
  );

  return sauceIng.length === 0 || !sauceStep;

}



export function auditGoldenRecipeContent(page: GoldenRecipePage): RecipeContentAuditResult {

  const issues: GoldenRecipeAuditIssue[] = [];

  let score = 100;



  const title = page.displayTitle || page.title;



  if (hasWeakTitle(title)) {

    issues.push({

      slug: page.slug,

      code: "title_too_long",

      message: "title exceeds editorial length or has ingredient spam",

      severity: "error",

    });

    score -= 25;

  }



  const titleQ = scoreRecipeTitle(title, {

    mealFormat: page.tags.find((t) => t.startsWith("format:"))?.replace("format:", ""),

    protein: page.tags.find((t) => t.startsWith("protein:"))?.replace("protein:", ""),

    cuisine: page.cuisine,

  });

  if (!titleQ.pass) {

    issues.push({

      slug: page.slug,

      code: "weak_title",

      message: titleQ.messages.join("; ") || "title quality failed",

      severity: "warn",

    });

    score -= 10;

  }



  const placeholderCount = countPlaceholderIngredients(page.ingredients);

  if (placeholderCount > 0) {

    issues.push({

      slug: page.slug,

      code: "placeholder_ingredient",

      message: `${placeholderCount} vague or placeholder ingredient(s)`,

      severity: "error",

    });

    score -= placeholderCount * 15;

  }



  for (const ing of page.ingredients) {

    if (!ing.quantity?.trim() && !ing.optional) {

      issues.push({

        slug: page.slug,

        code: "missing_quantity",

        message: `missing quantity: ${ing.name}`,

        severity: "warn",

      });

      score -= 3;

    }

  }



  if (page.steps.length < 4) {

    issues.push({

      slug: page.slug,

      code: "few_steps",

      message: "fewer than 4 instruction steps for crew cooking",

      severity: "error",

    });

    score -= 15;

  }



  if (usesGenericGrillTemplate(page.steps)) {

    issues.push({

      slug: page.slug,

      code: "generic_grill_template",

      message: "uses generic 3-step grill template (Prep grill / Grill to temp / Glaze)",

      severity: "error",

    });

    score -= 25;

  }



  let genericSteps = 0;

  for (const step of page.steps) {

    if (isBannedStepTitle(step.title || "")) {

      issues.push({

        slug: page.slug,

        code: "banned_step_title",

        message: `step ${step.stepNumber} uses template title: ${step.title}`,

        severity: "error",

      });

      score -= 20;

      genericSteps++;

    }

    if (isGenericStep(step)) {

      genericSteps++;

      issues.push({

        slug: page.slug,

        code: "vague_step",

        message: `step ${step.stepNumber} is generic or too short`,

        severity: "error",

      });

      score -= 12;

    }

    for (const pat of VAGUE_PATTERNS) {

      if (pat.test(step.instruction)) {

        issues.push({

          slug: page.slug,

          code: "vague_wording",

          message: `step ${step.stepNumber} uses vague phrasing`,

          severity: "warn",

        });

        score -= 5;

      }

    }

  }



  if (!pageHasTemperature(page)) {

    issues.push({

      slug: page.slug,

      code: "no_temperature",

      message: "no oven/grill/internal temperature cues in steps",

      severity: "error",

    });

    score -= 15;

  }



  if (!pageHasTiming(page)) {

    issues.push({

      slug: page.slug,

      code: "no_timing",

      message: "no minute ranges or step timing in instructions",

      severity: "error",

    });

    score -= 12;

  }



  if (needsDedicatedSauceSection(page)) {

    issues.push({

      slug: page.slug,

      code: "sauce_incomplete",

      message: "title promises a sauce but ingredients or steps lack sauce detail",

      severity: "error",

    });

    score -= 18;

  }



  if (page.ingredients.length < 5) {

    issues.push({

      slug: page.slug,

      code: "thin_ingredients",

      message: "fewer than 5 ingredients for a crew recipe",

      severity: "error",

    });

    score -= 15;

  }



  const titleLower = title.toLowerCase();

  if (titleLower.includes("garlic") && titleLower.includes("butter")) {

    const hasButter = page.ingredients.some((i) => /butter/i.test(i.name));

    const hasGarlic = page.ingredients.some((i) => /garlic/i.test(i.name));

    if (!hasButter || !hasGarlic) {

      issues.push({

        slug: page.slug,

        code: "sauce_missing",

        message: "title promises garlic butter but ingredients lack butter or garlic",

        severity: "error",

      });

      score -= 20;

    }

  }



  if (titleLower.includes("chili") && !page.ingredients.some((i) => /bean|tomato|chili powder/i.test(i.name))) {

    issues.push({

      slug: page.slug,

      code: "incoherent_recipe",

      message: "chili title without beans or tomato base",

      severity: "warn",

    });

    score -= 10;

  }



  const errors = issues.filter((i) => i.severity === "error");

  const needsManualReview =

    errors.length > 0 || placeholderCount > 0 || genericSteps >= 2 || score < 70;



  return {

    slug: page.slug,

    pass: errors.length === 0 && score >= 70,

    score: Math.max(0, Math.min(100, score)),

    issues,

    needsManualReview,

  };

}



export function auditIngredientList(

  ingredients: Array<{ name: string; quantity?: string; unit?: string }>,

): string[] {

  const problems: string[] = [];

  for (const ing of ingredients) {

    if (isPlaceholderIngredient(ing)) problems.push(`placeholder: ${ing.name}`);

    if (!ing.quantity?.trim()) problems.push(`no quantity: ${ing.name}`);

  }

  return problems;

}


