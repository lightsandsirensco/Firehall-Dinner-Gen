/**
 * Ingredient display integrity: what Pick Tonight sends to the browser must match the stored
 * recipe at every crew size — complete list, correct quantities, kitchen-friendly units.
 *
 * Run: npx tsx scripts/test-ingredient-display-integrity.ts
 */
process.env.FIREHALL_OFFLINE = "1";

import fs from "node:fs";

const { getPgPool } = await import("../server/db/pg-client.js");
const { getApprovedCatalog } = await import("../server/approved-catalog-cache.js");
const { loadCanonicalCatalogPage } = await import("../server/meal-catalog/canonical-page.js");
const { generateResponseFromCanonicalPage } = await import("../server/meal-catalog/hydrate-golden-generate.js");
const { applyCrewPortionFloors } = await import("../server/firehall-voice.js");
const { inferIngredientCategory } = await import("../server/labelAudit.js");
const { isApprovedCatalogSlug, isBreakfastCatalogSlug } = await import("../shared/hall-catalog/gate.js");
const { parseAmountToQtyUnit, parseQuantityAndUnit, formatScaledQuantity, scaleGoldenIngredients } = await import(
  "../shared/golden-100/recipe-quality/crew-scale.js"
);
const { parseQuantity: parsePortionQuantity } = await import("../shared/recipe/crew-portion-limits.js");
const { getRecipeBaseServings } = await import("../shared/recipe/crew-scaling-config.js");
const { resolveMealPlate } = await import("../client/src/lib/meal-plate-ui.js");

let failures = 0;
function check(ok: boolean, label: string) {
  if (!ok) {
    failures++;
    console.error(`FAIL ${label}`);
  }
}

// ── Isolation ───────────────────────────────────────────────────────────────
let poolBlocked = false;
try {
  getPgPool();
} catch {
  poolBlocked = true;
}
check(poolBlocked, "FIREHALL_OFFLINE=1 must block Postgres connections");
const { isOfflineMode } = await import("../server/db/pg-client.js");
for (const [value, want] of [["true", true], ["YES", true], ["0", false], ["", false]] as const) {
  process.env.FIREHALL_OFFLINE = value;
  check(isOfflineMode() === want, `FIREHALL_OFFLINE="${value}" offline=${isOfflineMode()}, want ${want}`);
}
process.env.FIREHALL_OFFLINE = "1";

// ── Parser + formatter units ────────────────────────────────────────────────
const parseCases: Array<[string, number, string]> = [
  ["1 1/2 lb", 1.5, "lb"],
  ["1 3/4 cups", 1.75, "cups"],
  ["2 1/4 cups", 2.25, "cups"],
  ["3/4 large", 0.75, "large"],
  ["7/8 tbsp", 0.88, "tbsp"],
  ["2.4 tbsp", 2.4, "tbsp"],
  ["8–10 oz", 10, "oz"],
  ["½ tsp", 0.5, "tsp"],
  ["1 bottle", 1, "bottle"],
  ["to taste", 0, "to taste"],
];
for (const [input, qty, unit] of parseCases) {
  const got = parseAmountToQtyUnit(input);
  check(got.qty === qty && got.unit === unit, `parseAmountToQtyUnit("${input}") → ${JSON.stringify(got)}, want ${qty} ${unit}`);
}
for (const [name, want] of [
  ["long-grain white rice", "grain"],
  ["elbow macaroni", "grain"],
  ["Cajun seasoning", "spice"],
  ["vegetable oil", "sauce"],
  ["chicken broth", "pantry"],
] as const) {
  check(inferIngredientCategory(name) === want, `category("${name}") = ${inferIngredientCategory(name)}, want ${want}`);
}
check(parsePortionQuantity("1 1/2") === 1.5, `crew-portion parseQuantity("1 1/2") = ${parsePortionQuantity("1 1/2")}`);

