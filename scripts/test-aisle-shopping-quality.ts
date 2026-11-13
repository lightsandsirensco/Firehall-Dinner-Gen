/**
 * Aisle-organized shopping lists — classification, combining, crew scaling,
 * aisle moves, checkbox persistence and exports, on controlled recipes and on
 * every real catalog recipe.
 * Run: npx tsx scripts/test-aisle-shopping-quality.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  addManualItem,
  addRecipeToSession,
  aisleForStoredSection,
  aisleSectionsFromItems,
  buildAislePrintHtml,
  createShoppingSession,
  DEPARTMENT_ORDER,
  formatAisleListText,
  isNotPurchased,
  isOptionalIngredient,
  moveItemToDepartment,
  normalizeIngredient,
  restoreShoppingSession,
  serializeShoppingSession,
  setRecipeCrewSize,
  toggleItemChecked,
  type Department,
  type RawRecipeIngredient,
  type ShoppingListItem,
  type ShoppingRecipeInput,
  type ShoppingSession,
} from "../shared/shopping/index.js";
import { applyShiftListOp } from "../shared/shift-plan/shopping.js";
import { shiftListOpSchema } from "../shared/shift-plan/schema.js";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n    ${(err as Error).message.split("\n").join("\n    ")}`);
  }
}

const ing = (name: string, quantity?: string, unit?: string, notes?: string): RawRecipeIngredient => ({
  name,
  ...(quantity ? { quantity } : {}),
  ...(unit ? { unit } : {}),
  ...(notes ? { notes } : {}),
});

function recipe(slug: string, baseServings: number, ingredients: RawRecipeIngredient[]): ShoppingRecipeInput {
  return { slug, title: slug.replace(/-/g, " "), baseServings, ingredients };
}

function build(recipes: ShoppingRecipeInput[], crew?: number): ShoppingSession {
  return recipes.reduce((s, r) => addRecipeToSession(s, r, crew ?? r.baseServings), createShoppingSession());
}

function find(s: ShoppingSession, key: string): ShoppingListItem {
  const item = s.list.items.find((i) => i.canonicalKey === key);
  assert.ok(item, `no item "${key}" in [${s.list.items.map((i) => i.canonicalKey).join(", ")}]`);
  return item!;
}

/** No canonical key twice, no product name in two aisles, every item in a real aisle. */
function assertListIntegrity(items: ShoppingListItem[], label: string): void {
  const keys = new Set<string>();
  const nameAisle = new Map<string, Department>();
  for (const item of items) {
    assert.ok(DEPARTMENT_ORDER.includes(item.department), `${label}: "${item.displayName}" has unknown aisle "${item.department}"`);
    assert.ok(!keys.has(item.canonicalKey), `${label}: duplicate line "${item.canonicalKey}"`);
    keys.add(item.canonicalKey);
    const name = item.displayName.toLowerCase();
    const seen = nameAisle.get(name);
    assert.ok(!seen || seen === item.department, `${label}: "${item.displayName}" in both ${seen} and ${item.department}`);
    nameAisle.set(name, item.department);
  }
}

// --- 1. Classification across every aisle ---------------------------------------

