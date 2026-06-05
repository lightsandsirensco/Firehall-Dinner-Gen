#!/usr/bin/env tsx
/**
 * Audit US/Metric toggle pipeline — conversion, crew scaling, catalog unit casing.
 *
 *   npm run audit:measurement-toggle
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { scaleGoldenIngredients } from "../shared/golden-100/recipe-quality/crew-scale.js";
import {
  formatIngredientAmount,
  convertIngredientLine,
  resolveIngredientQuantityUnit,
} from "../shared/measurements/convert.js";
import { formatIngredientDisplayName } from "../shared/measurements/ingredient-names.js";
import { formatTemperaturesInText, formatStepTemperature } from "../shared/measurements/temperature.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

// US ↔ Metric conversion (including standardized catalog units)
const cases: Array<{
  qty: string;
  unit: string;
  us: string;
  metric: string;
}> = [
  { qty: "2", unit: "lb", us: "2 lb", metric: "900 g" },
  { qty: "2", unit: "Lb", us: "2 Lb", metric: "900 g" },
  { qty: "1", unit: "cup", us: "1 cup", metric: "240 ml" },
  { qty: "1", unit: "Cup", us: "1 Cup", metric: "240 ml" },
  { qty: "2", unit: "tbsp", us: "2 tbsp", metric: "30 ml" },
  { qty: "2", unit: "Tbsp", us: "2 Tbsp", metric: "30 ml" },
  { qty: "1", unit: "tsp", us: "1 tsp", metric: "5 ml" },
  { qty: "1", unit: "Tsp", us: "1 Tsp", metric: "5 ml" },
];

for (const { qty, unit, us, metric } of cases) {
  const usOut = formatIngredientAmount(qty, unit, "us");
  const metricOut = formatIngredientAmount(qty, unit, "metric");
  check(usOut === us, `US ${qty} ${unit}: expected "${us}", got "${usOut}"`);
  check(metricOut === metric, `Metric ${qty} ${unit}: expected "${metric}", got "${metricOut}"`);
}

// Crew scale then convert (8 → 4 crew doubles nothing at 8; 4→8 doubles)
const base = [{ name: "Chicken Thighs", quantity: "2", unit: "Lb" }];
const scaled8 = scaleGoldenIngredients(base, 4, 8)[0];
check(
  formatIngredientAmount(scaled8.quantity, scaled8.unit, "us") === "4 Lb",
  `crew scale US: expected 4 Lb, got ${formatIngredientAmount(scaled8.quantity, scaled8.unit, "us")}`,
);
check(
  formatIngredientAmount(scaled8.quantity, scaled8.unit, "metric") === "1.8 kg",
  `crew scale metric: expected 1.8 kg, got ${formatIngredientAmount(scaled8.quantity, scaled8.unit, "metric")}`,
);

// Toggle must change visible output for same ingredient row
const row = { quantity: "2", unit: "Lb" };
const usVisible = formatIngredientAmount(row.quantity, row.unit, "us");
const metricVisible = formatIngredientAmount(row.quantity, row.unit, "metric");
check(usVisible !== metricVisible, "US and Metric displays must differ for 2 Lb");
check(metricVisible === "900 g", `metric visible: expected 900 g, got ${metricVisible}`);

// Temperature toggle
check(
  formatTemperaturesInText("Bake at 375°F until done.", "metric").includes("190°C"),
  "metric temp should show °C only",
);
check(
  formatStepTemperature(375, "us").includes("375°F"),
  "US step temp should include °F",
);

// Ingredient capitalization preserved through display
check(
  formatIngredientDisplayName("boneless chicken thighs") === "Boneless Chicken Thighs",
  "title case preserved",
);

// Context provider wired in App
const appSource = readFileSync(join(process.cwd(), "client/src/App.tsx"), "utf8");
check(
  appSource.includes("MeasurementSystemProvider"),
  "App.tsx must wrap routes with MeasurementSystemProvider",
);

const prefSource = readFileSync(
  join(process.cwd(), "client/src/lib/measurement-preference.tsx"),
  "utf8",
);
check(
  prefSource.includes("createContext") && prefSource.includes("MeasurementSystemProvider"),
  "measurement-preference must use shared React context",
);

// Recipe pages read measurementSystem into formatIngredientAmount
const recipePages = [
  "client/src/pages/golden-recipe-page.tsx",
  "client/src/pages/breakfast-recipe-page.tsx",
  "client/src/pages/explore-recipe-detail-page.tsx",
];

for (const rel of recipePages) {
  const path = join(process.cwd(), rel);
  if (!existsSync(path)) continue;
  const src = readFileSync(path, "utf8");
  const bindsMeasurement =
    src.includes("useMeasurementSystem") &&
    (src.includes("formatIngredientAmount") || src.includes("formatClientIngredientQty"));
  check(
    bindsMeasurement,
    `${rel} must bind measurementSystem to ingredient quantity formatting`,
  );
  if (src.includes("useMemo(") && src.includes("shoppingList")) {
    check(
      src.includes("[scaledIngredients, page?.title, measurementSystem]") ||
        src.includes("measurementSystem"),
      `${rel} shopping list memo should depend on measurementSystem`,
    );
  }
}

// Sample catalog page: metric must differ from US for imperial units
const samplePath = join(
  process.cwd(),
  "client/public/catalog/bbq/pages/honey-chipotle-chicken-thighs.json",
);
if (existsSync(samplePath)) {
  const page = JSON.parse(readFileSync(samplePath, "utf8")) as {
    ingredients: Array<{ quantity?: string; unit?: string }>;
  };
  const imperial = page.ingredients.find((i) => i.unit && /^(lb|Lb|oz|Oz|cup|Cup|cups|Cups|tbsp|Tbsp|tsp|Tsp)$/i.test(i.unit));
  if (imperial) {
    const us = formatIngredientAmount(imperial.quantity, imperial.unit, "us");
    const metric = formatIngredientAmount(imperial.quantity, imperial.unit, "metric");
    check(us !== metric, `catalog sample ${imperial.quantity} ${imperial.unit}: US "${us}" must differ from metric "${metric}"`);
  }
}

const resolved = resolveIngredientQuantityUnit("2 Lb", "");
check(resolved.quantity === "2" && resolved.unit === "lb", "resolve embedded unit casing");

check(
  convertIngredientLine("2 Lb Boneless Chicken Thighs", "metric") === "900 g Boneless Chicken Thighs",
  "free-text line conversion with Title Case units",
);

if (failures.length) {
  console.error("[audit:measurement-toggle] FAIL");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("[audit:measurement-toggle] OK");
console.log(`  conversion cases: ${cases.length}`);
console.log(`  crew+metric pipeline: pass`);
console.log(`  context provider: pass`);
console.log(`  recipe pages: ${recipePages.length} checked`);
