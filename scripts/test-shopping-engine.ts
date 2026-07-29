#!/usr/bin/env tsx
/**
 * Smart Shopping engine — domain layer sanity tests.
 * Validates normalization, department grouping, crew-size rescaling,
 * multi-recipe merging, manual items, undo, pantry profile, and history.
 */
import assert from "node:assert/strict";
import {
  addHistoryEntry,
  addManualItem,
  addRecipeToSession,
  applyPantryContext,
  archiveSessionToHistory,
  canonicalizeIngredientName,
  classifyDepartment,
  clearCheckedItems,
  COMMON_STAPLES,
  createEmptyHistory,
  createEmptyPantryProfile,
  createPantryProfile,
  createShoppingSession,
  cycleStockLevel,
  getStockLevel,
  groupByDepartment,
  popUndoSnapshot,
  pushUndoSnapshot,
  removeItem,
  removeRecipeFromSession,
  removeStockLevel,
  resetPantryProfile,
  resolvePantryStatus,
  setRecipeCrewSize,
  setStockLevel,
  splitPantryItems,
  startNewSessionFromHistory,
  toggleItemChecked,
  type PantryContext,
  type ShoppingRecipeInput,
} from "../shared/shopping/index.js";

const tacoRecipe: ShoppingRecipeInput = {
  slug: "firehall-tacos",
  title: "Firehall Beef Tacos",
  baseServings: 8,
  ingredients: [
    { name: "Ground Beef", quantity: "2", unit: "lb" },
    { name: "Onion", quantity: "1", unit: "count" },
    { name: "Flour Tortillas", quantity: "16", unit: "count" },
    { name: "Salt", quantity: "1", unit: "tsp" },
  ],
};

const chiliRecipe: ShoppingRecipeInput = {
  slug: "station-chili",
  title: "Station Chili",
  baseServings: 8,
  ingredients: [
    { name: "Ground Beef", quantity: "1", unit: "lb" },
    { name: "Onions, diced", quantity: "2", unit: "count" },
    { name: "Kidney Beans", quantity: "2", unit: "can" },
  ],
};

// --- IngredientNormalizer -------------------------------------------------

assert.equal(
  canonicalizeIngredientName("Chicken Thighs, boneless skinless"),
  canonicalizeIngredientName("Boneless Chicken Thighs"),
  "qualifier variants should normalize to the same key",
);
assert.equal(canonicalizeIngredientName("Onions"), canonicalizeIngredientName("Onion"), "basic pluralization merges");

assert.equal(classifyDepartment("Ground Beef"), "Proteins");
assert.equal(classifyDepartment("Flour Tortillas"), "Bakery / Dough");
assert.equal(classifyDepartment("Salt"), "Pantry & Spices");
assert.equal(classifyDepartment("Cheddar Cheese"), "Dairy / Dairy Alternatives");

// --- Single recipe -> grouped, normalized list ----------------------------

let session = createShoppingSession();
session = addRecipeToSession(session, tacoRecipe, 8);
assert.equal(session.recipes.length, 1, "one recipe attached");
assert.equal(session.list.items.length, 4, "four normalized ingredient lines");

const grouped = groupByDepartment(session.list.items);
assert.ok(grouped.some((g) => g.department === "Proteins"), "proteins department present");
assert.ok(grouped.some((g) => g.department === "Bakery / Dough"), "bakery department present");

// --- Crew-size scaling recalculates instantly -----------------------------

const beefItemBefore = session.list.items.find((i) => i.canonicalKey.includes("ground beef"))!;
assert.ok(beefItemBefore.quantityLabel.includes("2"), "8-crew base quantity is 2 lb");

session = setRecipeCrewSize(session, tacoRecipe.slug, 16);
const beefItemAfter = session.list.items.find((i) => i.canonicalKey.includes("ground beef"))!;
assert.ok(
  beefItemAfter.quantityLabel !== beefItemBefore.quantityLabel,
  "doubling crew size changes the merged quantity",
);

// --- Multiple recipes combine duplicate ingredients -----------------------

session = addRecipeToSession(session, chiliRecipe, 8);
assert.equal(session.recipes.length, 2, "two recipes in session");

