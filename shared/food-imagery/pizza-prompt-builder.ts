import type { FoodImageryContext, FoodImageryPromptSpec } from "./types.js";
import type { PizzaConceptMeta } from "../pizza-concepts.js";
import { assembleEditorialPromptSpec, assembleFinalModelPrompt } from "./prompt-assembler.js";
import { PIZZA_SHOT_PRESET } from "./shot-presets.js";

const PIZZA_TEXTURE_CUES: Record<string, string> = {
  pepperoni: "cupped crispy pepperoni, glistening oil",
  honey: "hot honey drizzle catching warm light",
  bbq: "glossy BBQ chicken, caramelized onion",
  buffalo: "buffalo sauce sheen, controlled ranch drizzle",
  white: "creamy white base, roasted garlic spots",
  dessert: "melting chocolate-hazelnut, powdered sugar",
  veggie: "roasted vegetables, olive oil gloss, basil post-bake",
};

function pizzaTextureLine(meta: PizzaConceptMeta, title: string): string {
  const t = `${title} ${meta.sauceStyle} ${meta.crust}`.toLowerCase();
  const bits: string[] = [
    "bubbling mozzarella with golden blisters",
    "charred leopard-spot crust rim",
    "gentle oven steam",
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
    summary: `${meta.crust} crust, ${meta.sauceStyle} sauce`,
    cuisine: meta.category === "international" ? "Italian-American" : "Italian-American",
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

  return assembleEditorialPromptSpec({
    dishTitle: `${dish} pizza`,
    cuisineLine: "Italian-American pizza night",
    proteinLine: "toppings and cheese forward",
    ingredientLine: [
      meta.sauceStyle,
      meta.crust,
      ...meta.optionalToppings.slice(0, 5),
    ].join(", "),
    textureLine: pizzaTextureLine(meta, dish),
    shotPreset: PIZZA_SHOT_PRESET,
    dishSpecificPlating: `crust ${meta.crust}, sauce ${meta.sauceStyle}`,
    extraNegative: ["frozen pizza box look", "delivery box branding", "flat overhead only"],
  });
}

export function buildPizzaFoodImageryPrompt(meta: PizzaConceptMeta, title?: string): string {
  return assembleFinalModelPrompt(buildPizzaFoodImageryPromptSpec(meta, title));
}
