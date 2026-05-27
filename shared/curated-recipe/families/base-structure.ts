import type { HallArchetypeFamily } from "../../meal-archetype-system.js";
import { getArchetypeDefinition } from "../../meal-archetype-system.js";
import type { RecipeBaseStructure } from "./types.js";

/** Default shared base skeleton per hall archetype family */
export function defaultBaseStructureForFamily(family: HallArchetypeFamily): RecipeBaseStructure {
  const def = getArchetypeDefinition(family);
  const equipment = defaultEquipment(family);
  const techniques = defaultTechniques(family);

  return {
    version: 1,
    ingredients: defaultBaseIngredients(family),
    prepFlow: [
      { phase: "mise", summary: `Prep ingredients for ${def.displayName}`, minutes: 15 },
      { phase: "cook", summary: "Run the main cook on station", minutes: 25 },
      { phase: "serve", summary: "Plate for crew service", minutes: 10 },
    ],
    equipment,
    techniques,
  };
}

function defaultEquipment(family: HallArchetypeFamily): string[] {
  const map: Partial<Record<HallArchetypeFamily, string[]>> = {
    taco_night: ["skillet", "sheet_pan"],
    grill_night: ["grill", "tongs"],
    slow_cooker_night: ["slow_cooker"],
    pizza_night: ["oven", "sheet_pan"],
    pasta_night: ["stock_pot", "skillet"],
    chili_night: ["stock_pot"],
    soup_stew_night: ["stock_pot"],
    game_day_spread: ["sheet_pan", "oven"],
  };
  return map[family] ?? ["skillet", "stock_pot"];
}

function defaultTechniques(family: HallArchetypeFamily): string[] {
  const map: Partial<Record<HallArchetypeFamily, string[]>> = {
    taco_night: ["sear", "warm_tortillas", "assemble"],
    grill_night: ["grill_mark", "rest"],
    slow_cooker_night: ["low_and_slow"],
    pasta_night: ["boil", "toss", "reduce_sauce"],
    chili_night: ["sweat_aromatics", "simmer"],
    pizza_night: ["bake", "melt"],
  };
  return map[family] ?? ["prep_ahead", "sear", "simmer"];
}

function defaultBaseIngredients(family: HallArchetypeFamily) {
  const proteinSlot = { slot: "protein", name: "main protein", role: "protein" as const };
  const starchSlot = { slot: "starch", name: "starch base", role: "starch" as const };
  const vegSlot = { slot: "veg", name: "aromatic vegetables", role: "veg" as const };
  const sauceSlot = { slot: "sauce", name: "sauce or seasoning", role: "sauce" as const };

  if (family === "taco_night") {
    return [
      proteinSlot,
      { slot: "tortilla", name: "tortillas", role: "starch" as const },
      vegSlot,
      sauceSlot,
    ];
  }
  if (family === "pasta_night") {
    return [proteinSlot, { slot: "pasta", name: "pasta", role: "starch" as const }, vegSlot, sauceSlot];
  }
  if (family === "chili_night" || family === "soup_stew_night") {
    return [proteinSlot, vegSlot, sauceSlot, { name: "broth or tomatoes", role: "sauce" as const }];
  }
  return [proteinSlot, starchSlot, vegSlot, sauceSlot];
}