const combinedBeef = session.list.items.find((i) => i.canonicalKey.includes("ground beef"))!;
assert.equal(combinedBeef.contributions.length, 2, "ground beef combines contributions from both recipes");
assert.ok(
  combinedBeef.contributions.some((c) => c.recipeSlug === tacoRecipe.slug) &&
    combinedBeef.contributions.some((c) => c.recipeSlug === chiliRecipe.slug),
  "recipe source tracking preserved on merged item",
);

const combinedOnion = session.list.items.find((i) => i.canonicalKey.includes("onion"))!;
assert.equal(combinedOnion.contributions.length, 2, "onion variants merge across recipes");

// --- Manual items, checking off, removal ----------------------------------

session = addManualItem(session, { name: "Paper towels" });
const manualItem = session.list.items.find((i) => i.isManual)!;
assert.ok(manualItem, "manual item added");

session = toggleItemChecked(session, manualItem.id);
assert.equal(session.list.items.find((i) => i.id === manualItem.id)!.checked, true, "manual item checked");

session = toggleItemChecked(session, combinedBeef.id);
session = clearCheckedItems(session);
assert.equal(session.list.items.some((i) => i.id === manualItem.id), false, "checked manual item cleared");
assert.equal(session.list.items.some((i) => i.id === combinedBeef.id), false, "checked recipe item cleared");

const beefStillThere = session.list.items.find((i) => i.canonicalKey.includes("ground beef"));
assert.equal(beefStillThere, undefined, "ground beef line was cleared with the rest of the checked items");

// Re-toggle a fresh item and confirm manual removal works independently.
session = addManualItem(session, { name: "Ice" });
const iceItem = session.list.items.find((i) => i.displayName === "Ice")!;
session = removeItem(session, iceItem.id);
assert.equal(session.list.items.some((i) => i.displayName === "Ice"), false, "manual item removed by id");

// --- Removing a recipe removes only its unique contributions --------------

session = removeRecipeFromSession(session, chiliRecipe.slug);
assert.equal(session.recipes.length, 1, "chili recipe removed");
assert.equal(session.list.items.some((i) => i.canonicalKey.includes("kidney bean")), false, "chili-only item gone");
assert.equal(session.list.items.some((i) => i.canonicalKey.includes("tortilla")), true, "taco item remains");

// --- Undo -------------------------------------------------------------------

let undoStack: ReturnType<typeof pushUndoSnapshot> = [];
let cursor = createShoppingSession();
cursor = addRecipeToSession(cursor, tacoRecipe, 8);
undoStack = pushUndoSnapshot(undoStack, createShoppingSession());
const beforeManualAdd = cursor;
cursor = addManualItem(cursor, { name: "Napkins" });
assert.ok(cursor.list.items.some((i) => i.displayName === "Napkins"), "napkins added before undo");

const { previous, rest } = popUndoSnapshot(pushUndoSnapshot([], beforeManualAdd));
assert.ok(previous, "undo snapshot restored");
assert.equal(previous!.list.items.some((i) => i.displayName === "Napkins"), false, "undo reverts the manual add");
assert.equal(rest.length, 0, "undo stack drained after pop");

// --- Pantry: common staple defaults + 3-tier stock levels -------------------

const freshPantry = createPantryProfile();
assert.ok(COMMON_STAPLES.length >= 8, "common staples list covers the requested defaults");
assert.equal(getStockLevel(freshPantry, "salt"), "always", "salt defaults to always-stocked");
assert.equal(getStockLevel(freshPantry, "black pepper"), "always", "pepper defaults to always-stocked");
assert.equal(getStockLevel(freshPantry, "coffee"), "always", "coffee defaults to always-stocked");
assert.equal(getStockLevel(freshPantry, "flour"), "always", "flour defaults to always-stocked");
assert.equal(getStockLevel(freshPantry, "rice"), "always", "rice defaults to always-stocked");
assert.equal(getStockLevel(freshPantry, "garlic powder"), "always", "common spices default to always-stocked");
assert.equal(getStockLevel(createEmptyPantryProfile(), "salt"), "never", "an empty pantry has no opinion (defaults to never)");

let personal = createEmptyPantryProfile();
personal = setStockLevel(personal, "onion", "always");
assert.equal(getStockLevel(personal, "onion"), "always");

