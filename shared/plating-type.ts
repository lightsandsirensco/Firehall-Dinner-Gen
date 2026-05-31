/**
 * Plating identity — strict meal format / vessel for image generation and validation.
 */

import { normalizeFormatKey } from "./meal-format-contract.js";

export type PlatingType =
  | "bowl"
  | "sandwich"
  | "skillet"
  | "tray"
  | "taco"
  | "wrap"
  | "pasta"
  | "soup"
  | "burger"
  | "rice_plate"
  | "plated"
  | "casserole"
  | "pizza"
  | "salad";

const BOWL_TITLE =
  /\b(bowls?|rice bowl|grain bowl|bibimbap|poke bowl|noodle bowl|power bowl)\b/i;
const WRAP_TITLE =
  /\b(lettuce cups?|lettuce wraps?|wrap night|wraps?\s+with|in lettuce|served in lettuce)\b/i;
const TACO_TITLE = /\b(tacos?|fajitas?|nachos?|quesadillas?|enchiladas?|burritos?)\b/i;
const BURGER_TITLE = /\b(burgers?|smash burger|cheeseburger|sliders?)\b/i;
const PASTA_TITLE = /\b(pasta|spaghetti|penne|rigatoni|lasagna|ziti|fettuccine|macaroni)\b/i;
const SOUP_TITLE = /\b(soup|chili|chowder|stew|bisque|broth)\b/i;
const PIZZA_TITLE = /\b(pizza|flatbread pie|pepperoni pie)\b/i;
const SKILLET_TITLE = /\b(skillet|one.?pan|cast iron)\b/i;
const TRAY_TITLE = /\b(sheet pan|tray bake|sheet.?pan|egg casserole tray)\b/i;
const CASSEROLE_TITLE = /\b(casserole|bake|baked ziti|hot dish)\b/i;
const SALAD_TITLE = /\b(salad|caesar|greens bowl)\b/i;
const SANDWICH_TITLE = /\b(sandwich|sub|hoagie|panini|hero\b|po.?boy)\b/i;

/** Infer canonical plating from title — title wins over loose mealFormat. */
export function inferPlatingType(title: string, mealFormat?: string): PlatingType {
  const t = (title || "").trim();
  const fmt = normalizeFormatKey(mealFormat);

  if (WRAP_TITLE.test(t) && !BOWL_TITLE.test(t)) return "wrap";
  if (BOWL_TITLE.test(t) || /\bburrito bowls?\b/i.test(t)) return "bowl";
  if (TACO_TITLE.test(t) && !/\bbowls?\b/i.test(t)) return "taco";
  if (BURGER_TITLE.test(t) || fmt === "burger") return "burger";
  if (PIZZA_TITLE.test(t)) return "pizza";
  if (PASTA_TITLE.test(t) || fmt === "pasta") return "pasta";
  if (SOUP_TITLE.test(t) || fmt === "soup_chili" || fmt === "stew") return "soup";
  if (SKILLET_TITLE.test(t) || fmt === "skillet") return "skillet";
  if (TRAY_TITLE.test(t) || fmt === "sheet_pan") return "tray";
  if (CASSEROLE_TITLE.test(t) || fmt === "casserole") return "casserole";
  if (SALAD_TITLE.test(t) || fmt === "salad") return "salad";
  if (SANDWICH_TITLE.test(t) || fmt === "sandwich") return "sandwich";
  if (fmt === "bowl") return "bowl";
  if (fmt === "wrap") return "wrap";
  if (fmt === "tacos") return "taco";
  if (fmt === "one_pot") return "skillet";
  if (fmt === "loaded_fries") return "tray";

  return "plated";
}

/** Infer plating depicted by hero path / alt (no pixels). */
export function inferPlatingTypeFromHeroPath(heroPath: string, altText = ""): PlatingType | null {
  const blob = `${heroPath} ${altText}`.toLowerCase();

  if (/lettuce-cup|lettuce-wrap|lettuce_cup|lettuce_wrap|wrap-night/.test(blob)) return "wrap";
  if (/burrito-bowls?|burrito_bowls?|rice-bowl|grain-bowl|bibimbap|poke-bowl/.test(blob)) return "bowl";
  if (/\bbowl\b/.test(blob)) return "bowl";
  if (/\b(taco|tacos|fajita|nacho|quesadilla|enchilada)\b/.test(blob)) return "taco";
  if (/\bburrito\b/.test(blob) && !/\bbowls?\b/.test(blob)) return "taco";
  if (/\b(burger|smash|cheeseburger|slider)\b/.test(blob)) return "burger";
  if (/\b(pizza|pepperoni-pie|flatbread)\b/.test(blob)) return "pizza";
  if (/\b(pasta-salad|potato-salad|antipasto)\b/.test(blob)) return "salad";
  if (/\b(pasta|spaghetti|penne|lasagna|ziti|macaroni)\b/.test(blob)) return "pasta";
  if (/\b(soup|chili|chowder|stew|bisque)\b/.test(blob)) return "soup";
  if (/\b(skillet|one-pan|one_pan|cast-iron)\b/.test(blob)) return "skillet";
  if (/\b(sheet-pan|sheet_pan|tray|egg-casserole)\b/.test(blob)) return "tray";
  if (/\b(casserole|baked-ziti|hot-dish)\b/.test(blob)) return "casserole";
  if (/\b(salad|caesar)\b/.test(blob)) return "salad";
  if (/\b(sandwich|sub|hoagie|panini)\b/.test(blob)) return "sandwich";

  return null;
}

