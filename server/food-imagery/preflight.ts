import { buildPromptForContext } from "./prompt-resolve.js";
import { hashPrompt } from "./generator.js";
import { shouldGenerateFoodImagery } from "./policy.js";
import { getFoodImageryConfig } from "./config.js";
import type { FoodImageryContext, FoodImageryPromptSpec } from "../../shared/food-imagery/types.js";
import { buildFoodImageryPromptSpec } from "../../shared/food-imagery/prompt-builder.js";
import { buildPizzaFoodImageryPromptSpec } from "../../shared/food-imagery/pizza-prompt-builder.js";
import { getPizzaConceptMeta } from "../../shared/pizza-concepts.js";
import { resolveGenerationSize } from "../../shared/food-imagery/aspect-ratio.js";
import { FOOD_IMAGERY_STYLE_VERSION } from "../../shared/food-imagery/master-style.js";
import { resolveShotPreset } from "../../shared/food-imagery/shot-presets.js";

export interface FoodImageryPreflightResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  prompt?: string;
  promptHash?: string;
  spec?: FoodImageryPromptSpec;
  styleVersion: string;
  shotPresetId: string;
  size: "1024x1024" | "512x512";
}

function resolveSpec(ctx: FoodImageryContext): FoodImageryPromptSpec {
  if (ctx.recipeKey.startsWith("pizza:") || ctx.mealFormat === "pizza") {
    const styleId = ctx.recipeKey.replace(/^pizza:/, "");
    const meta = getPizzaConceptMeta(styleId);
    if (meta) return buildPizzaFoodImageryPromptSpec(meta, ctx.title);
  }
  return buildFoodImageryPromptSpec(ctx);
}

/**
 * Pre-generation gate — policy, prompt assembly, size, style version (no API call).
 */
export function preflightFoodImagery(
  ctx: FoodImageryContext,
  options: { force?: boolean } = {},
): FoodImageryPreflightResult {
  const styleVersion = FOOD_IMAGERY_STYLE_VERSION;
  const shotPreset = resolveShotPreset(ctx);
  const size = resolveGenerationSize(ctx.mealFormat);

  if (!shouldGenerateFoodImagery(ctx, options.force)) {
    return {
      ok: true,
      skipped: true,
      reason: "policy_skip",
      styleVersion,
      shotPresetId: shotPreset.id,
      size,
    };
  }

  const cfg = getFoodImageryConfig();
  if (!cfg.enabled && !options.force) {
    return {
      ok: false,
      skipped: true,
      reason: "disabled",
      styleVersion,
      shotPresetId: shotPreset.id,
      size,
    };
  }

  if (!ctx.title?.trim()) {
    return {
      ok: false,
      reason: "missing_title",
      styleVersion,
      shotPresetId: shotPreset.id,
      size,
    };
  }

  const spec = resolveSpec(ctx);
  const prompt = buildPromptForContext(ctx);
  const promptHash = hashPrompt(prompt);

  if (!prompt.includes(styleVersion)) {
    return {
      ok: false,
      reason: "style_version_not_embedded",
      styleVersion,
      shotPresetId: shotPreset.id,
      size,
    };
  }

  return {
    ok: true,
    prompt,
    promptHash,
    spec,
    styleVersion,
    shotPresetId: shotPreset.id,
    size,
  };
}
