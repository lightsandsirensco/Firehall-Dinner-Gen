import { FIREHALL_FOOD_BRAND, FIREHALL_NEGATIVE_PROMPT } from "./brand-style.js";
import type { FoodImageryContext, FoodImageryPromptSpec } from "./types.js";
import type { PizzaConceptMeta } from "../pizza-concepts.js";

const PIZZA_TEXTURE_CUES: Record<string, string> = {
  pepperoni: "cupped crispy pepperoni edges, glistening oil, blistered cheese",
  honey: "hot honey drizzle catching light, golden pools on cheese",
  bbq: "glossy BBQ chicken, caramelized onion, melted cheese strands",
  buffalo: "orange buffalo sauce sheen, ranch drizzle, charred crust rim",
  white: "creamy white sauce base, roasted garlic spots, golden cheese",
  dessert: "melting chocolate-hazelnut, powdered sugar, warm dough",
  veggie: "roasted vegetables, olive oil gloss, fresh basil post-bake",
};

function pizzaTextureLine(meta: PizzaConceptMeta, title: string): string {
  const t = `${title} ${meta.sauceStyle} ${meta.crust}`.toLowerCase();
  const bits: string[] = [
    "bubbling mozzarella with stretch and golden blisters",
    "charred leopard-spot crust rim, wood-fired texture",
    "steam rising from fresh-from-oven pie",
  ];
  if (/pepperoni|soppressata|meat/.test(t)) bits.push(PIZZA_TEXTURE_CUES.pepperoni);
  if (/honey/.test(t)) bits.push(PIZZA_TEXTURE_CUES.honey);
  if (/bbq|brisket/.test(t)) bits.push(PIZZA_TEXTURE_CUES.bbq);
  if (/buffalo|nashville|jalapeño/.test(t)) bits.push(PIZZA_TEXTURE_CUES.buffalo);
  if (/white|alfredo|garlic parm|ricotta|mac/.test(t)) bits.push(PIZZA_TEXTURE_CUES.white);
  if (/nutella|dessert/.test(t)) bits.push(PIZZA_TEXTURE_CUES.dessert);
  if (/veggie|mediterranean|spinach/.test(t)) bits.push(PIZZA_TEXTURE_CUES.veggie);
  return bits.join(", ");
}

export function buildPizzaImageryContext(
  meta: PizzaConceptMeta,
  title?: string,
): FoodImageryContext {
  return {
    recipeKey: `pizza:${meta.id}`,
    title: title || meta.title,
    displayTitle: title || meta.title,
    summary: `${meta.crust} crust, ${meta.sauceStyle} sauce, ${meta.recommendedSides.join(", ")}`,
    cuisine: meta.category === "international" ? "International" : "Italian-American",
    mealFormat: "pizza",
    protein: /chicken/.test(meta.title) ? "chicken" : /beef|steak|brisket/.test(meta.title) ? "beef" : "mixed",
    ingredients: [
      { name: meta.sauceStyle, role: "sauce" },
      { name: meta.crust, role: "starch" },
      ...meta.optionalToppings.slice(0, 4).map((t) => ({ name: t, role: "garnish" as const })),
    ],
    tags: meta.badges,
    sourceKind: "hall_classic",
  };
}

export function buildPizzaFoodImageryPromptSpec(
  meta: PizzaConceptMeta,
  title?: string,
): FoodImageryPromptSpec {
  const dish = title || meta.title;
  const textures = pizzaTextureLine(meta, dish);

  const positive = [
    `Professional cinematic food photograph of "${dish}" pizza`,
    `Restaurant-quality whole pizza or dramatic slice pull on dark surface`,
    `Crust: ${meta.crust} with visible char and blistered edges`,
    `Sauce style: ${meta.sauceStyle}`,
    `Textures: ${textures}`,
    meta.optionalToppings.length
      ? `Garnish cues: ${meta.optionalToppings.slice(0, 5).join(", ")}`
      : "",
    FIREHALL_FOOD_BRAND.lighting,
    "45-degree hero angle, center-weighted for mobile crop, shallow depth of field",
    FIREHALL_FOOD_BRAND.background,
    "Indulgent pizza-night energy, TikTok food creator quality, Half Baked Harvest editorial warmth",
    FIREHALL_FOOD_BRAND.realism,
    "No text, no logos, no pizza box branding, no hands, no utensils",
  ]
    .filter(Boolean)
    .join(". ");

  return {
    positive,
    negative: `${FIREHALL_NEGATIVE_PROMPT}, flat overhead only, frozen pizza box look`,
    styleTags: ["pizza", "cinematic", "firehall", "wood-fired", "realistic"],
    composition: "center-weighted whole pie, mobile-safe crop",
    lighting: FIREHALL_FOOD_BRAND.lighting,
    camera: "45-degree close hero, shallow depth of field",
    mood: "craveable pizza night, premium comfort",
  };
}

export function buildPizzaFoodImageryPrompt(meta: PizzaConceptMeta, title?: string): string {
  const spec = buildPizzaFoodImageryPromptSpec(meta, title);
  return `${spec.positive} Avoid: ${spec.negative}.`;
}
