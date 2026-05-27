/**
 * Firehall-specific editorial copy — tonights spread, pro tips, leftovers.
 */

import type { GoldenRecipeDefinition } from "../../shared/golden-100/types.js";
import type { MasterCategoryId } from "../../shared/categories/constants.js";

function categorySpread(category: MasterCategoryId, title: string): string[] {
  const base = [
    `Line up ${title} on the main counter with serving spoons — firefighters grab fast between calls.`,
    "Keep a backup tray warm in the oven at 200°F for late arrivals after a run.",
  ];
  switch (category) {
    case "bbq_grill_nights":
      return [
        ...base,
        "Slice proteins on a cutting board at the end of the line so everyone sees the smoke ring and char.",
        "Set sauce and pickles on the side — sauced meat holds better on the backup tray.",
      ];
    case "game_day_watch_party":
      return [
        "Build a long snack board: mains down the center, dips and chips at both ends.",
        "Use disposable boats for handhelds so cleanup stays under five minutes after the game.",
        ...base,
      ];
    case "big_crew_feeders":
      return [
        "Serve family-style from two full-size trays — never let the line run dry on a busy night.",
        "Put starch and protein on separate trays so vegetarians can load up on sides.",
        ...base,
      ];
    case "healthy_performance":
      return [
        "Portion bowls on the line with protein visible on top — crew eats with their eyes first.",
        "Keep dressing and crunchy toppings in side bowls so greens stay crisp through second servings.",
        ...base,
      ];
    case "breakfast_brunch":
      return [
        "Keep hot items on one side of the table and cold on the other — eggs stay hot, fruit stays cold.",
        ...base,
      ];
    default:
      return base;
  }
}

function formatSpread(format: string, title: string): string[] {
  switch (format) {
    case "tacos":
      return [
        "Warm tortillas in a dry skillet stack — wrap in foil so the line stays soft.",
        "Set proteins, salsa, and toppings in separate bowls for build-your-own station flow.",
      ];
    case "burger":
      return [
        "Toast buns in batches and hold in a warm pan — soggy buns kill the line.",
        "Keep cheese slices under a dome so they melt fast when patties come off the griddle.",
      ];
    case "bowl":
      return [
        "Build bowls base → grain → protein → toppings so the line moves in one direction.",
        "Put hot components closest to the crew, cold crunch at the far end.",
      ];
    case "pizza":
      return [
        "Cut pies into hall slices (8 per pie minimum) and fan on sheet trays.",
        "Keep a fresh pie warming in the oven — pizza dies fast on the counter.",
      ];
    case "soup_chili":
      return [
        "Keep the pot on low simmer on the stove — ladle from the side so the bottom doesn't scorch.",
        "Set shredded cheese, crackers, and hot sauce in a row beside the pot.",
      ];
    default:
      return [`Plate ${title} with sides in separate pans so the crew can mix portions.`];
  }
}

export function buildTonightSpread(def: GoldenRecipeDefinition): string[] {
  const lines = [
    ...formatSpread(def.mealFormat, def.title),
    ...categorySpread(def.masterCategoryId, def.title),
  ];
  return [...new Set(lines)].slice(0, 6);
}

export function buildProTips(def: GoldenRecipeDefinition, crewSize: number): string[] {
  const tips: string[] = [];
  const rec = def.recommendation;

  if (rec.feedsHardScore >= 8) {
    tips.push(
      "Firefighters eat heavy after rough nights — double the protein if the hall had a busy shift.",
    );
  }
  if (rec.rookieFriendly >= 8) {
    tips.push(
      "Assign one cook to proteins and one to sides — rookies stay on timing, not multitasking.",
    );
  }
  if (rec.quickShiftMeal) {
    tips.push("Prep all mise en place before the bell — this meal wins on organization, not speed hacks.");
  }
  if (rec.mealPrepFriendly) {
    tips.push("Cool portions in shallow trays before the fridge — deep containers stay in the danger zone too long.");
  }
  if (crewSize >= 10) {
    tips.push(`At ${crewSize} servings, split into two pans halfway through so the bottom doesn't overcook while the top waits.`);
  }
  tips.push("Keep a backup tray warm in the oven for late calls — nothing worse than cold protein after a run.");
  tips.push("Taste for salt at the end — hall palates run salty after long shifts.");

  if (def.mealFormat === "grill" || def.masterCategoryId === "bbq_grill_nights") {
    tips.push("Rest grilled proteins 5–8 minutes under foil before slicing — juices stay in the meat.");
  }
  if (def.protein === "chicken") {
    tips.push("Pull chicken at 160°F and let carryover hit 165°F — dry breast ruins crew morale.");
  }

  return [...new Set(tips)].slice(0, 8);
}

