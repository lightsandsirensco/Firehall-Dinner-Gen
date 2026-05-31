import type { FoodImageryContext, FoodImageryPromptSpec } from "./types.js";
import { assembleEditorialPromptSpec, assembleFinalModelPrompt } from "./prompt-assembler.js";
import { resolveShotPreset } from "./shot-presets.js";
import {
  enrichImageryContextFromCategories,
  resolvePrimaryCategoryFromContext,
  categoryPromptFragments,
} from "../categories/imagery.js";
import { inferPlatingType, buildPlatingPromptLine, platingNegativeHints } from "../plating-type.js";
import { buildRequiredVisibleSidesPromptLine } from "../curated-image-governance/title-primary-side-rules.js";

const FORMAT_PLATING_HINT: Record<string, string> = {
  burger: "stacked handheld on glossy bun, visible layers",
  tacos: "street-style tacos on dark plate, charred edges",
  sandwich: "cross-section or stacked sandwich, fillings visible",
  pasta: "twirled pasta in wide bowl, restrained garnish",
  soup_chili: "deep bowl, toppings centered, steam",
  bowl: "generous bowl, distinct zones",
  grill: "protein forward on rustic platter",
  pizza: "whole pie or controlled slice pull",
  salad: "hearty bowl, protein on top",
  plated_main: "single generous plate, sides soft at edges",
};

function inferPlatingHint(mealFormat?: string, title?: string): string | undefined {
  const plating = inferPlatingType(title || "", mealFormat);
  if (title?.trim()) {
    return buildPlatingPromptLine(plating, title, "American");
  }
  const fmt = (mealFormat || "").toLowerCase().replace(/-/g, "_");
  if (FORMAT_PLATING_HINT[fmt]) return FORMAT_PLATING_HINT[fmt];
  return buildPlatingPromptLine(plating, title || "Firehall crew meal", "American");
}

function topIngredients(ctx: FoodImageryContext, limit = 8): string[] {
  const fromList = (ctx.ingredients || []).map((i) => i.name.trim()).filter(Boolean);
  if (fromList.length > 0) return fromList.slice(0, limit);
  const title = ctx.title.toLowerCase();
  const hints: string[] = [];
  if (/beef|steak|burger|chili/.test(title)) hints.push("beef");
  if (/chicken/.test(title)) hints.push("chicken");
  if (/pork|pulled/.test(title)) hints.push("pork");
  if (/cheese|cheddar|mozzarella|cotija/.test(title)) hints.push("cheese");
  if (/garlic/.test(title)) hints.push("garlic");
  if (/chimichurri|herb/.test(title)) hints.push("fresh herbs");
  return hints;
}

function textureLine(ctx: FoodImageryContext): string {
  const t = `${ctx.title} ${ctx.summary || ""}`.toLowerCase();
  const bits: string[] = [];
  if (/crispy|crunch|smash|char/.test(t)) bits.push("crispy edges");
  if (/melty|cheese|cheddar|mozzarella/.test(t)) bits.push("gooey melted cheese");
  if (/smoked|smoky|char/.test(t)) bits.push("smoke-kissed surface");
  if (/glazed|sticky|bbq|sauce/.test(t)) bits.push("controlled sauce gloss");
  if (/creamy|crema|sour cream/.test(t)) bits.push("creamy contrast");
  if (/grill|sear/.test(t)) bits.push("grill marks");
  if (/steam|hot|fresh/.test(t)) bits.push("gentle steam");
  if (/pull|stretch/.test(t)) bits.push("natural cheese stretch where appropriate");
  if (bits.length === 0) bits.push("natural moisture and appetizing texture");
  return bits.join(", ");
}

/** Structured spec — logging, cache keys, vision QA. */
export function buildFoodImageryPromptSpec(ctx: FoodImageryContext): FoodImageryPromptSpec {
  const enriched = enrichImageryContextFromCategories(ctx);
  const dish = enriched.displayTitle || enriched.title;
  const shotPreset = resolveShotPreset(enriched);
  const platingHint = inferPlatingHint(enriched.mealFormat, enriched.title);
  const platingType = inferPlatingType(enriched.title, enriched.mealFormat);
  const ingredients = topIngredients(enriched).join(", ");
  const primaryCat = enriched.categoryEnrichment.masterCategoryIds[0]
    || resolvePrimaryCategoryFromContext(enriched);
  const catFragments = categoryPromptFragments(primaryCat);

  const texture = [textureLine(enriched), enriched.categoryEnrichment.texture]
    .filter(Boolean)
    .join("; ");

  const titleSideLine = buildRequiredVisibleSidesPromptLine(enriched.title, enriched.mealFormat);

  return assembleEditorialPromptSpec({
    dishTitle: dish,
    cuisineLine: `${enriched.cuisine || "American comfort"} cuisine`,
    proteinLine: `${enriched.protein || "mixed"} protein forward`,
    ingredientLine: ingredients || undefined,
    textureLine: [texture, titleSideLine].filter(Boolean).join("; "),
    shotPreset,
    dishSpecificPlating: platingHint,
    categoryMood: enriched.categoryEnrichment.mood || catFragments.mood,
    categoryLighting: enriched.categoryEnrichment.lighting || catFragments.lighting,
    extraNegative: [
      ...(enriched.categoryEnrichment.negativeHints || []),
      ...platingNegativeHints(platingType),
      "generic chicken bowl",
      "generic rice bowl",
      "unrelated donor meal substitute",
      "missing named side dish from title",
    ],
  });
}

/** Final model prompt — always uses master style + category shot preset. */
export function buildFoodImageryPrompt(ctx: FoodImageryContext): string {
  return assembleFinalModelPrompt(buildFoodImageryPromptSpec(ctx));
}
