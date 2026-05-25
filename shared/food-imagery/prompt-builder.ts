import { FIREHALL_FOOD_BRAND, FIREHALL_NEGATIVE_PROMPT } from "./brand-style.js";
import type { FoodImageryContext, FoodImageryPromptSpec } from "./types.js";

const FORMAT_PLATING: Record<string, string> = {
  burger: "stacked handheld on glossy bun, visible layers, melty cheese pull optional",
  tacos: "street-style tacos on dark plate, charred tortillas, vibrant garnishes visible",
  sandwich: "cross-section or stacked sandwich with toasted bread, fillings visible",
  pasta: "twirled pasta in wide bowl, steam, parmesan and herbs",
  soup_chili: "deep bowl ladle-ready, toppings visible, steam rising",
  bowl: "overhead 3/4 bowl composition, distinct protein and grain zones",
  grill: "grill marks on protein, rustic platter",
  pizza: "whole pie or dramatic slice pull, blistered crust",
  salad: "abundant bowl, grilled protein on top, not sparse café salad",
  plated_main: "generous plated main with sides implied at edges",
};

function inferPlating(mealFormat?: string, title?: string): string {
  const fmt = (mealFormat || "").toLowerCase();
  if (FORMAT_PLATING[fmt]) return FORMAT_PLATING[fmt];
  const t = (title || "").toLowerCase();
  if (/burger|smash/.test(t)) return FORMAT_PLATING.burger;
  if (/taco/.test(t)) return FORMAT_PLATING.tacos;
  if (/chili|soup|stew/.test(t)) return FORMAT_PLATING.soup_chili;
  if (/pasta|parm|spaghetti/.test(t)) return FORMAT_PLATING.pasta;
  if (/pizza/.test(t)) return FORMAT_PLATING.pizza;
  return FORMAT_PLATING.plated_main;
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
  if (/crispy|crunch|smash|char/.test(t)) bits.push("crispy edges and audible crunch cues");
  if (/melty|cheese|cheddar|mozzarella/.test(t)) bits.push("gooey melted cheese");
  if (/smoked|smoky|char/.test(t)) bits.push("smoke-kissed surface");
  if (/glazed|sticky|bbq|sauce/.test(t)) bits.push("glossy sauce highlights");
  if (/creamy|crema|sour cream/.test(t)) bits.push("creamy cool contrast");
  if (/grill|char|sear/.test(t)) bits.push("visible grill marks and char");
  if (/steam|hot|fresh/.test(t)) bits.push("gentle steam and heat shimmer");
  if (/glaze|sauce|sticky/.test(t)) bits.push("glossy sauce catching light");
  if (/pull|stretch/.test(t)) bits.push("cheese pull or stretch moment");
  if (bits.length === 0) bits.push("appetizing natural textures, realistic moisture");
  return bits.join(", ");
}

/** Structured prompt spec for logging, caching, and vision validation. */
export function buildFoodImageryPromptSpec(ctx: FoodImageryContext): FoodImageryPromptSpec {
  const dish = ctx.displayTitle || ctx.title;
  const cuisine = ctx.cuisine || "American comfort";
  const protein = ctx.protein || "mixed";
  const plating = inferPlating(ctx.mealFormat, ctx.title);
  const ingredients = topIngredients(ctx).join(", ");
  const textures = textureLine(ctx);

  const positive = [
    `Professional cinematic food photograph of "${dish}"`,
    `${cuisine} cuisine, ${protein} forward`,
    `Plating: ${plating}`,
    ingredients ? `Visible ingredients: ${ingredients}` : "",
    `Textures: ${textures}`,
    FIREHALL_FOOD_BRAND.lighting,
    FIREHALL_FOOD_BRAND.camera,
    FIREHALL_FOOD_BRAND.background,
    FIREHALL_FOOD_BRAND.mood,
    FIREHALL_FOOD_BRAND.realism,
    FIREHALL_FOOD_BRAND.colorGrade,
    "TikTok-worthy craveable hero shot, emotionally indulgent, social-media food media quality",
    "Center-weighted subject with safe margins for vertical mobile crop",
    "No text, no logos, no people, no hands",
  ]
    .filter(Boolean)
    .join(". ");

  return {
    positive,
    negative: FIREHALL_NEGATIVE_PROMPT,
    styleTags: ["cinematic", "comfort food", "firehall", "editorial", "realistic"],
    composition: "center-weighted hero, shallow depth of field, mobile-safe crop",
    lighting: FIREHALL_FOOD_BRAND.lighting,
    camera: FIREHALL_FOOD_BRAND.camera,
    mood: FIREHALL_FOOD_BRAND.mood,
  };
}

/** Final model prompt (positive + negative guard). */
export function buildFoodImageryPrompt(ctx: FoodImageryContext): string {
  const spec = buildFoodImageryPromptSpec(ctx);
  return `${spec.positive} Avoid: ${spec.negative}.`;
}
