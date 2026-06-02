/**
 * Validates a single generator pipeline hit for production stress testing.
 */

import fs from "node:fs";
import path from "node:path";
import type { GenerateResponse } from "../schema.js";
import { isApprovedCatalogSlug, resolveCatalogHeroPath } from "../hall-catalog/gate.js";
import { heroPathConflictsTitle } from "../meal-image-title-match.js";
import { isGenericStep, isPlaceholderIngredient } from "../golden-100/recipe-quality/placeholders.js";
import { getRecipeBaseServings } from "../recipe/crew-scaling-config.js";
import { scaleGoldenIngredients } from "../golden-100/recipe-quality/crew-scale.js";
import type { GoldenRecipePageIngredient } from "../golden-100/recipe-page-schema.js";
import { CREW_SIZE_OPTIONS } from "../recipe/crew-scaling-config.js";

const PLACEHOLDER_COPY =
  /\b(lorem ipsum|placeholder|coming soon|tbd|todo:|\[insert|xxx)\b/i;

export interface GeneratorStressIssue {
  code: string;
  message: string;
}

export interface GeneratorStressValidation {
  ok: boolean;
  issues: GeneratorStressIssue[];
  slug?: string;
  heroPath?: string;
  heroExists: boolean;
  imageConflict: boolean;
  pageJsonFound: boolean;
  nutritionOk: boolean;
  scalingOk: boolean;
}

function readPageNutrition(pagePath: string): {
  calories: number;
  protein: number;
  estimateAvailable: boolean;
} | null {
  try {
    const page = JSON.parse(fs.readFileSync(pagePath, "utf8")) as {
      nutrition?: { calories?: number; protein?: number; estimateAvailable?: boolean; source?: string };
      calories?: number;
      protein?: number;
    };
    const n = page.nutrition;
    const estimateAvailable =
      n?.estimateAvailable !== false && n?.source !== "unavailable";
    const calories = Number(n?.calories ?? page.calories ?? 0);
    const protein = Number(n?.protein ?? page.protein ?? 0);
    if (calories > 0 && protein > 0) {
      return { calories, protein, estimateAvailable };
    }
    if (!estimateAvailable) {
      return { calories: 0, protein: 0, estimateAvailable: false };
    }
    return null;
  } catch {
    return null;
  }
}

function resolvePageJson(publicRoot: string, slug: string): string | null {
  const candidates = [
    `catalog/golden-100/pages/${slug}.json`,
    `catalog/performance-meals/pages/${slug}.json`,
    `catalog/hall-expansion/pages/${slug}.json`,
    `catalog/breakfast/pages/${slug}.json`,
    `catalog/bbq/pages/${slug}.json`,
    `catalog/pizza-night/pages/${slug}.json`,
  ];
  for (const rel of candidates) {
    const abs = path.join(publicRoot, rel);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function stepText(recipe: GenerateResponse): string {
  return (recipe.steps ?? [])
    .map((s) => `${s.heading} ${s.body}`)
    .join("\n")
    .toLowerCase();
}

function validateRecipeQuality(recipe: GenerateResponse): GeneratorStressIssue[] {
  const issues: GeneratorStressIssue[] = [];
  const blob = [
    recipe.title,
    recipe.why_it_fits_tonight,
    recipe.cleanup_tip,
    ...recipe.ingredients.map((i) => `${i.item} ${i.amount}`),
    ...recipe.steps.map((s) => `${s.heading} ${s.body}`),
  ].join("\n");

  if (PLACEHOLDER_COPY.test(blob)) {
    issues.push({ code: "placeholder_copy", message: "Placeholder or filler copy detected" });
  }

  for (const step of recipe.steps ?? []) {
    if (!step.body?.trim() || step.body.trim().length < 12) {
      issues.push({ code: "blank_step", message: `Empty or tiny step: ${step.heading}` });
    }
    if (isGenericStep({ title: step.heading, instruction: step.body ?? "" })) {
      issues.push({ code: "vague_step", message: `Vague step: ${step.heading}` });
    }
    if (/\bcook until done\b/i.test(step.body) && !/\d+\s*°\s*f/i.test(step.body)) {
      issues.push({ code: "vague_temperature", message: `“Cook until done” without temp: ${step.heading}` });
    }
  }

  const st = stepText(recipe);
  for (const ing of recipe.ingredients ?? []) {
    const name = ing.item?.trim();
    if (!name) continue;
    if (isPlaceholderIngredient({ name, quantity: ing.amount })) {
      issues.push({ code: "placeholder_ingredient", message: `Placeholder ingredient: ${name}` });
    }
    const core = name.toLowerCase().replace(/\([^)]*\)/g, "").trim();
    if (core.length > 4 && !/^(salt|pepper|oil|water)$/i.test(core)) {
      const words = core.split(/\s+/).filter((w) => w.length > 3);
      const head = words[words.length - 1] || core;
      if (!st.includes(core) && !st.includes(head)) {
        issues.push({ code: "ingredient_unused", message: `Ingredient not referenced in steps: ${name}` });
      }
    }
  }

  return issues;
}

export function validateScalingOnPage(
  pagePath: string,
  crewSizes: readonly number[] = CREW_SIZE_OPTIONS,
): { ok: boolean; message?: string } {
  const page = JSON.parse(fs.readFileSync(pagePath, "utf8")) as {
    ingredients?: GoldenRecipePageIngredient[];
    nutrition?: { calories?: number; protein?: number };
    calories?: number;
    protein?: number;
    baseServings?: number;
    crewSize?: number;
  };
  const ingredients = page.ingredients ?? [];
  if (!ingredients.length) return { ok: true };

  const base = getRecipeBaseServings(page);
  const storedCal =
    Number(page.nutrition?.calories ?? page.calories ?? 0) ||
    0;
  const storedProtein = Number(page.nutrition?.protein ?? page.protein ?? 0) || 0;

  let prevQty: string | null = null;
  for (const crew of crewSizes) {
    const scaled = scaleGoldenIngredients(ingredients, base, crew as (typeof CREW_SIZE_OPTIONS)[number]);
    const first = scaled.find((i) => parseFloat(i.quantity || "0") > 0);
    if (!first) continue;
    const qty = `${first.quantity} ${first.unit || ""}`.trim();
    if (prevQty && crew > base && qty === prevQty && parseFloat(first.quantity || "0") <= 1) {
      return { ok: false, message: `Scaling flat at crew ${crew} for ${first.name}` };
    }
    prevQty = qty;
  }

  void storedCal;
  void storedProtein;
  return { ok: true };
}

export function validateGeneratorHit(input: {
  recipe: GenerateResponse;
  slug?: string;
  publicRoot: string;
}): GeneratorStressValidation {
  const issues: GeneratorStressIssue[] = [];
  const { recipe, slug } = input;

  if (!recipe.title?.trim()) {
    issues.push({ code: "missing_recipe", message: "Missing title" });
  }
  if (!recipe.ingredients?.length) {
    issues.push({ code: "missing_ingredients", message: "No ingredients" });
  }
  if (!recipe.steps?.length) {
    issues.push({ code: "missing_steps", message: "No instructions" });
  }

  let nutritionOk =
    Boolean(recipe.macros_per_serving) &&
    Number(recipe.macros_per_serving.calories) > 0 &&
    Number(recipe.macros_per_serving.protein_g) > 0;

  issues.push(...validateRecipeQuality(recipe));

  let heroPath: string | undefined;
  let heroExists = false;
  let imageConflict = false;
  let pageJsonFound = false;
  let scalingOk = true;

  if (slug && isApprovedCatalogSlug(slug)) {
    heroPath = resolveCatalogHeroPath(slug);
    const absHero = path.join(input.publicRoot, heroPath.replace(/^\//, ""));
    heroExists = fs.existsSync(absHero);
    if (!heroExists) {
      issues.push({ code: "missing_hero", message: `Hero file missing: ${heroPath}` });
    }
    imageConflict = heroPathConflictsTitle(heroPath, recipe.title, recipe.meal_style);
    if (imageConflict) {
      issues.push({ code: "image_title_conflict", message: `Hero may not match title: ${heroPath}` });
    }

    const pagePath = resolvePageJson(input.publicRoot, slug);
    if (pagePath) {
      pageJsonFound = true;
      const pageNutrition = readPageNutrition(pagePath);
      if (!nutritionOk && pageNutrition) {
        if (pageNutrition.estimateAvailable && pageNutrition.calories > 0) {
          nutritionOk = true;
        } else if (!pageNutrition.estimateAvailable) {
          nutritionOk = true;
          issues.push({
            code: "nutrition_withheld",
            message: "Per-serving estimate withheld on catalog page (acceptable)",
          });
        }
      }
      const scaleResult = validateScalingOnPage(pagePath);
      scalingOk = scaleResult.ok;
      if (!scalingOk && scaleResult.message) {
        issues.push({ code: "scaling_issue", message: scaleResult.message });
      }
    } else {
      issues.push({ code: "missing_page_json", message: `No catalog page JSON for ${slug}` });
    }
  } else if (slug) {
    issues.push({ code: "unknown_slug", message: `Slug not in approved catalog: ${slug}` });
  }

  if (!nutritionOk) {
    issues.push({ code: "missing_nutrition", message: "Missing or zero per-serving nutrition" });
  }

  const critical = new Set([
    "missing_recipe",
    "missing_ingredients",
    "missing_steps",
    "missing_nutrition",
    "missing_hero",
    "missing_page_json",
    "placeholder_copy",
    "blank_step",
    "scaling_issue",
  ]);

  const ok = issues.filter((i) => critical.has(i.code)).length === 0;

  return {
    ok,
    issues,
    slug,
    heroPath,
    heroExists,
    imageConflict,
    pageJsonFound,
    nutritionOk,
    scalingOk,
  };
}

export function buildAnalyticsPayload(input: {
  sessionId: string;
  slug: string;
  title: string;
  category: string;
  crewSize: number;
  protein: string;
}): Record<string, string | number> {
  return {
    recipe_slug: input.slug,
    recipe_title: input.title,
    meal_category: input.category,
    crew_size: input.crewSize,
    protein: input.protein,
    session_id: input.sessionId,
  };
}

export function analyticsPayloadComplete(payload: Record<string, string | number>): boolean {
  return (
    Boolean(payload.recipe_slug) &&
    Boolean(payload.recipe_title) &&
    Boolean(payload.meal_category) &&
    payload.crew_size != null &&
    Boolean(payload.session_id)
  );
}