const EXPECTED: Array<[RawRecipeIngredient, Department]> = [
  [ing("yellow onion"), "Produce"],
  [ing("garlic cloves"), "Produce"],
  [ing("fresh cilantro"), "Produce"],
  [ing("fresh thyme", "4", "sprigs"), "Produce"],
  [ing("Thai bird chilies"), "Produce"],
  [ing("boneless skinless chicken thighs"), "Meat & Seafood"],
  [ing("ground beef (80/20)"), "Meat & Seafood"],
  [ing("raw shrimp, peeled"), "Meat & Seafood"],
  [ing("salmon fillets"), "Meat & Seafood"],
  [ing("Jalapeño Cheddar Sausage Links"), "Meat & Seafood"],
  [ing("large eggs"), "Dairy & Eggs"],
  [ing("shredded mozzarella"), "Dairy & Eggs"],
  [ing("fresh mozzarella"), "Dairy & Eggs"],
  [ing("heavy cream"), "Dairy & Eggs"],
  [ing("hamburger buns"), "Bakery & Bread"],
  [ing("Irish soda bread"), "Bakery & Bread"],
  [ing("frozen corn"), "Frozen Foods"],
  [ing("frozen shrimp"), "Frozen Foods"],
  [ing("vanilla ice cream"), "Frozen Foods"],
  [ing("diced tomatoes", "2", "cans"), "Pantry & Canned Goods"],
  [ing("black beans, drained and rinsed", "2", "cans (15 oz)"), "Pantry & Canned Goods"],
  [ing("chicken broth"), "Pantry & Canned Goods"],
  [ing("baking soda"), "Pantry & Canned Goods"],
  [ing("cream of tartar"), "Pantry & Canned Goods"],
  [ing("dried red kidney beans"), "Pantry & Canned Goods"],
  [ing("long-grain white rice"), "Pasta, Rice & Grains"],
  [ing("dried lasagna noodles"), "Pasta, Rice & Grains"],
  [ing("olive oil"), "Condiments, Sauces & Oils"],
  [ing("red wine vinaigrette"), "Condiments, Sauces & Oils"],
  [ing("pickled jalapeños", "1", "jar"), "Condiments, Sauces & Oils"],
  [ing("gochujang"), "Condiments, Sauces & Oils"],
  [ing("thyme", "1", "tsp"), "Spices & Seasonings"],
  [ing("cloves", "1", "tsp"), "Spices & Seasonings"],
  [ing("smoked paprika"), "Spices & Seasonings"],
  [ing("za'atar"), "Spices & Seasonings"],
  [ing("dark beer"), "Beverages"],
  [ing("dry white wine"), "Beverages"],
  [ing("cedar planks"), "Other"],
  [ing("aluminum foil"), "Other"],
];

test("classification: representative items land in the expected aisle", () => {
  const wrong = EXPECTED.map(([raw, want]) => [raw, want, normalizeIngredient(raw).department] as const).filter(
    ([, want, got]) => want !== got,
  );
  assert.equal(wrong.length, 0, wrong.map(([r, w, g]) => `${r.name} [${r.unit ?? ""}]: want ${w}, got ${g}`).join("\n"));
});

test("classification: unknown items fall back to Other and are still listed", () => {
  const s = build([recipe("mystery", 4, [ing("zorblax root", "1"), ing("ground cumin", "1", "tsp")])]);
  assert.equal(find(s, "zorblax root").department, "Other");
  const sections = aisleSectionsFromItems(s.list.items);
  assert.deepEqual(sections.map((x) => x.title), ["Spices & Seasonings", "Other"]);
});

// --- 2. Combining rules ----------------------------------------------------------

const CHILI = recipe("chili", 4, [
  ing("ground beef", "1", "lb"),
  ing("yellow onion", "1", "", "diced"),
  ing("garlic cloves", "3", "", "minced"),
  ing("diced tomatoes", "1", "can (28 oz)"),
  ing("crushed tomatoes", "1", "can (28 oz)"),
  ing("frozen corn", "1", "cup"),
  ing("chili powder", "2", "tbsp"),
  ing("milk", "1", "cup"),
  ing("jalapeño", "1"),
]);
const FAJITAS = recipe("fajitas", 4, [
  ing("ground beef", "8", "oz"),
  ing("yellow onions", "2", "", "sliced"),
  ing("garlic", "2", "cloves", "sliced"),
  ing("Roma tomatoes", "2", "", "diced"),
  ing("corn on the cob", "2", "ears"),
  ing("chili powder", "1", "tsp"),
  ing("milk", "8", "tbsp"),
  ing("jalapeno", "1"),
  ing("fresh mozzarella", "8", "oz"),
  ing("shredded mozzarella", "1", "cup"),
]);