const INCOMPATIBLE: Record<PlatingType, PlatingType[]> = {
  bowl: ["wrap", "taco", "burger", "sandwich", "pizza", "pasta"],
  wrap: ["bowl", "soup", "pasta", "pizza", "burger", "casserole"],
  taco: ["bowl", "soup", "pasta", "pizza", "burger", "salad"],
  burger: ["bowl", "soup", "pasta", "taco", "wrap", "salad"],
  pasta: ["bowl", "taco", "burger", "wrap", "pizza", "soup"],
  soup: ["burger", "taco", "wrap", "pizza", "sandwich", "salad"],
  pizza: ["bowl", "soup", "taco", "wrap", "pasta"],
  sandwich: ["bowl", "soup", "pasta", "taco", "pizza"],
  skillet: ["wrap", "taco", "soup", "salad"],
  tray: ["wrap", "taco", "soup", "burger"],
  casserole: ["wrap", "taco", "salad", "burger"],
  salad: ["burger", "pizza", "pasta", "soup", "taco"],
  rice_plate: ["wrap", "taco", "burger", "pizza"],
  plated: [],
};

export function platingTypesConflict(expected: PlatingType, depicted: PlatingType): boolean {
  if (expected === depicted) return false;
  if (expected === "plated" || depicted === "plated") return false;
  return INCOMPATIBLE[expected]?.includes(depicted) ?? false;
}

export function buildPlatingPromptLine(
  platingType: PlatingType,
  title: string,
  cuisine = "American",
): string {
  const dish = title.trim();
  switch (platingType) {
    case "bowl":
      return `${dish} served in a deep matte bowl with distinct rice/grain base zones, glazed protein on top, green onion and sesame garnish — NOT lettuce wraps, NOT tacos, NOT handheld`;
    case "wrap":
      return `${dish} as filled lettuce cups or wraps on a dark plate, visible filling in crisp lettuce leaves — NOT a rice bowl, NOT deep bowl service`;
    case "taco":
      return `${dish} as street-style tacos on a dark plate, visible tortillas and filling — NOT a bowl, NOT lettuce-only cups unless titled wraps`;
    case "burger":
      return `${dish} stacked on glossy bun with visible layers, napkin at edge — NOT bowl, NOT wrap`;
    case "pasta":
      return `${dish} twirled in a wide pasta bowl, restrained garnish, al dente texture visible — NOT rice bowl, NOT burger`;
    case "soup":
      return `${dish} in a deep soup bowl, toppings centered, gentle steam — NOT dry plate, NOT handheld`;
    case "pizza":
      return `${dish} whole pie or controlled slice pull, crust char and cheese bubble — NOT bowl, NOT wrap`;
    case "skillet":
      return `${dish} in cast-iron skillet, bubbling edges, handle visible at frame edge — NOT lettuce wrap`;
    case "tray":
      return `${dish} on sheet pan or tray bake, even browning, crew-scale portions — NOT handheld wrap`;
    case "casserole":
      return `${dish} in rectangular baking dish with scooped serving, melted top — NOT taco, NOT wrap`;
    case "salad":
      if (/\bchicken\b/i.test(dish) && /\bcaesar\b/i.test(dish)) {
        return `${dish} in wide salad bowl with chopped romaine, Caesar dressing, parmesan, and croutons — grilled chicken sliced and diced in bite-sized pieces mixed through the greens, NOT a whole breast resting on top`;
      }
      return `${dish} in wide salad bowl, protein forward on greens — NOT burger bun, NOT taco shell`;
    case "sandwich":
      return `${dish} cross-section or stacked sandwich, fillings visible — NOT rice bowl`;
    case "rice_plate":
      return `${dish} on plate with distinct rice bed and protein, ${cuisine} styling — NOT lettuce wrap`;
    default:
      return `${dish} on single generous plate, sides soft at edges, firehall portion scale`;
  }
}

export function platingNegativeHints(platingType: PlatingType): string[] {
  const common = ["text", "logo", "watermark", "hands", "faces", "delivery box"];
  switch (platingType) {
    case "bowl":
      return [...common, "lettuce wraps", "lettuce cups", "tacos", "handheld", "bun", "flatbread"];
    case "wrap":
      return [...common, "rice bowl", "deep bowl", "tacos in tortilla", "burger bun"];
    case "taco":
      return [...common, "rice bowl", "deep soup bowl", "burger", "lettuce only without tortilla"];
    case "burger":
      return [...common, "bowl", "wrap", "taco shell", "pasta"];
    case "pasta":
      return [...common, "rice bowl", "taco", "burger", "wrap"];
    case "soup":
      return [...common, "dry plate only", "burger", "taco", "wrap"];
    default:
      return common;
  }
}