const formatCases: Array<[number, string]> = [
  [2.25, "2 1/4"],
  [2.4, "2 1/2"],
  [3.75, "3 3/4"],
  [1.5, "1 1/2"],
  [0.875, "7/8"],
  [0.125, "1/8"],
  [3, "3"],
];
for (const [n, want] of formatCases) {
  check(formatScaledQuantity(n) === want, `formatScaledQuantity(${n}) = "${formatScaledQuantity(n)}", want "${want}"`);
}

const measureCases: Array<[string, string, number, number, string, string]> = [
  ["1", "tbsp", 8, 4, "1 3/4", "tsp"],
  ["3/4", "cup", 8, 4, "6", "tbsp"],
  ["1", "tsp", 8, 6, "3/4", "tsp"],
  ["1/2 tsp", "", 8, 6, "1/2 tsp", ""],
  ["1", "bottle", 8, 6, "1", "bottle"],
];
for (const [quantity, unit, base, crew, wantQty, wantUnit] of measureCases) {
  const [got] = scaleGoldenIngredients([{ name: "x", quantity, unit }], base, crew);
  check(got!.quantity === wantQty && (got!.unit ?? "") === wantUnit, `scale ${quantity} ${unit} ${base}→${crew} = "${got!.quantity}" ${got!.unit ?? ""}, want "${wantQty}" ${wantUnit}`);
}

// ── Catalog-wide payload integrity ──────────────────────────────────────────
const CREWS = [4, 6, 8, 10, 14];
const WHOLE_UNIT = /^(bottles?|jars?|loaf|loaves)$/i;
const VOLUME_UNIT = /^(cups?|tbsp|tsp|tablespoons?|teaspoons?)$/i;
const LINEAR_UNIT = /^(lbs?|pounds?|cups?|oz|ounces?|cans?|quarts?|qt)$/i;
const COUNT_UNIT = /^(each|count|whole|large|medium|small|rolls?|buns?|rounds?|eggs?|heads?|cloves?|stalks?|links?|fillets?|breasts?|thighs?|tortillas?)$/i;

const slugs = [...new Set(getApprovedCatalog().recipes.map((r: { slug: string }) => r.slug))].filter(
  (s) => isApprovedCatalogSlug(s) && !isBreakfastCatalogSlug(s),
);
let recipesChecked = 0;
const ratioOutliers: string[] = [];

for (const slug of slugs) {
  const page = loadCanonicalCatalogPage(slug);
  if (!page?.ingredients.length) continue;
  recipesChecked++;
  const base = getRecipeBaseServings(page);

  for (const crew of CREWS) {
    const { recipe } = generateResponseFromCanonicalPage(page, { protein: "chicken", mealFormat: "" }, crew);
    const served = applyCrewPortionFloors(recipe.ingredients, crew);
    check(served.length === page.ingredients.length, `${slug} crew ${crew}: ${served.length}/${page.ingredients.length} ingredients served`);

    served.forEach((ing, i) => {
      const client = parseAmountToQtyUnit(ing.amount);
      const parsed = parseQuantityAndUnit(ing.amount);
      const expected = Math.max(parsed.amount, parsed.rangeEnd ?? 0);
      if (expected > 0) {
        check(Math.abs(client.qty - expected) <= 0.01, `${slug} crew ${crew}: "${ing.item}" "${ing.amount}" sent as ${client.qty}`);
      }
      if (WHOLE_UNIT.test(client.unit)) {
        check(Number.isInteger(client.qty) && client.qty >= 1, `${slug} crew ${crew}: "${ing.item}" ${client.qty} ${client.unit} (must be whole)`);
      }
      if (COUNT_UNIT.test(client.unit) && client.qty >= 1) {
        check(Number.isInteger(client.qty), `${slug} crew ${crew}: "${ing.item}" ${client.qty} ${client.unit} (counts ≥1 must be whole)`);
      }
      if (VOLUME_UNIT.test(client.unit)) {
        check(!/\d\.\d/.test(ing.amount), `${slug} crew ${crew}: "${ing.item}" uses decimal measure "${ing.amount}"`);
        if (crew !== base) {
          check(!/\b[357]\/8\b/.test(ing.amount), `${slug} crew ${crew}: "${ing.item}" unmeasurable "${ing.amount}"`);
        }
      }

      const stored = page.ingredients[i];
      const storedQty = parseQuantityAndUnit(stored?.quantity).amount;
      const storedUnit = (stored?.unit || parseQuantityAndUnit(stored?.quantity).unitText).trim();
      if (crew !== base && storedQty > 0 && expected > 0 && LINEAR_UNIT.test(storedUnit) && client.unit.toLowerCase() === storedUnit.toLowerCase() && ing.amount === recipe.ingredients[i]!.amount) {
        const ratio = expected / (storedQty * (crew / base));
        if (ratio < 0.6 || ratio > 1.6) ratioOutliers.push(`${slug} crew ${crew}: ${stored!.name} ${stored!.quantity} ${stored!.unit ?? ""} → ${ing.amount}`);
      }
    });
  }
}
check(recipesChecked >= 300, `expected ≥300 dinner recipes, checked ${recipesChecked}`);
check(ratioOutliers.length === 0, `crew scaling ratio outliers:\n  ${ratioOutliers.slice(0, 15).join("\n  ")}`);