test("combining: shared ingredients appear once with converted totals", () => {
  const s = build([CHILI, FAJITAS]);
  assertListIntegrity(s.list.items, "chili+fajitas");
  assert.equal(find(s, "ground beef").quantityLabel, "1½ lb");
  assert.equal(find(s, "milk").quantityLabel, "1½ cups");
  assert.equal(find(s, "yellow onion").quantityLabel, "3");
  assert.equal(find(s, "jalapeno").contributions.length, 2, "jalapeño and jalapeno are the same pepper");
  const chili = find(s, "chili powder");
  assert.equal(chili.contributions.length, 2);
  assert.equal(chili.department, "Spices & Seasonings");
});

test("combining: different products with similar names stay separate", () => {
  const s = build([CHILI, FAJITAS]);
  const tomatoes = s.list.items.filter((i) => /tomato/.test(i.canonicalKey));
  assert.deepEqual(
    tomatoes.map((i) => [i.canonicalKey, i.department]).sort(),
    [
      ["canned crushed tomato", "Pantry & Canned Goods"],
      ["canned diced tomato", "Pantry & Canned Goods"],
      ["roma tomato", "Produce"],
    ],
  );
  const corn = s.list.items.filter((i) => /corn/.test(i.canonicalKey)).map((i) => i.department).sort();
  assert.deepEqual(corn, ["Frozen Foods", "Produce"]);
  const mozz = s.list.items.filter((i) => /mozzarella/.test(i.canonicalKey)).map((i) => i.canonicalKey).sort();
  assert.deepEqual(mozz, ["fresh mozzarella", "mozzarella"]);
});

test("combining: per-recipe prep differences are preserved", () => {
  const s = build([CHILI, FAJITAS]);
  const onion = find(s, "yellow onion");
  assert.match(onion.notes ?? "", /diced/);
  assert.match(onion.notes ?? "", /sliced/);
  const garlic = find(s, "garlic");
  assert.match(garlic.notes ?? "", /minced/);
  assert.match(garlic.notes ?? "", /sliced/);
});

// --- 3. Crew-size scaling --------------------------------------------------------

test("scaling: quantities follow crew size, base 4 -> 8 -> 12 -> back to 4", () => {
  let s = build([CHILI]);
  assert.equal(find(s, "ground beef").quantityLabel, "1 lb");
  s = setRecipeCrewSize(s, "chili", 8);
  assert.equal(find(s, "ground beef").quantityLabel, "2 lb");
  assert.equal(find(s, "yellow onion").quantityLabel, "2");
  s = setRecipeCrewSize(s, "chili", 12);
  assert.equal(find(s, "ground beef").quantityLabel, "3 lb");
  s = setRecipeCrewSize(s, "chili", 4);
  assert.equal(find(s, "ground beef").quantityLabel, "1 lb");
  assertListIntegrity(s.list.items, "rescaled chili");
});

test("scaling: two meals at different crew sizes combine at their own scale", () => {
  let s = build([CHILI, FAJITAS]);
  s = setRecipeCrewSize(s, "chili", 8); // 2 lb
  s = setRecipeCrewSize(s, "fajitas", 12); // 1.5 lb
  assert.equal(find(s, "ground beef").quantityLabel, "3½ lb");
});

// --- 4. Moves, checks, manual items, persistence ---------------------------------

test("move: a shopper's aisle choice survives rescaling and adding meals", () => {
  let s = build([CHILI]);
  const jalapeno = find(s, "jalapeno");
  s = moveItemToDepartment(s, jalapeno.id, "Condiments, Sauces & Oils");
  s = toggleItemChecked(s, find(s, "ground beef").id);
  s = setRecipeCrewSize(s, "chili", 10);
  s = addRecipeToSession(s, FAJITAS, 4);
  const moved = find(s, "jalapeno");
  assert.equal(moved.department, "Condiments, Sauces & Oils");
  assert.equal(moved.departmentOverride, true);
  assert.equal(find(s, "ground beef").checked, true, "check survives rebuild");
  assertListIntegrity(s.list.items, "after move");
});