export function buildLeftoversStrategy(def: GoldenRecipeDefinition): string[] {
  const tips = [
    "Cool leftovers in shallow containers within two hours — deep pots stay hot too long.",
    "Label trays with date and reheat to 165°F minimum before second shift.",
  ];
  if (def.recommendation.mealPrepFriendly) {
    tips.push("Portion into individual containers on night one — locker-friendly for shift two.");
  }
  if (def.mealFormat === "soup_chili" || def.mealFormat === "pasta") {
    tips.push("Add a splash of stock or water when reheating — thick sauces tighten in the fridge.");
  }
  if (def.mealFormat === "burger" || def.mealFormat === "sandwich") {
    tips.push("Store components separate — assemble fresh; buns go soggy overnight.");
  }
  if (def.mealFormat === "grill") {
    tips.push("Slice cold protein thin for next-day wraps or salads — faster reheat, less dry-out.");
  }
  return [...new Set(tips)].slice(0, 5);
}

export function buildEquipmentList(def: GoldenRecipeDefinition): string[] {
  const base = ["Large sheet trays", "Instant-read thermometer", "Aluminum foil"];
  const fmt = def.mealFormat;
  const extra: string[] = [];

  if (fmt === "grill" || def.masterCategoryId === "bbq_grill_nights") {
    extra.push("Grill or flat-top", "Tongs", "Heat-resistant gloves");
  }
  if (fmt === "skillet" || fmt === "bowl") {
    extra.push("Large cast iron skillet or Dutch oven");
  }
  if (fmt === "sheet_pan") {
    extra.push("Half-sheet pans", "Parchment paper");
  }
  if (fmt === "pasta" || fmt === "soup_chili") {
    extra.push("8-quart stock pot");
  }
  if (fmt === "burger") {
    extra.push("Flat griddle or cast iron", "Burger press or heavy spatula");
  }
  if (def.masterCategoryId === "pizza_night") {
    extra.push("Pizza stone or steel", "Peel or inverted sheet pan");
  }

  return [...new Set([...extra, ...base])].slice(0, 12);
}

export function inferDifficulty(def: GoldenRecipeDefinition): "easy" | "medium" | "hard" {
  if (def.recommendation.rookieFriendly >= 8) return "easy";
  if (def.masterCategoryId === "bbq_grill_nights" || def.masterCategoryId === "big_crew_feeders") {
    return "hard";
  }
  if (def.recommendation.quickShiftMeal) return "easy";
  return "medium";
}

export function estimateTiming(def: GoldenRecipeDefinition): { prep: number; cook: number; total: number } {
  const cat = def.masterCategoryId;
  if (cat === "quick_shift_meals" || cat === "rookie_friendly") {
    return { prep: 15, cook: 20, total: 35 };
  }
  if (cat === "bbq_grill_nights" || cat === "big_crew_feeders") {
    return { prep: 30, cook: 60, total: 90 };
  }
  if (cat === "meal_prep_leftovers") {
    return { prep: 25, cook: 75, total: 100 };
  }
  return { prep: 20, cook: 35, total: 55 };
}

export function estimateNutrition(def: GoldenRecipeDefinition): {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
} {
  const p = def.protein;
  const comfort = def.recommendation.comfortFoodScore;
  const healthy = def.recommendation.healthyScore;

  let calories = 520;
  let protein = 32;
  let carbs = 48;
  let fats = 22;

  if (p === "beef" || p === "pork") {
    protein += 8;
    fats += 6;
    calories += 80;
  }
  if (p === "seafood") {
    protein += 4;
    fats += 2;
    calories -= 40;
  }
  if (p === "vegetarian") {
    protein -= 10;
    carbs += 12;
    calories -= 60;
  }
  if (comfort >= 8) {
    calories += 120;
    carbs += 20;
    fats += 8;
  }
  if (healthy >= 8) {
    calories -= 80;
    carbs -= 10;
    fats -= 6;
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fats: Math.round(fats),
  };
}
