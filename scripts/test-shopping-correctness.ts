#!/usr/bin/env tsx
/**
 * Smart Shopping — Phase 1 correctness tests.
 *
 * Embedded units, ranges, same-family conversion (and its refusal across
 * families), optional ingredients, pantry/staples on planner lists, manual
 * items across rebuilds, eggs/count units, seasonings, duplicate merging,
 * serialization/restore, and real Golden catalog recipes.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { scaleGoldenIngredients } from "../shared/golden-100/recipe-quality/crew-scale.js";
import {
  addManualItem,
  addRecipeToSession,
  applyPantryContext,
  archiveSessionToHistory,
  canonicalizeIngredientName,
  canonicalizeQuantityForScaling,
  clearCheckedItems,
  clientRecipeToShoppingInput,
  convertUnitValue,
  createEmptyPantryProfile,
  createPantryProfile,
  createShoppingSession,
  formatShoppingItemQuantity,
  isOptionalIngredient,
  normalizeIngredient,
  normalizeUnit,
  parseShoppingQuantity,
  PANTRY_SCHEMA_VERSION,
  removeRecipeFromSession,
  restorePantryProfile,
  restoreShoppingHistory,
  restoreShoppingSession,
  restoreUndoStack,
  serializeShoppingSession,
  setRecipeCrewSize,
  setStockLevel,
  splitPantryItems,
  startNewSessionFromHistory,
  toggleItemChecked,
  type PantryContext,
  type RawRecipeIngredient,
  type ShoppingRecipeInput,
  type ShoppingSession,
} from "../shared/shopping/index.js";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`[test-shopping-correctness] FAIL: ${name}`);
    throw err;
  }
}

function approx(actual: number | null, expected: number, msg: string): void {
  assert.ok(actual !== null && Math.abs(actual - expected) < 1e-9, `${msg} (got ${actual}, expected ${expected})`);
}

function recipe(slug: string, ingredients: RawRecipeIngredient[], baseServings = 8): ShoppingRecipeInput {
  return { slug, title: slug, baseServings, ingredients };
}

function build(recipes: ShoppingRecipeInput[], crew?: number, pantry?: PantryContext): ShoppingSession {
  return recipes.reduce(
    (s, r) => addRecipeToSession(s, r, crew ?? r.baseServings, pantry),
    createShoppingSession(),
  );
}

function item(session: ShoppingSession, key: string) {
  const found = session.list.items.find((i) => i.canonicalKey === key);
  assert.ok(found, `expected list item "${key}" — have: ${session.list.items.map((i) => i.canonicalKey).join(", ")}`);
  return found;
}

// --- 1. Embedded units ------------------------------------------------------

test("embedded unit is parsed from the quantity field", () => {
  assert.deepEqual(parseShoppingQuantity("3.5 lb"), { value: 3.5, unit: "lb" });
  assert.deepEqual(parseShoppingQuantity("3.5 lb", ""), { value: 3.5, unit: "lb" });
  assert.deepEqual(parseShoppingQuantity("1 1/2 lb"), { value: 1.5, unit: "lb" });
  assert.deepEqual(parseShoppingQuantity("½ cup"), { value: 0.5, unit: "cup" });
  assert.deepEqual(parseShoppingQuantity("1½", "cups"), { value: 1.5, unit: "cup" });
  assert.deepEqual(parseShoppingQuantity("2 tablespoons"), { value: 2, unit: "tbsp" });
});

test("explicit unit field is normalized (catalog casing, plurals, sizes, containers)", () => {
  assert.equal(normalizeUnit("Lb"), "lb");
  assert.equal(normalizeUnit("Tbsp"), "tbsp");
  assert.equal(normalizeUnit("Cups"), "cup");
  assert.equal(normalizeUnit("lbs."), "lb");
  assert.equal(normalizeUnit("large"), "count");
  assert.equal(normalizeUnit("large head"), "head");
  assert.equal(normalizeUnit("cans (15 oz)"), "can (15 oz)");
  assert.equal(normalizeUnit("cups packed"), "cup packed");
  assert.equal(normalizeUnit("strips"), "strip");
});

test("embedded unit survives normalization, scaling, and merging", () => {
  const n = normalizeIngredient({ name: "Chicken Thighs", quantity: "3.5 lb" });
  assert.deepEqual(n.parsed, { value: 3.5, unit: "lb" });

  const a = recipe("a", [{ name: "Boneless Chicken Thighs", quantity: "3.5 lb" }]);
  const b = recipe("b", [{ name: "Chicken Thighs", quantity: "1", unit: "Lb" }]);
  assert.equal(item(build([a, b]), "chicken thigh").quantityLabel, "4.5 lb");
  // Crew 16 doubles both — embedded "3.5 lb" must come back as "7 lb", not a bare 7.
  const scaled = item(build([a, b], 16), "chicken thigh");
  assert.equal(scaled.quantityLabel, "9 lb");
  assert.deepEqual(scaled.quantities, [{ family: "mass", unit: "lb", value: 9 }]);
});

// --- 2. Ranges ----------------------------------------------------------------

test("range syntaxes parse with both bounds; value is the upper bound", () => {
  for (const q of ["1-2", "1–2", "1—2", "1 to 2", "1 - 2"]) {
    assert.deepEqual(parseShoppingQuantity(q), { value: 2, min: 1, unit: "" }, q);
  }
  assert.deepEqual(parseShoppingQuantity("8–10 oz"), { value: 10, min: 8, unit: "oz" });
  assert.deepEqual(parseShoppingQuantity("1/2-1", "cup"), { value: 1, min: 0.5, unit: "cup" });
  assert.deepEqual(parseShoppingQuantity("1 to 2 cups"), { value: 2, min: 1, unit: "cup" });
  assert.deepEqual(parseShoppingQuantity("1 tomato"), { value: 1, unit: "tomato" }, "'to' inside a word is not a range");
});

test("range split across quantity/unit by upstream parsers is rejoined", () => {
  assert.deepEqual(parseShoppingQuantity("1", "-2 tbsp"), { value: 2, min: 1, unit: "tbsp" });
  assert.deepEqual(parseShoppingQuantity("1", "to 2 cups"), { value: 2, min: 1, unit: "cup" });
});

test("ranges are rewritten into a scaler-safe form without touching plain quantities", () => {
  assert.deepEqual(canonicalizeQuantityForScaling("1 to 2 cups", undefined), { quantity: "1–2 cups", unit: undefined });
  assert.deepEqual(canonicalizeQuantityForScaling("1/2-1", "cup"), { quantity: "0.5–1", unit: "cup" });
  assert.deepEqual(canonicalizeQuantityForScaling("1", "-2 tbsp"), { quantity: "1–2 tbsp", unit: undefined });
  assert.deepEqual(canonicalizeQuantityForScaling("3.5 lb", undefined), { quantity: "3.5 lb", unit: undefined });
  assert.deepEqual(canonicalizeQuantityForScaling("1 1/2", "Cups"), { quantity: "1 1/2", unit: "Cups" });
});

test("range metadata is preserved through the list; purchase uses the upper bound", () => {
  const salsaA = recipe("tacos", [{ name: "Salsa", quantity: "1 to 2", unit: "cups" }]);
  const salsaB = recipe("nachos", [{ name: "Salsa", quantity: "1", unit: "cup" }]);
  const s = build([salsaA, salsaB]);
  const salsa = item(s, "salsa");
  assert.equal(salsa.quantityLabel, "2–3 cups");
  assert.deepEqual(salsa.quantities, [{ family: "volume", unit: "cup", value: 3, min: 2 }]);
  const fromTacos = salsa.contributions.find((c) => c.recipeSlug === "tacos")!;
  assert.equal(fromTacos.value, 2, "purchase value = upper bound");
  assert.equal(fromTacos.min, 1, "lower bound kept");
  assert.equal(s.recipes[0].ingredients[0].quantity, "1 to 2", "original recipe data untouched");

  const scaled = item(build([salsaA], 16), "salsa");
  assert.equal(scaled.quantityLabel, "2–4 cups", "both bounds scale with crew size");
});

test("planner-shaped split range lands as a range on the list", () => {
  const input = clientRecipeToShoppingInput(
    "shift-dinner",
    { title: "Chili", servings: 8, ingredients: [{ name: "Chili Powder", qty: 1, unit: "-2 tbsp" }] },
    8,
  );
  assert.equal(item(build([input]), "chili powder").quantityLabel, "1–2 tbsp");
});

// --- 3. Same-family conversion -----------------------------------------------

test("volume family converts exactly: tsp/tbsp/cup/fl oz/ml/l", () => {
  approx(convertUnitValue(3, "tsp", "tbsp"), 1, "3 tsp = 1 tbsp");
  approx(convertUnitValue(1, "cup", "tbsp"), 16, "1 cup = 16 tbsp");
  approx(convertUnitValue(1, "fl oz", "tbsp"), 2, "1 fl oz = 2 tbsp");
  approx(convertUnitValue(1, "l", "ml"), 1000, "1 l = 1000 ml");
  approx(convertUnitValue(1, "cup", "ml"), 236.5882365, "1 US cup in ml");
});

test("mass family converts exactly: g/kg/oz/lb", () => {
  approx(convertUnitValue(1, "kg", "g"), 1000, "1 kg = 1000 g");
  approx(convertUnitValue(1, "lb", "oz"), 16, "1 lb = 16 oz");
  approx(convertUnitValue(1, "lb", "g"), 453.59237, "1 lb in g");
});

test("no density or cross-family conversion", () => {
  assert.equal(convertUnitValue(1, "cup", "g"), null);
  assert.equal(convertUnitValue(1, "oz", "fl oz"), null, "weight oz is not fluid oz");
  assert.equal(convertUnitValue(1, "can", "oz"), null);
  assert.equal(convertUnitValue(1, "clove", "count"), null);
});

test("merged same-family totals use the recipes' own units", () => {
  const cases: [RawRecipeIngredient, RawRecipeIngredient, string][] = [
    [{ name: "Milk", quantity: "8", unit: "tbsp" }, { name: "Milk", quantity: "0.5", unit: "cup" }, "1 cup"],
    [{ name: "Stock", quantity: "500", unit: "ml" }, { name: "Stock", quantity: "1", unit: "l" }, "1.5 L"],
    [{ name: "Rice", quantity: "500", unit: "g" }, { name: "Rice", quantity: "1", unit: "kg" }, "1.5 kg"],
    [{ name: "Cheddar", quantity: "8", unit: "oz" }, { name: "Cheddar", quantity: "1", unit: "lb" }, "1.5 lb"],
  ];
  for (const [a, b, expected] of cases) {
    const s = build([recipe("a", [a]), recipe("b", [b])]);
    assert.equal(s.list.items[0].quantityLabel, expected, `${a.quantity} ${a.unit} + ${b.quantity} ${b.unit}`);
  }
});

test("incompatible units stay separate lines within the item", () => {
  const flour = build([
    recipe("a", [{ name: "Bread Flour", quantity: "2", unit: "cups" }]),
    recipe("b", [{ name: "Bread Flour", quantity: "8", unit: "oz" }]),
  ]);
  const f = item(flour, "bread flour");
  assert.equal(f.quantityLabel, "2 cups + 8 oz");
  assert.equal(f.quantities!.length, 2);

  const cans = build([
    recipe("a", [{ name: "Crushed Tomatoes", quantity: "2", unit: "cans (15 oz)" }]),
    recipe("b", [{ name: "Crushed Tomatoes", quantity: "1", unit: "cans (28 oz)" }]),
  ]);
  assert.equal(item(cans, "tomato").quantityLabel, "2 cans (15 oz) + 1 can (28 oz)", "different can sizes never merge");
});

test("metric/imperial display is a view over the same contributions", () => {
  const s = build([
    recipe("a", [{ name: "Ground Beef", quantity: "1", unit: "lb" }, { name: "Soy Sauce", quantity: "2", unit: "Tbsp" }]),
    recipe("b", [{ name: "Rice", quantity: "500", unit: "g" }]),
  ]);
  const beef = item(s, "ground beef");
  assert.equal(formatShoppingItemQuantity(beef), "1 lb", "no system = as written");
  assert.equal(formatShoppingItemQuantity(beef, "us"), "1 lb", "already US: exact, unchanged");
  assert.equal(formatShoppingItemQuantity(beef, "metric"), "460 g", "converted totals round UP for purchase");
  assert.equal(formatShoppingItemQuantity(item(s, "soy sauce"), "metric"), "30 ml");
  assert.equal(formatShoppingItemQuantity(item(s, "rice"), "us"), "1.25 lb");
  assert.equal(formatShoppingItemQuantity(item(s, "rice"), "metric"), "500 g");
  assert.equal(beef.quantityLabel, "1 lb", "stored label is unchanged by display formatting");
});

// --- 4. Optional ingredients --------------------------------------------------

test("one optional rule for flag, '(optional)' name, and 'optional…' notes", () => {
  assert.equal(isOptionalIngredient({ name: "Bacon", optional: true }), true);
  assert.equal(isOptionalIngredient({ name: "Warm Chili (optional)" }), true);
  assert.equal(isOptionalIngredient({ name: "Provolone", notes: "optional" }), true);
  assert.equal(isOptionalIngredient({ name: "Chili Flakes", notes: "optional, for the line" }), true);
  assert.equal(isOptionalIngredient({ name: "Jalapeño", notes: "half sliced for garnish" }), false);
  assert.equal(isOptionalIngredient({ name: "Cilantro" }), false);
});

test("optional ingredients are excluded from recipe, planner, and merged lists alike", () => {
  const page = recipe("page", [
    { name: "Ground Beef", quantity: "2", unit: "lb" },
    { name: "Bacon", quantity: "1", unit: "lb", optional: true },
    { name: "Provolone", quantity: "8", unit: "count", notes: "optional" },
  ]);
  const planner = clientRecipeToShoppingInput(
    "shift-dinner",
    {
      title: "Tacos",
      servings: 8,
      ingredients: [
        { name: "Bacon", qty: 1, unit: "lb" },
        { name: "Cilantro (optional)", qty: 1, unit: "bunch" },
      ],
    },
    8,
  );

  const recipeOnly = build([page]);
  assert.equal(recipeOnly.list.items.some((i) => i.canonicalKey === "bacon"), false);
  assert.equal(recipeOnly.list.items.some((i) => i.canonicalKey === "provolone"), false);
  assert.deepEqual(
    recipeOnly.list.excludedOptional?.map((e) => e.name),
    ["Bacon", "Provolone"],
    "excluded optional ingredients are recorded, not silently dropped",
  );

  const plannerOnly = build([planner]);
  assert.equal(plannerOnly.list.items.some((i) => i.canonicalKey === "cilantro"), false);

  const merged = build([page, planner]);
  const bacon = item(merged, "bacon");
  assert.equal(bacon.contributions.length, 1, "only the recipe that requires bacon contributes");
  assert.equal(bacon.contributions[0].recipeSlug, "shift-dinner");
  assert.equal(bacon.quantityLabel, "1 lb");
});

// --- 5. Pantry on planner-generated lists -------------------------------------

const plannerRecipe = clientRecipeToShoppingInput(
  "shift-dinner",
  {
    title: "Garlic Chicken",
    servings: 8,
    ingredients: [
      { name: "Chicken Thighs", qty: 4, unit: "lb" },
      { name: "Kosher Salt", qty: 2, unit: "tsp" },
      { name: "Unsalted Butter", qty: 4, unit: "Tbsp" },
      { name: "Extra-Virgin Olive Oil", qty: 3, unit: "Tbsp" },
      { name: "Kosher Salt & Black Pepper", qty: 0, unit: "to taste" },
      { name: "Smoked Paprika", qty: 1, unit: "tsp" },
    ],
  },
  8,
);

test("default staples hide catalog-style variants on planner lists", () => {
  const s = build([plannerRecipe], 8, { personal: createPantryProfile() });
  const { active, skipped } = splitPantryItems(s.list.items);
  const skippedKeys = skipped.map((i) => i.canonicalKey).sort();
  assert.deepEqual(skippedKeys, [
    "kosher salt",
    "kosher salt and black pepper",
    "unsalted butter",
    "virgin olive oil",
  ]);
  assert.ok(active.some((i) => i.canonicalKey === "chicken thigh"));
  assert.ok(active.some((i) => i.canonicalKey === "smoked paprika"), "smoked paprika is not plain paprika");
});

test("planner list built without a pantry can have pantry applied afterwards", () => {
  const s = applyPantryContext(build([plannerRecipe]), { hall: createPantryProfile() });
  const salt = item(s, "kosher salt");
  assert.equal(salt.inPantry, true);
  assert.equal(salt.pantrySource, "hall");
});

test("an exact pantry entry beats the staple alias; compounds need every part", () => {
  const personal = setStockLevel(createPantryProfile(), "kosher salt", "never");
  const s = build([plannerRecipe], 8, { personal });
  assert.equal(item(s, "kosher salt").inPantry, false, "explicit 'never' on kosher salt wins over salt=always");

  const noPepper = setStockLevel(createEmptyPantryProfile(), "salt", "always");
  const s2 = build([plannerRecipe], 8, { personal: noPepper });
  assert.equal(item(s2, "kosher salt and black pepper").inPantry, false, "pepper not stocked, so the compound stays");
});

// --- 6. Manual items across rebuilds ------------------------------------------

test("manual items survive every rebuild path with state intact", () => {
  const tacos = recipe("tacos", [{ name: "Ground Beef", quantity: "2", unit: "lb" }]);
  const chili = recipe("chili", [{ name: "Kidney Beans", quantity: "2", unit: "cans" }]);
  let s = addManualItem(build([tacos]), { name: "Paper Towels", quantityLabel: "2 rolls" });
  const manual = s.list.items.find((i) => i.isManual)!;
  s = toggleItemChecked(s, manual.id);

  s = addRecipeToSession(s, chili, 8);
  s = setRecipeCrewSize(s, "tacos", 16);
  s = removeRecipeFromSession(s, "chili");
  s = applyPantryContext(s, { personal: createPantryProfile() });

  const after = s.list.items.find((i) => i.isManual)!;
  assert.equal(after.id, manual.id);
  assert.equal(after.checked, true);
  assert.equal(after.quantityLabel, "2 rolls");
  assert.equal(formatShoppingItemQuantity(after, "metric"), "2 rolls", "manual text is never converted");
});

test("'shop this again' carries manual items over, unchecked", () => {
  let s = addManualItem(build([recipe("tacos", [{ name: "Onion", quantity: "2" }])]), { name: "Ice" });
  s = toggleItemChecked(s, s.list.items.find((i) => i.isManual)!.id);
  const { entry } = archiveSessionToHistory(s);
  const again = startNewSessionFromHistory(entry);
  const ice = again.list.items.find((i) => i.isManual && i.displayName === "Ice");
  assert.ok(ice, "manual item carried over");
  assert.equal(ice!.checked, false);
  assert.ok(again.list.items.some((i) => i.canonicalKey === "onion"));
});

// --- 7. Eggs / count units ----------------------------------------------------

test("eggs merge across 'count', bare numbers, and size words", () => {
  const s = build([
    recipe("a", [{ name: "Large eggs", quantity: "24", unit: "count" }]),
    recipe("b", [{ name: "Eggs", quantity: "6" }]),
    recipe("c", [{ name: "Egg", quantity: "2", unit: "large" }]),
  ]);
  const eggs = item(s, "egg");
  assert.equal(eggs.quantityLabel, "32 count");
  assert.deepEqual(eggs.quantities, [{ family: "count", unit: "count", value: 32 }]);
});

test("count items scale to whole numbers matching the recipe page; bare counts stay bare", () => {
  const eggs: RawRecipeIngredient = { name: "Large eggs", quantity: "24", unit: "count" };
  const s = build([recipe("a", [eggs])], 12);
  const pageQty = scaleGoldenIngredients([eggs], 8, 12)[0].quantity;
  assert.equal(item(s, "egg").quantityLabel, `${pageQty} count`, "shopping uses the same crew scaler as the recipe page");
  assert.ok(Number.isInteger(item(s, "egg").quantities![0].value));
  const limes = build([recipe("a", [{ name: "Limes", quantity: "6" }]), recipe("b", [{ name: "Lime", quantity: "2" }])]);
  assert.equal(item(limes, "lime").quantityLabel, "8");
});

// --- 8. Seasonings -------------------------------------------------------------

test("seasoning tsp + tbsp converts; 'to taste' is kept once", () => {
  const s = build([
    recipe("a", [{ name: "Garlic Powder", quantity: "1", unit: "Tsp" }, { name: "Salt", quantity: "to taste" }]),
    recipe("b", [{ name: "Garlic Powder", quantity: "1", unit: "Tbsp" }, { name: "Salt", quantity: "to taste" }]),
    recipe("c", [{ name: "Garlic Powder", quantity: "to taste" }]),
  ]);
  assert.equal(item(s, "garlic powder").quantityLabel, "1.5 tbsp + to taste");
  assert.equal(item(s, "salt").quantityLabel, "to taste");
});

test("seasonings scale sub-linearly and keep their unit", () => {
  const s = build([recipe("a", [{ name: "Ground Cumin", quantity: "1", unit: "tsp" }])], 16);
  const q = item(s, "ground cumin").quantities![0];
  assert.equal(q.unit, "tsp");
  assert.ok(q.value > 1 && q.value < 2, `sub-linear: doubling crew gives < 2 tsp (got ${q.value})`);
});

// --- 9. Duplicate merging -------------------------------------------------------

test("variant names merge into one line", () => {
  const s = build([
    recipe("a", [
      { name: "Onions", quantity: "2" },
      { name: "Tomatoes", quantity: "2" },
      { name: "Boneless, Skinless Chicken Thighs", quantity: "2", unit: "lb" },
    ]),
    recipe("b", [
      { name: "Onion, diced", quantity: "1" },
      { name: "Tomato", quantity: "1" },
      { name: "Chicken Thighs", quantity: "1.5", unit: "Lb" },
    ]),
  ]);
  assert.equal(item(s, "onion").quantityLabel, "3");
  assert.equal(item(s, "tomato").quantityLabel, "3");
  assert.equal(item(s, "chicken thigh").quantityLabel, "3.5 lb");
  assert.equal(canonicalizeIngredientName("Kosher Salt & Black Pepper"), "kosher salt and black pepper");
});

test("re-adding the same recipe replaces it instead of double counting", () => {
  const tacos = recipe("tacos", [{ name: "Ground Beef", quantity: "2", unit: "lb" }]);
  let s = addRecipeToSession(createShoppingSession(), tacos, 8);
  s = addRecipeToSession(s, tacos, 8);
  assert.equal(item(s, "ground beef").quantityLabel, "2 lb");
});

// --- 10. Serialization / restore -----------------------------------------------

test("serialize -> restore round-trips a full session exactly", () => {
  let s = build(
    [
      recipe("a", [{ name: "Salsa", quantity: "1 to 2", unit: "cups" }, { name: "Bacon", quantity: "1", unit: "lb", optional: true }]),
      recipe("b", [{ name: "Ground Beef", quantity: "3.5 lb" }]),
    ],
    12,
    { personal: createPantryProfile() },
  );
  s = addManualItem(s, { name: "Napkins", quantityLabel: "1 pack" });
  s = toggleItemChecked(s, item(s, "salsa").id);
  const restored = restoreShoppingSession(serializeShoppingSession(s));
  assert.ok(restored);
  assert.deepStrictEqual(JSON.parse(serializeShoppingSession(restored)), JSON.parse(serializeShoppingSession(s)));
});

test("restore heals labels written by the old parser without resurrecting cleared items", () => {
  let s = build([
    recipe("a", [{ name: "Ground Beef", quantity: "3.5 lb" }, { name: "Buns", quantity: "8", unit: "count" }]),
  ]);
  s = toggleItemChecked(s, item(s, "bun").id);
  s = clearCheckedItems(s);
  const legacy = JSON.parse(serializeShoppingSession(s));
  const beef = legacy.list.items.find((i: { canonicalKey: string }) => i.canonicalKey === "ground beef");
  beef.quantityLabel = "3.5";
  beef.contributions[0].unit = "";
  delete beef.quantities;

  const restored = restoreShoppingSession(legacy)!;
  assert.equal(item(restored, "ground beef").quantityLabel, "3.5 lb");
  assert.equal(restored.list.items.some((i) => i.canonicalKey === "bun"), false, "cleared items stay cleared");
});

test("restore rejects non-sessions and drops only malformed parts", () => {
  assert.equal(restoreShoppingSession("not json"), null);
  assert.equal(restoreShoppingSession({ schemaVersion: 99 }), null);
  assert.equal(restoreShoppingSession(null), null);

  const s = addManualItem(createShoppingSession(), { name: "Ice" });
  const raw = JSON.parse(serializeShoppingSession(s));
  raw.list.items.push({ bogus: true }, null);
  raw.recipes.push({ slug: "broken" });
  raw.mode = "nonsense";
  const restored = restoreShoppingSession(raw)!;
  assert.equal(restored.list.items.length, 1);
  assert.equal(restored.recipes.length, 0);
  assert.equal(restored.mode, "planning");

  assert.equal(restoreUndoStack([raw, "junk", { schemaVersion: 1 }]).length, 1);
  const { entry } = archiveSessionToHistory(s);
  const history = restoreShoppingHistory(JSON.stringify({ schemaVersion: 1, entries: [entry, { id: "x" }] }));
  assert.equal(history!.entries.length, 1);
});

test("stored pantry keys migrate to current canonical keys", () => {
  const migrated = restorePantryProfile({
    schemaVersion: PANTRY_SCHEMA_VERSION,
    items: { eggs: "always", tomatoe: "usually", "short ribs": "always", egg: "never", junk: "maybe" },
    updatedAt: "2026-01-01T00:00:00.000Z",
  })!;
  assert.deepEqual(migrated.items, { egg: "never", tomato: "usually", "short rib": "always" });
  assert.equal(restorePantryProfile({ schemaVersion: 1, items: {} }), null);
});

// --- 11. Real Golden catalog recipes ---------------------------------------------

interface CatalogPage {
  slug: string;
  title: string;
  baseServings?: number;
  crewSize?: number;
  ingredients: RawRecipeIngredient[];
}

const PAGES_DIR = join(process.cwd(), "client/public/catalog/golden-100/pages");
function loadPage(slug: string): CatalogPage {
  return JSON.parse(readFileSync(join(PAGES_DIR, `${slug}.json`), "utf8")) as CatalogPage;
}
function pageInput(page: CatalogPage): ShoppingRecipeInput {
  return {
    slug: page.slug,
    title: page.title,
    baseServings: page.baseServings ?? page.crewSize ?? 8,
    ingredients: page.ingredients,
  };
}

test("catalog: smash burgers", () => {
  const s = build([pageInput(loadPage("smash-burgers"))], undefined, { personal: createPantryProfile() });
  assert.equal(s.list.items.some((i) => i.canonicalKey === "bacon"), false, "flagged-optional bacon excluded");
  assert.equal(item(s, "unsalted butter").quantityLabel, "8 tbsp");
  assert.equal(item(s, "iceberg lettuce").quantityLabel, "1 head");
  assert.equal(item(s, "yellow onion").quantityLabel, "4 count");
  assert.equal(item(s, "kosher salt and black pepper").quantityLabel, "to taste");
  const skipped = splitPantryItems(s.list.items).skipped.map((i) => i.canonicalKey).sort();
  assert.deepEqual(skipped, ["garlic powder", "kosher salt and black pepper", "neutral high heat oil", "unsalted butter"]);
});

test("catalog: beef dip excludes notes-only optional items", () => {
  const s = build([pageInput(loadPage("beef-dip"))]);
  assert.equal(s.list.items.some((i) => i.canonicalKey === "provolone slice"), false);
  assert.equal(s.list.items.some((i) => i.canonicalKey === "unsalted butter"), false);
  assert.equal(item(s, "kosher salt").quantityLabel, "2 tbsp");
  assert.equal(item(s, "low sodium beef broth").quantityLabel, "6 cups");
});

test("catalog: merged burgers + beef dip combine shared condiments", () => {
  const s = build([pageInput(loadPage("smash-burgers")), pageInput(loadPage("beef-dip"))]);
  assert.equal(item(s, "mayonnaise").quantityLabel, "1.5 cups");
  assert.equal(item(s, "worcestershire sauce").quantityLabel, "3 tbsp");
});

test("catalog: clove vs count garlic stays honest rather than guessed", () => {
  const s = build([pageInput(loadPage("beef-dip")), pageInput(loadPage("chicken-tortilla-soup-for-the-hall"))]);
  assert.equal(item(s, "garlic clove").quantityLabel, "6 cloves + 6 count");
  assert.equal(s.list.items.some((i) => i.canonicalKey === "shredded monterey jack"), false, "'optional at the line'");
});

test("catalog: breakfast burrito bar eggs scale as whole counts", () => {
  const page = loadPage("breakfast-burrito-bar");
  assert.equal(item(build([pageInput(page)]), "egg").quantityLabel, "24 count");
  const scaled = item(build([pageInput(page)], 12), "egg").quantities![0];
  assert.equal(scaled.unit, "count");
  assert.ok(Number.isInteger(scaled.value) && scaled.value > 24);
  assert.equal(build([pageInput(page)]).list.items.some((i) => i.canonicalKey === "hot sauce"), false);
});

test("catalog sweep: every recipe at base and crew 16 keeps units and yields sane quantities", () => {
  const files = readdirSync(PAGES_DIR).filter((f) => f.endsWith(".json"));
  assert.ok(files.length >= 100, `expected the full catalog, found ${files.length}`);
  for (const file of files) {
    const page = JSON.parse(readFileSync(join(PAGES_DIR, file), "utf8")) as CatalogPage;
    const input = pageInput(page);
    for (const crew of [input.baseServings, 16]) {
      const s = addRecipeToSession(createShoppingSession(), input, crew);
      for (const it of s.list.items) {
        assert.ok(!/NaN|undefined|Infinity/.test(it.quantityLabel), `${page.slug}@${crew}: bad label "${it.quantityLabel}"`);
        for (const c of it.contributions) {
          assert.ok(Number.isFinite(c.value) && c.value >= 0, `${page.slug}@${crew}: bad value for ${it.displayName}`);
          if (c.min !== undefined) assert.ok(c.min <= c.value, `${page.slug}: range min > max`);
        }
        for (const q of it.quantities ?? []) {
          assert.equal(q.unit, q.unit.toLowerCase(), `${page.slug}: unit not normalized "${q.unit}"`);
        }
      }
      for (const ing of page.ingredients) {
        if (isOptionalIngredient(ing)) continue;
        const key = canonicalizeIngredientName(ing.name);
        const listed = s.list.items.find((i) => i.canonicalKey === key);
        assert.ok(listed, `${page.slug}@${crew}: required ingredient "${ing.name}" missing`);
        if (ing.unit?.trim() && parseShoppingQuantity(ing.quantity)) {
          const contribution = listed!.contributions.find((c) => c.recipeSlug === page.slug && c.unit);
          assert.ok(contribution, `${page.slug}@${crew}: unit "${ing.unit}" lost for "${ing.name}"`);
        }
      }
    }
  }
});

console.log(`[test-shopping-correctness] OK (${passed} tests)`);
