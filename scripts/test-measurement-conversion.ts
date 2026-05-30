#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scaleGoldenIngredients } from "../shared/golden-100/recipe-quality/crew-scale.js";
import {
  convertIngredientLine,
  convertTemperaturesInText,
  formatClientIngredientQty,
  formatIngredientAmount,
  fahrenheitToCelsius,
} from "../shared/measurements/convert.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[test-measurement-conversion] FAIL ${message}`);
    process.exit(1);
  }
}

assert(formatIngredientAmount("2", "lb", "metric") === "900 g", "2 lb → 900 g");
assert(formatIngredientAmount("1", "cup", "metric") === "240 ml", "1 cup → 240 ml");
assert(formatIngredientAmount("2", "tbsp", "metric") === "30 ml", "2 tbsp → 30 ml");
assert(fahrenheitToCelsius(400) === 205, "400°F → 205°C");
assert(
  convertTemperaturesInText("Bake at 400°F until golden.", "metric") === "Bake at 205°C until golden.",
  "inline °F in text",
);
assert(
  convertTemperaturesInText("Smoke at 250–275°F for hours.", "metric") === "Smoke at 120–135°C for hours.",
  "°F range in text",
);

assert(formatIngredientAmount("2", "lb", "us") === "2 lb", "US passthrough");
assert(formatIngredientAmount("9", "heads", "metric") === "9 heads", "non-convertible unit unchanged");

assert(
  convertIngredientLine("2 lb chicken breast", "metric") === "900 g chicken breast",
  "ingredient line conversion",
);

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

const catalogDir = join(process.cwd(), "client/public/catalog/golden-100/pages");
const breakfastDir = join(process.cwd(), "client/public/catalog/breakfast/pages");
const qaRecipes: Array<{ path: string; label: string }> = [
  { path: join(catalogDir, "chicken-caesar.json"), label: "Chicken Caesar" },
  { path: join(catalogDir, "chicken-parm.json"), label: "Chicken Parm" },
  { path: join(catalogDir, "pulled-pork.json"), label: "Pulled Pork" },
  { path: join(breakfastDir, "hall-breakfast-burritos.json"), label: "Breakfast Burritos" },
  { path: join(catalogDir, "smoked-brisket.json"), label: "Smoked Brisket" },
  { path: join(catalogDir, "loaded-nacho-skillet.json"), label: "Loaded Nacho Bar" },
  { path: join(breakfastDir, "monte-cristo-sandwiches.json"), label: "Monte Cristo" },
];

for (const { path, label } of qaRecipes) {
  const page = JSON.parse(readFileSync(path, "utf8")) as {
    title: string;
    baseServings?: number;
    crewSize: number;
    ingredients: Array<{ name: string; quantity?: string; unit?: string }>;
  };
  const base = page.baseServings ?? page.crewSize ?? 8;
  const scaled = scaleGoldenIngredients(page.ingredients, base, 6);
  for (const ing of scaled) {
    const metric = formatIngredientAmount(ing.quantity, ing.unit, "metric");
    assert(!/\d+\.\d{2,}/.test(metric), `${label}: ugly decimal in "${metric}" for ${ing.name}`);
    assert(!metric.includes("undefined"), `${label}: broken metric for ${ing.name}`);
  }
}

console.log("[test-measurement-conversion] OK examples + QA catalog slugs");
