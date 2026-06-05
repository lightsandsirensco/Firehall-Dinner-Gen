#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FIREFIGHTER_RED_LEAD_RECIPE } from "../shared/seo/firefighter-red-lead-recipe-data.js";
import { scaleGoldenIngredients } from "../shared/golden-100/recipe-quality/crew-scale.js";
import {
  convertIngredientLine,
  formatClientIngredientQty,
  formatIngredientAmount,
  isFakeMetricConversion,
  resolveIngredientQuantityUnit,
} from "../shared/measurements/convert.js";
import {
  fahrenheitToCelsius,
  formatDualTemperature,
  formatStepTemperature,
  formatTemperaturesInText,
} from "../shared/measurements/temperature.js";
import { formatIngredientDisplayName } from "../shared/measurements/ingredient-names.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[test-measurement-conversion] FAIL ${message}`);
    process.exit(1);
  }
}

const OVEN_TEMPS: Array<[number, number]> = [
  [225, 107],
  [250, 120],
  [275, 135],
  [300, 150],
  [325, 165],
  [350, 177],
  [375, 190],
  [400, 205],
  [425, 220],
  [450, 230],
  [500, 260],
];

for (const [f, c] of OVEN_TEMPS) {
  assert(fahrenheitToCelsius(f) === c, `${f}°F → ${c}°C`);
  assert(formatDualTemperature(f) === `${f}°F (${c}°C)`, `dual ${f}°F`);
}

assert(formatIngredientAmount("2", "lb", "metric") === "900 g", "2 lb → 900 g");
assert(formatIngredientAmount("1", "lb", "metric") === "450 g", "1 lb → 450 g");
assert(formatIngredientAmount("8", "oz", "metric") === "224 g", "8 oz → 224 g");
assert(formatIngredientAmount("2", "Lb", "metric") === "900 g", "capitalized Lb converts");
assert(formatIngredientAmount("2", "Tbsp", "metric") === "30 ml", "capitalized Tbsp converts");
assert(formatIngredientAmount("1", "oz", "metric") === "28 g", "1 oz → 28 g");
assert(formatIngredientAmount("1", "cup", "metric") === "240 ml", "1 cup → 240 ml");
assert(formatIngredientAmount("1", "tbsp", "metric") === "15 ml", "1 tbsp → 15 ml");
assert(formatIngredientAmount("1", "tsp", "metric") === "5 ml", "1 tsp → 5 ml");

assert(
  formatTemperaturesInText("Bake at 400°F until golden.", "us") ===
    "Bake at 400°F (205°C) until golden.",
  "US dual °F in text",
);
assert(
  formatTemperaturesInText("Bake at 350°F until golden.", "metric") ===
    "Bake at 177°C until golden.",
  "Metric °C only in text",
);
assert(
  formatStepTemperature(350, "metric") === "177°C",
  "step temp metric",
);
assert(!isFakeMetricConversion("2", "lb", "900 g"), "2 lb → 900 g is real");
assert(isFakeMetricConversion("2", "lb", "2 kg"), "2 lb → 2 kg is fake");

assert(formatIngredientAmount("2", "lb", "us") === "2 lb", "US passthrough");
assert(formatIngredientAmount("9", "heads", "metric") === "9 heads", "non-convertible unit unchanged");

assert(
  convertIngredientLine("2 lb chicken breast", "metric") === "900 g chicken breast",
  "ingredient line conversion",
);

assert(
  formatIngredientAmount("2 lb", undefined, "metric") === "900 g",
  "combined quantity field",
);

const split = resolveIngredientQuantityUnit("2 lb", "");
assert(split.quantity === "2" && split.unit === "lb", "resolve combined qty");

const scaledChicken = scaleGoldenIngredients(
  [{ name: "Chicken breast", quantity: "4", unit: "lb" }],
  8,
  6,
)[0];
assert(scaledChicken.quantity === "3", "crew scale before convert: 4 lb @8 → 3 lb @6");
assert(
  formatIngredientAmount(scaledChicken.quantity, scaledChicken.unit, "metric") === "1.4 kg",
  "scale then convert: 3 lb → 1.4 kg",
);

assert(formatClientIngredientQty(1.5, "cups", "metric") === "360 ml", "numeric client qty");
assert(formatIngredientDisplayName("ground beef") === "Ground Beef", "title case");
assert(formatIngredientDisplayName("BBQ sauce") === "BBQ Sauce", "BBQ preserved");

const catalogDir = join(process.cwd(), "client/public/catalog/golden-100/pages");
const breakfastDir = join(process.cwd(), "client/public/catalog/breakfast/pages");
const qaRecipes: Array<{ path: string; label: string }> = [
  { path: join(catalogDir, "chicken-caesar.json"), label: "Chicken Caesar" },
  { path: join(catalogDir, "chicken-parm.json"), label: "Chicken Parm" },
  { path: join(catalogDir, "pulled-pork.json"), label: "Pulled Pork" },
  { path: join(breakfastDir, "hall-breakfast-burritos.json"), label: "Breakfast Burritos" },
  { path: join(catalogDir, "loaded-nacho-skillet.json"), label: "Loaded Nacho Bar" },
  { path: join(breakfastDir, "monte-cristo-sandwiches.json"), label: "Monte Cristo" },
];

for (const { path, label } of qaRecipes) {
  const page = JSON.parse(readFileSync(path, "utf8")) as {
    title: string;
    baseServings?: number;
    crewSize: number;
    ingredients: Array<{ name: string; quantity?: string; unit?: string }>;
    steps?: Array<{ instruction: string }>;
  };
  const base = page.baseServings ?? page.crewSize ?? 8;
  const scaled = scaleGoldenIngredients(page.ingredients, base, 6);
  for (const ing of scaled) {
    const metric = formatIngredientAmount(ing.quantity, ing.unit, "metric");
    assert(!/\d+\.\d{2,}/.test(metric), `${label}: ugly decimal in "${metric}" for ${ing.name}`);
    assert(!metric.includes("undefined"), `${label}: broken metric for ${ing.name}`);
    if (ing.unit && /^(lb|oz|cup|tbsp|tsp)$/i.test(ing.unit)) {
      assert(metric !== `${ing.quantity} ${ing.unit}`, `${label}: ${ing.name} not converted`);
    }
  }
  for (const step of page.steps ?? []) {
    const us = formatTemperaturesInText(step.instruction, "us");
    const metric = formatTemperaturesInText(step.instruction, "metric");
    if (/°F/i.test(step.instruction) && !/\(\d+°C\)/.test(us)) {
      assert(false, `${label}: US step missing dual temps`);
    }
    if (/°F/i.test(step.instruction) && /°F/i.test(metric)) {
      assert(false, `${label}: metric step still has °F`);
    }
  }
}

for (const ing of FIREFIGHTER_RED_LEAD_RECIPE.ingredients) {
  const metric = formatIngredientAmount(ing.quantity, ing.unit, "metric");
  assert(!/\d+\.\d{2,}/.test(metric), `Red Lead: ugly decimal in "${metric}" for ${ing.name}`);
}

console.log("[test-measurement-conversion] OK examples + QA catalog slugs");
