/**
 * Server-side generation reliability — metrics, client send gate, pre-validation prep.
 */

import type { GenerateResponse } from "@shared/schema";
import type { ValidationResult } from "./validateRecipe.js";
import type { RecipeQualityResult } from "../shared/recipe-quality-gate.js";
import {
  GENERATION_USER_FAILURE_MESSAGE,
  isMinimumViableRecipe,
  isRoboticTitle,
  suggestHumanMealTitle,
} from "../shared/generation-reliability.js";
import { scoreRecipeTitle } from "../shared/recipe-title-quality.js";
import { normalizeGenerateResponse } from "../shared/recipe/normalize.js";
import { requiresRealismFirewall } from "../shared/meal-realism-firewall.js";
import { realismFirewallBlocksSend } from "./generation/realism-firewall.js";
import { log } from "./logger.js";

export {
  GENERATION_USER_RETRY_MESSAGE,
  GENERATION_USER_FAILURE_MESSAGE,
  GENERATION_GAME_DAY_MESSAGE,
  GENERATION_GAME_DAY_EMPTY_MESSAGE,
} from "../shared/generation-reliability.js";

export type ReliabilityEvent =
  | "validation_retry"
  | "blocked_client_send"
  | "curated_fallback"
  | "hero_enrichment_failed"
  | "title_repaired"
  | "ingredients_used_filled"
  | "large_crew_path"
  | "realism_rejected";

const metrics: Record<string, number> = {
  validation_retry: 0,
  blocked_client_send: 0,
  curated_fallback: 0,
  hero_enrichment_failed: 0,
  title_repaired: 0,
  ingredients_used_filled: 0,
  large_crew_path: 0,
  realism_rejected: 0,
};

export function recordReliabilityEvent(event: ReliabilityEvent, detail?: string): void {
  metrics[event] = (metrics[event] || 0) + 1;
  log(`[reliability] ${event}${detail ? ` ${detail}` : ""} count=${metrics[event]}`, "generate");
}

export function getReliabilityMetrics(): Readonly<Record<string, number>> {
  return { ...metrics };
}

export class RecipeNotSendableError extends Error {
  readonly reasons: string[];
  constructor(reasons: string[]) {
    super("recipe_not_sendable");
    this.name = "RecipeNotSendableError";
    this.reasons = reasons;
  }
}

/** Normalize recipe shape before schema/validator passes. */
export function prepareRecipePreValidation(recipe: GenerateResponse): GenerateResponse {
  const { recipe: out, repairs } = normalizeGenerateResponse(recipe, {
    mealFormat: recipe.meal_style,
    protein: recipe.chosen_protein,
    cuisine: recipe.tags?.cuisine,
  });
  if (repairs.includes("ingredients_used_filled")) {
    recordReliabilityEvent("ingredients_used_filled");
  }
  if (repairs.some((r) => r.includes("title"))) {
    recordReliabilityEvent("title_repaired", `"${out.title}"`);
  }
  return out;
}

export function isLargeCrewGeneration(crewSize: number | undefined): boolean {
  return (crewSize ?? 0) >= 10;
}

export interface ClientSendGateInput {
  validation: ValidationResult;
  recipe: GenerateResponse;
  quality: RecipeQualityResult;
  extras: Record<string, unknown>;
}

export function evaluateClientSendGate(input: ClientSendGateInput): {
  sendable: boolean;
  reasons: string[];
} {
  const { validation, recipe, quality, extras } = input;
  const reasons: string[] = [];
  const imported =
    extras._source === "spoonacular_v2" ||
    extras._source === "spoonacular_v2_relaxed" ||
    extras._source === "catalog" ||
    extras._source === "catalog_relaxed" ||
    extras._source === "session_cache" ||
    extras._source === "curated_fallback" ||
    extras._source === "curated_editorial" ||
    extras._source === "golden_100" ||
    extras._source === "emergency_pool";

  if (!validation.ok) {
    if (!imported) reasons.push("validation_failed");
    else if (quality.score < 48) reasons.push("validation_failed");
  }
  if (isRoboticTitle(recipe.title || "")) reasons.push("robotic_title");
  const titleQ = scoreRecipeTitle(recipe.title || "", {
    mealFormat: recipe.meal_style,
    protein: recipe.chosen_protein,
    ingredients: recipe.ingredients,
    cuisine: recipe.tags?.cuisine,
  });
  if (!titleQ.pass) reasons.push(`title_quality:${titleQ.score}`);
  if (!isMinimumViableRecipe(recipe)) reasons.push("minimum_shape");

  const blockingQuality = quality.issues.filter((i) =>
    ["title_taco_no_tortilla", "format_taco_no_tortilla", "taco_with_rice", "title_ingredient_mismatch"].includes(i),
  );
  if (blockingQuality.length > 0) reasons.push(`quality:${blockingQuality.join(",")}`);
  if (!quality.pass && !imported && quality.score < 55) reasons.push("quality_low");

  const source = String(extras._source || "");
  if (requiresRealismFirewall(source, extras)) {
    const fw = realismFirewallBlocksSend(recipe, extras);
    if (fw.blocked) {
      reasons.push(...fw.reasons);
      if (fw.result?.logTags.length) {
        reasons.push(...fw.result.logTags);
      }
    }
  }

  const curatedOk =
    extras._source === "curated_fallback" ||
    extras._source === "curated_editorial" ||
    extras._source === "golden_100" ||
    extras._source === "emergency_pool" ||
    extras._fallback === true;
  const realismBlocked = reasons.some(
    (r) => r.startsWith("realism_firewall:") || r.startsWith("[rejected:"),
  );

  const sendable =
    curatedOk ||
    (!realismBlocked &&
      reasons.length === 0 &&
      (quality.pass || (imported && quality.score >= 50)));

  return { sendable, reasons };
}
