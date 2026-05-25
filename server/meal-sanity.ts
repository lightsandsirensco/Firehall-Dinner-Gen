/**
 * Production sanity checks: semantics gate, step coverage, macro honesty.
 */

import type { GenerateResponse, RecipeStep } from "../shared/schema";
import { isSeasoningOrGarnish } from "../shared/meal-semantics";
import { validateMealSemantics } from "./meal-validation";
import type { MealValidationContext } from "./meal-validation";
import { log } from "./index";
import {
  buildStationSideStep,
  polishFirehallSteps,
  scoreHallRealism,
} from "@shared/firehall-instruction-voice";

const STATION_NOTE = /station side|hall side|hall base|hall extra|plate_role/i;

export function semanticsBlocksServe(issues: string[], repairs: string[] = []): boolean {
  const critical = issues.some((i) => i.startsWith("critical:") || i.startsWith("missing_required:"));
  const unrepaired = repairs.some((r) => r.startsWith("unrepaired:"));
  return critical || unrepaired;
}

export function assertMealSemanticsOrLog(
  recipe: GenerateResponse,
  ctx: MealValidationContext,
  repairs: string[] = [],
): GenerateResponse {
  const { issues, ok } = validateMealSemantics(recipe, ctx);
  if (!ok || semanticsBlocksServe(issues, repairs)) {
    log(
      `[meal-sanity] Unresolved semantics for "${recipe.title}": issues=[${issues.join("; ")}] repairs=[${repairs.join("; ")}]`,
      "validate",
    );
  }
  return recipe;
}

/** Station-side ingredients should appear in at least one step. */
export function syncStationSidesToSteps(recipe: GenerateResponse): { recipe: GenerateResponse; fixes: string[] } {
  const fixes: string[] = [];
  let stepsStr = (recipe.steps || []).map((s) => `${s.heading} ${s.body}`).join(" ").toLowerCase();

  for (const ing of recipe.ingredients || []) {
    if (!STATION_NOTE.test(ing.notes || "")) continue;
    if (isSeasoningOrGarnish(ing.item)) continue;

    const words = ing.item.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const probe = words.slice(0, 2).join("|") || ing.item.split(" ")[0];
    if (!probe || new RegExp(probe, "i").test(stepsStr)) continue;

    const sideStep = buildStationSideStep(ing.item);
    const step: RecipeStep = sideStep;
    recipe.steps = [...(recipe.steps || []), step];
    fixes.push(`sync_step:${ing.item}`);
    stepsStr += ` ${step.heading} ${step.body}`.toLowerCase();
  }

  if (fixes.length > 0) {
    log(`[meal-sanity] "${recipe.title}" — added ${fixes.length} side step(s)`, "validate");
  }
  return { recipe, fixes };
}

/** Bump macros heuristically when sides were composed after Spoonacular fetch. */
export function adjustMacrosAfterCompose(
  recipe: GenerateResponse,
  composeFixCount: number,
): GenerateResponse {
  if (composeFixCount <= 0 || !recipe.macros_per_serving) return recipe;

  const m = { ...recipe.macros_per_serving };
  const starchAdds = (recipe.ingredients || []).filter((i) =>
    STATION_NOTE.test(i.notes || "") && /\b(rice|potato|pasta|macaroni|bread|naan|fries|quinoa)\b/i.test(i.item),
  ).length;

  if (starchAdds > 0) {
    m.calories = Math.round((m.calories || 400) * 1.08 + starchAdds * 35);
    m.carbs_g = Math.round((m.carbs_g || 30) * 1.12 + starchAdds * 12);
    m.fat_g = Math.round((m.fat_g || 15) + starchAdds * 3);
  }

  return {
    ...recipe,
    macros_per_serving: m,
    tags: {
      ...(recipe.tags || {}),
      macros_estimated: true,
    } as GenerateResponse["tags"],
  };
}

function ingredientDedupeKey(item: string): string {
  return item.toLowerCase().replace(/[^a-z0-9]/g, "").trim().slice(0, 48);
}

/** Collapse exact duplicate plate lines (common after double-compose). */
export function dedupePlateIngredients(recipe: GenerateResponse): { recipe: GenerateResponse; removed: number } {
  const seen = new Set<string>();
  const out: typeof recipe.ingredients = [];
  let removed = 0;

  for (const ing of recipe.ingredients || []) {
    if (isSeasoningOrGarnish(ing.item, ing.notes)) {
      out.push(ing);
      continue;
    }
    const key = ingredientDedupeKey(ing.item);
    if (!key || seen.has(key)) {
      if (key) removed++;
      continue;
    }
    seen.add(key);
    out.push(ing);
  }

  if (removed > 0) {
    log(`[meal-sanity] "${recipe.title}" — removed ${removed} duplicate ingredient line(s)`, "validate");
  }
  return { recipe: { ...recipe, ingredients: out }, removed };
}

/** Strip filler, dedupe steps, log low hall-realism scores. */
export function applyHallInstructionPolish(recipe: GenerateResponse): GenerateResponse {
  const steps = polishFirehallSteps(recipe.steps || []);
  const realism = scoreHallRealism(
    recipe.title || "",
    steps,
    (recipe.ingredients || []).map((i) => ({ item: i.item })),
  );
  if (realism.score < 6) {
    log(
      `[hall-voice] Low realism ${realism.score}/10 for "${recipe.title}" issues=[${realism.issues.join(", ")}]`,
      "validate",
    );
  }
  return { ...recipe, steps };
}

export function scorePlateTrust(recipe: GenerateResponse): number {
  let score = 0;
  const ings = recipe.ingredients || [];
  const steps = recipe.steps || [];
  if (ings.length >= 5) score += 2;
  if (steps.length >= 4) score += 2;
  if (ings.some((i) => STATION_NOTE.test(i.notes || ""))) score += 2;
  if ((recipe as GenerateResponse & { meal_plate?: unknown }).meal_plate) score += 1;
  if ((recipe.steps || []).some((s) => /internal|165|145|160|safe/i.test(s.body))) score += 1;
  return Math.min(10, score);
}