// ── Cajun Chicken and Rice regression ───────────────────────────────────────
{
  const page = loadCanonicalCatalogPage("cajun-chicken-rice-bowl")!;
  check(page.title === "Cajun Chicken and Rice", `cajun title "${page.title}"`);
  const { recipe } = generateResponseFromCanonicalPage(page, { protein: "chicken", mealFormat: "bowl" }, 6);
  const served = applyCrewPortionFloors(recipe.ingredients, 6);
  const byName = new Map(served.map((i) => [i.item.toLowerCase(), i.amount]));
  for (const name of [
    "boneless chicken thighs", "long-grain white rice", "red bell pepper", "green bell pepper", "celery stalks",
    "yellow onion", "smoked paprika", "garlic powder", "onion powder", "dried thyme", "cayenne pepper",
    "chicken broth", "vegetable oil", "kosher salt", "black pepper", "unsalted butter", "green onions", "hot sauce",
  ]) {
    check(byName.has(name), `cajun crew 6 missing ${name}`);
  }
  check(byName.get("long-grain white rice") === "2 1/4 cups", `cajun rice "${byName.get("long-grain white rice")}"`);
  check(byName.get("boneless chicken thighs") === "3 lb", `cajun chicken "${byName.get("boneless chicken thighs")}"`);
  check(byName.get("hot sauce") === "1 bottle", `cajun hot sauce "${byName.get("hot sauce")}"`);
  check(parseAmountToQtyUnit(byName.get("vegetable oil")).qty > 0, "cajun oil quantity");

  const client = {
    title: page.title,
    hall_curated: true,
    ingredients: served.map((i) => ({ name: i.item, ...parseAmountToQtyUnit(i.amount), category: "" })),
  } as never;
  const plate = resolveMealPlate(client);
  const optionalNames = (plate?.optional ?? []).map((l) => l.name.toLowerCase());
  check(!optionalNames.includes("vegetable oil"), "cajun: cooking oil must never be Optional");
}

// Catalog cards must not render the inferred plate summary.
const card = fs.readFileSync("client/src/components/recipe-card.tsx", "utf8");
check(/recipe\.hall_curated \? null : mealPlate/.test(card), "recipe-card must hide the inferred plate for catalog recipes");

if (failures) {
  console.error(`\n[test-ingredient-display-integrity] ${failures} failure(s)`);
  process.exit(1);
}
console.log(`[test-ingredient-display-integrity] PASS — ${recipesChecked} recipes × ${CREWS.length} crew sizes`);
process.exit(0);
