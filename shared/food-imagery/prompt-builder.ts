import type { FoodImageryContext, FoodImageryPromptSpec } from "./types.js";
import { assembleEditorialPromptSpec, assembleFinalModelPrompt } from "./prompt-assembler.js";
import { resolveShotPreset } from "./shot-presets.js";

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
  const fmt = (mealFormat || "").toLowerCase().replace(/-/g, "_");
  if (FORMAT_PLATING_HINT[fmt]) return FORMAT_PLATING_HINT[fmt];
  const t = (title || "").toLowerCase();
  if (/burger|smash/.test(t)) return FORMAT_PLATING_HINT.burger;
  if (/taco/.test(t)) return FORMAT_PLATING_HINT.tacos;
  if (/pasta/.test(t)) return FORMAT_PLATING_HINT.pasta;
  if (/pizza/.test(t)) return FORMAT_PLATING_HINT.pizza;
  return undefined;
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
  if (/pull|stretch/.test(t)) bits.push("cheese pull moment");
  if (bits.length === 0) bits.push("natural moisture and appetizing texture");
  return bits.join(", ");
}

/** Structured spec — logging, cache keys, vision QA. */
export function buildFoodImageryPromptSpec(ctx: FoodImageryContext): FoodImageryPromptSpec {
  const dish = ctx.displayTitle || ctx.title;
  const shotPreset = resolveShotPreset(ctx);
  const platingHint = inferPlatingHint(ctx.mealFormat, ctx.title);
  const ingredients = topIngredients(ctx).join(", ");

  return assembleEditorialPromptSpec({
    dishTitle: dish,
    cuisineLine: `${ctx.cuisine || "American comfort"} cuisine`,
    proteinLine: `${ctx.protein || "mixed"} protein forward`,
    ingredientLine: ingredients || undefined,
    textureLine: textureLine(ctx),
    shotPreset,
    dishSpecificPlating: platingHint,
  });
}

/** Final model prompt — always uses master style + category shot preset. */
export function buildFoodImageryPrompt(ctx: FoodImageryContext): string {
  return assembleFinalModelPrompt(buildFoodImageryPromptSpec(ctx));
}