personal = cycleStockLevel(personal, "onion");
assert.equal(getStockLevel(personal, "onion"), "usually", "cycle: always -> usually");
personal = cycleStockLevel(personal, "onion");
assert.equal(getStockLevel(personal, "onion"), "never", "cycle: usually -> never");
personal = cycleStockLevel(personal, "onion");
assert.equal(getStockLevel(personal, "onion"), "always", "cycle wraps back to always");

personal = removeStockLevel(personal, "onion");
assert.equal("onion" in personal.items, false, "explicit entry removed");

const resetPersonal = resetPantryProfile();
assert.equal(getStockLevel(resetPersonal, "salt"), "always", "reset restores common-staple defaults");

// --- Personal vs Hall Pantry precedence --------------------------------------

const hallOnly: PantryContext = { hall: setStockLevel(createEmptyPantryProfile(), "kidney bean", "always") };
assert.equal(resolvePantryStatus(hallOnly, "kidney bean").level, "always", "hall pantry hides item with no personal opinion");
assert.equal(resolvePantryStatus(hallOnly, "kidney bean").source, "hall");

const personalOverridesHall: PantryContext = {
  personal: setStockLevel(createEmptyPantryProfile(), "kidney bean", "never"),
  hall: setStockLevel(createEmptyPantryProfile(), "kidney bean", "always"),
};
assert.equal(
  resolvePantryStatus(personalOverridesHall, "kidney bean").level,
  "never",
  "an explicit personal 'never' overrides the hall pantry",
);
assert.equal(resolvePantryStatus(personalOverridesHall, "kidney bean").source, "personal");

// --- Pantry items automatically disappear from the shopping list ------------

let pantrySession = addRecipeToSession(createShoppingSession(), tacoRecipe, 8, { personal: createPantryProfile() });
const saltItem = pantrySession.list.items.find((i) => i.canonicalKey.includes("salt"))!;
assert.equal(saltItem.inPantry, true, "salt flagged as already in pantry");
assert.equal(saltItem.pantryStockLevel, "always");
assert.equal(saltItem.pantrySource, "personal");

const { active, skipped } = splitPantryItems(pantrySession.list.items);
assert.equal(active.some((i) => i.canonicalKey.includes("salt")), false, "salt automatically disappears from the active list");
assert.equal(skipped.some((i) => i.canonicalKey.includes("salt")), true, "salt appears in the skipped/already-have list instead");
assert.equal(active.some((i) => i.canonicalKey.includes("ground beef")), true, "non-pantry items stay on the active list");

pantrySession = applyPantryContext(pantrySession, { personal: createEmptyPantryProfile() });
const saltItemAfterReset = pantrySession.list.items.find((i) => i.canonicalKey.includes("salt"))!;
assert.equal(saltItemAfterReset.inPantry, false, "clearing the personal pantry un-flags the item again");

// Manual items also respect the pantry immediately.
const manualPantrySession = addManualItem(
  addRecipeToSession(createShoppingSession(), tacoRecipe, 8),
  { name: "Butter" },
  { personal: createPantryProfile() },
);
const manualButter = manualPantrySession.list.items.find((i) => i.displayName === "Butter")!;
assert.equal(manualButter.inPantry, true, "manually added staple is immediately recognized as already stocked");

// --- History / reuse ---------------------------------------------------------

let historySession = addRecipeToSession(createShoppingSession(), tacoRecipe, 12);
const { entry, session: completed } = archiveSessionToHistory(historySession);
assert.equal(completed.mode, "completed", "archived session marked completed");
assert.equal(entry.recipeTitles[0], tacoRecipe.title, "history entry records recipe titles");

let history = createEmptyHistory();
history = addHistoryEntry(history, entry);
assert.equal(history.entries.length, 1, "history entry stored");

const reusedSession = startNewSessionFromHistory(entry);
assert.equal(reusedSession.recipes.length, 1, "reused session re-attaches the same recipe");
assert.equal(reusedSession.recipes[0].crewSize, 12, "reused session keeps the original crew size");
assert.equal(reusedSession.mode, "planning", "reused session starts fresh, not completed");

console.log("[test-shopping-engine] OK");