test("persistence: checks, moves and manual items survive save + restore", () => {
  let s = build([CHILI, FAJITAS]);
  s = toggleItemChecked(s, find(s, "milk").id);
  s = moveItemToDepartment(s, find(s, "chili powder").id, "Pantry & Canned Goods");
  s = addManualItem(s, { name: "paper towels" });
  s = addManualItem(s, { name: "2% milk" });
  const restored = restoreShoppingSession(JSON.parse(serializeShoppingSession(s)));
  assert.ok(restored);
  assert.equal(find(restored!, "milk").checked, true);
  assert.equal(find(restored!, "chili powder").department, "Pantry & Canned Goods");
  assert.equal(restored!.list.items.find((i) => i.displayName === "paper towels")?.department, "Other");
  assert.equal(restored!.list.items.find((i) => i.displayName === "2% milk")?.department, "Dairy & Eggs");
  assert.equal(restored!.list.items.length, s.list.items.length, "nothing lost or duplicated on restore");
});

test("shift list ops: move and check through the server op path", () => {
  const wire = (department: string) => ({ shiftKey: "2026-10-08T07:00", op: { type: "move", itemId: "x", department } });
  const ok = shiftListOpSchema.safeParse(wire("Frozen Foods"));
  assert.ok(ok.success, ok.success ? "" : ok.error.message);
  assert.ok(!shiftListOpSchema.safeParse(wire("Aisle 9")).success);
  const session = build([CHILI]);
  const id = find(session, "jalapeno").id;
  let state = applyShiftListOp({ session, undo: [] }, { type: "move", itemId: id, department: "Other" });
  assert.equal(state.changed, true);
  state = applyShiftListOp(state, { type: "check", itemId: id, checked: true });
  const item = state.session.list.items.find((i) => i.id === id)!;
  assert.equal(item.department, "Other");
  assert.equal(item.checked, true);
  state = applyShiftListOp(state, { type: "undo" });
  state = applyShiftListOp(state, { type: "undo" });
  assert.equal(state.session.list.items.find((i) => i.id === id)!.department, "Produce", "undo restores the aisle");
});

// --- 5. Exports and the firehouse run ---------------------------------------------

test("export: aisle walking order, no empty aisles, every item exactly once", () => {
  const s = build([CHILI, FAJITAS]);
  const sections = aisleSectionsFromItems(s.list.items);
  const order = sections.map((x) => DEPARTMENT_ORDER.indexOf(x.title as Department));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), "sections in walking order");
  assert.ok(sections.every((x) => x.lines.length > 0));
  assert.equal(sections.reduce((n, x) => n + x.lines.length, 0), s.list.items.length);
  const doc = { title: "Shift list", sections };
  const text = formatAisleListText(doc);
  for (const item of s.list.items) {
    const hits = text.split("\n").filter((l) => l.startsWith(`☐ ${item.displayName}`) || l.startsWith(`☑ ${item.displayName}`));
    assert.equal(hits.length, 1, `"${item.displayName}" printed ${hits.length}x`);
  }
  const html = buildAislePrintHtml({ ...doc, sections: [{ title: "Produce", lines: [{ name: "<b>onion</b>" }] }] });
  assert.ok(html.includes("&lt;b&gt;onion&lt;/b&gt;") && !html.includes("<b>onion"), "print HTML escapes names");
});

test("firehouse run: stored legacy and non-aisle sections map onto aisles", () => {
  assert.equal(aisleForStoredSection("Proteins", "chicken thighs"), "Meat & Seafood");
  assert.equal(aisleForStoredSection("Pantry & Spices", "ground cumin"), "Spices & Seasonings");
  assert.equal(aisleForStoredSection("Pantry & Spices", "spaghetti"), "Pasta, Rice & Grains");
  assert.equal(aisleForStoredSection("Required for tonight's meal", "ground beef"), "Meat & Seafood");
  assert.equal(aisleForStoredSection("Other", "whole milk"), "Dairy & Eggs");
  assert.equal(aisleForStoredSection("", "coffee filters"), "Other");
  assert.equal(aisleForStoredSection("Frozen Foods", "tortillas"), "Frozen Foods", "explicit aisle wins");
});

// --- 6. Real catalog sweep --------------------------------------------------------

interface CatalogPage {
  slug: string;
  title: string;
  baseServings?: number;
  crewSize?: number;
  ingredients: RawRecipeIngredient[];
}

const PAGES_DIR = join(process.cwd(), "client/public/catalog/golden-100/pages");
const pages = readdirSync(PAGES_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(PAGES_DIR, f), "utf8")) as CatalogPage);
const input = (p: CatalogPage): ShoppingRecipeInput => ({
  slug: p.slug,
  title: p.title,
  baseServings: p.baseServings ?? p.crewSize ?? 8,
  ingredients: p.ingredients,
});

test(`catalog: every recipe at base, 6 and 16 — nothing missing, nothing duplicated (${pages.length} recipes)`, () => {
  assert.ok(pages.length >= 100);
  for (const page of pages) {
    for (const crew of [input(page).baseServings, 6, 16]) {
      const s = addRecipeToSession(createShoppingSession(), input(page), crew);
      assertListIntegrity(s.list.items, `${page.slug}@${crew}`);
      for (const raw of page.ingredients) {
        if (isOptionalIngredient(raw) || isNotPurchased(raw.name)) continue;
        const key = normalizeIngredient(raw).canonicalKey;
        assert.ok(s.list.items.some((i) => i.canonicalKey === key), `${page.slug}@${crew}: "${raw.name}" missing`);
      }
      const exported = aisleSectionsFromItems(s.list.items).reduce((n, x) => n + x.lines.length, 0);
      assert.equal(exported, s.list.items.length, `${page.slug}@${crew}: export dropped items`);
    }
  }
});

test("catalog: a representative shift (seafood, meat, veg, canned, frozen) combines cleanly", () => {
  const has = (p: CatalogPage, d: Department) => p.ingredients.some((r) => normalizeIngredient(r).department === d);
  const picks: CatalogPage[] = [];
  for (const aisle of ["Meat & Seafood", "Frozen Foods", "Pantry & Canned Goods", "Beverages"] as Department[]) {
    const p = pages.find((x) => has(x, aisle) && !picks.includes(x));
    if (p) picks.push(p);
  }
  const seafood = pages.find((p) => !picks.includes(p) && p.ingredients.some((r) => /shrimp|salmon|cod|tilapia|halibut/i.test(r.name)));
  if (seafood) picks.push(seafood);
  assert.ok(picks.length >= 4, "found representative recipes");

  const s = picks.reduce((acc, p) => addRecipeToSession(acc, input(p), 10), createShoppingSession());
  assertListIntegrity(s.list.items, `shift(${picks.map((p) => p.slug).join(", ")})`);
  for (const p of picks) {
    for (const raw of p.ingredients) {
      if (isOptionalIngredient(raw) || isNotPurchased(raw.name)) continue;
      const key = normalizeIngredient(raw).canonicalKey;
      const item = s.list.items.find((i) => i.canonicalKey === key);
      assert.ok(item, `${p.slug}: "${raw.name}" missing from combined list`);
      assert.ok(item!.contributions.some((c) => c.recipeSlug === p.slug), `${p.slug}: "${raw.name}" lost its source`);
    }
  }
  const multi = s.list.items.filter((i) => new Set(i.contributions.map((c) => c.recipeSlug)).size > 1);
  console.log(`    shift of ${picks.length} meals @10: ${s.list.items.length} lines, ${multi.length} combined across meals`);
});

console.log(`[test-aisle-shopping-quality] ${failed === 0 ? "OK" : "FAILED"} (${passed} passed, ${failed} failed)`);
if (failed > 0) process.exit(1);
