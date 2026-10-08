/**
 * Shift shopping list — one consolidated list from a saved shift plan, built
 * with the canonical Smart Shopping engine from REAL catalog recipes.
 * Run: npx tsx scripts/test-shift-shopping.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { PersonalSchedule } from "../shared/schedule/types.ts";
import {
  addRecipeToSession,
  convertUnitValue,
  createEmptyPantryProfile,
  createPantryProfile,
  createShoppingSession,
  formatShoppingItemQuantity,
  isOptionalIngredient,
  splitPantryItems,
  type PantryContext,
  type ShoppingListItem,
} from "../shared/shopping/index.ts";
import { shiftListOpSchema, shiftListOpenSchema } from "../shared/shift-plan/schema.ts";
import type { ShiftShoppingListView } from "../shared/shift-plan/types.ts";
import { createMemoryShiftPlanRepo } from "../server/shift-plan/store.ts";
import { ShiftPlanError, getShiftPlan, patchShiftPlanSlot, type ShiftPlanDeps } from "../server/shift-plan/service.ts";
import { createMemoryShiftListRepo } from "../server/shift-plan/shopping-store.ts";
import {
  applyShiftListAction,
  getShiftList,
  openShiftList,
  type ShiftListDeps,
} from "../server/shift-plan/shopping-service.ts";
import { resolvePlannedRecipe, resolveShoppingRecipe } from "../server/shift-plan/routes.ts";

const TZ = "America/Toronto";
const USER = "ff-free-user";
/** 23:30 local the evening before the 2026-10-08 07:00 shift. */
const NOW = new Date("2026-10-08T03:30:00Z");
const SHIFT = "2026-10-08T07:00";

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function schedule(onHours: number, offHours: number, crew = 8): PersonalSchedule {
  return {
    timezone: TZ,
    anchorDate: "2026-10-08",
    startTime: "07:00",
    blocks: [
      { kind: "on", minutes: onHours * 60 },
      { kind: "off", minutes: offHours * 60 },
    ],
    defaultCrewSize: crew,
  };
}

function makeDeps(s: PersonalSchedule): ShiftListDeps {
  const plan: ShiftPlanDeps = {
    repo: createMemoryShiftPlanRepo(),
    loadSchedule: async () => ({ schedule: s, overrides: [], mealPreferences: {} }),
    resolveRecipe: resolvePlannedRecipe,
    isSelectableSlug: (slug) => resolvePlannedRecipe(slug) != null,
    now: () => NOW,
  };
  return { plan, lists: createMemoryShiftListRepo(), resolveShoppingRecipe };
}

/** Save recipes into slots by "type" or "type/day". */
async function planShift(deps: ShiftListDeps, picks: Record<string, string>, user = USER) {
  const view = await getShiftPlan(deps.plan, user);
  for (const [where, recipeSlug] of Object.entries(picks)) {
    const [type, day = "1"] = where.split("/");
    const slot = view.slots.find((s) => s.type === type && s.dayIndex === Number(day));
    assert.ok(slot, `slot ${where} exists`);
    await patchShiftPlanSlot(deps.plan, user, { shiftKey: view.shift!.key, slotKey: slot.key, recipeSlug });
  }
  return getShiftPlan(deps.plan, user);
}

async function slotKey(deps: ShiftListDeps, type: string, day = 1) {
  const v = await getShiftPlan(deps.plan, USER);
  return v.slots.find((s) => s.type === type && s.dayIndex === day)!.key;
}

const DEFAULT_PANTRY: PantryContext = { personal: createPantryProfile() };

async function open(deps: ShiftListDeps, pantry: PantryContext = DEFAULT_PANTRY, user = USER) {
  const res = await openShiftList(deps, user, { shiftKey: SHIFT, pantry: pantry as never });
  assert.ok(res.list);
  return res as { list: ShiftShoppingListView; created?: boolean };
}

const items = (v: ShiftShoppingListView, key: string) => v.list.items.filter((i) => i.canonicalKey === key);
function one(v: ShiftShoppingListView, key: string): ShoppingListItem {
  const found = items(v, key);
  assert.equal(found.length, 1, `exactly one "${key}" line (got ${found.length})`);
  return found[0]!;
}
const countOf = (item: ShoppingListItem) => {
  assert.equal(item.quantities?.length, 1, `${item.displayName}: one merged quantity`);
  assert.equal(item.quantities![0]!.family, "count");
  return item.quantities![0]!.value;
};

/** What the recipe page's "Add to my list" produces for one recipe at one crew size. */
function singleRecipeItem(slug: string, crew: number, key: string): ShoppingListItem | undefined {
  const s = addRecipeToSession(createShoppingSession(), resolveShoppingRecipe(slug)!, crew);
  return s.list.items.find((i) => i.canonicalKey === key);
}

async function op(deps: ShiftListDeps, o: Parameters<typeof applyShiftListAction>[2]["op"]) {
  const res = await applyShiftListAction(deps, USER, { shiftKey: SHIFT, op: o });
  return res.list!;
}

console.log("Real recipes used");
for (const slug of [
  "bbq-breakfast-hash",
  "turkey-burgers",
  "chicken-parm",
  "crew-french-toast-bake",
  "enchilada-beef-skillet",
  "cheesy-beef-nacho-bake",
  "chicken-paprikash-hall",
]) {
  assert.ok(resolveShoppingRecipe(slug), `${slug} has shopping data`);
  assert.ok(resolvePlannedRecipe(slug), `${slug} is plannable`);
}
console.log("  ✓ 7 catalog recipes resolve to canonical recipe pages");

console.log("\nPlan A — 12h shift: BBQ breakfast hash + turkey burgers + chicken parm (crew 8)");
const a = makeDeps(schedule(12, 12));
await planShift(a, { breakfast: "bbq-breakfast-hash", lunch: "turkey-burgers", dinner: "chicken-parm" });

await test("Breakfast + Lunch + Dinner produce ONE list; first open reports generated", async () => {
  const res = await open(a);
  assert.equal(res.created, true);
  assert.deepEqual(
    res.list.meals.map((m) => [m.label, m.recipeTitle.length > 0, m.crewSize]),
    [
      ["Breakfast", true, 8],
      ["Lunch", true, 8],
      ["Dinner", true, 8],
    ],
  );
  const again = await open(a);
  assert.equal(again.created, false, "re-opening doesn't regenerate");
});

await test("eggs in all three meals merge into one line: 14 + 2 + 4 = 20", async () => {
  const { list } = await getShiftList(a, USER);
  const eggs = one(list!, "egg");
  assert.equal(countOf(eggs), 20);
  assert.equal(eggs.contributions.length, 3);
  assert.equal(new Set(eggs.contributions.map((c) => c.recipeTitle)).size, 3);
});

await test("optional topping (hash's shredded cheddar) is left off and reported", async () => {
  const { list } = await getShiftList(a, USER);
  assert.equal(items(list!, "cheddar").length, 0);
  assert.ok(list!.list.excludedOptional?.some((o) => o.name === "shredded cheddar"));
});

await test("pantry staples (kosher salt, black pepper, olive oil) move to 'already have'", async () => {
  const { list } = await getShiftList(a, USER);
  const { active, skipped } = splitPantryItems(list!.list.items);
  for (const key of ["kosher salt", "black pepper", "olive oil"]) {
    assert.ok(skipped.some((i) => i.canonicalKey === key), `${key} skipped`);
    assert.ok(!active.some((i) => i.canonicalKey === key), `${key} not on the active list`);
  }
  assert.ok(active.some((i) => i.canonicalKey === "egg"), "eggs still to buy");
});

await test("each slot uses its own crew size: lunch for 16 doubles only the burger eggs", async () => {
  await patchShiftPlanSlot(a.plan, USER, { shiftKey: SHIFT, slotKey: await slotKey(a, "lunch"), crewSizeOverride: 16 });
  const { list } = await getShiftList(a, USER);
  assert.equal(list!.meals.find((m) => m.label === "Lunch")!.crewSize, 16);
  const eggs = one(list!, "egg");
  assert.equal(countOf(eggs), 22);
  const burger = eggs.contributions.find((c) => c.recipeTitle.toLowerCase().includes("burger"))!;
  assert.equal(burger.value, 4);
});

await test("every contribution equals the recipe page's own list at that slot's crew size", async () => {
  const { list } = await getShiftList(a, USER);
  const crews: Record<string, number> = { "bbq-breakfast-hash": 8, "turkey-burgers": 16, "chicken-parm": 8 };
  for (const item of list!.list.items.filter((i) => !i.isManual)) {
    for (const c of item.contributions) {
      const slug = c.recipeSlug.split("#")[1]!;
      const single = singleRecipeItem(slug, crews[slug]!, item.canonicalKey);
      const match = single?.contributions.find((s) => s.rawQuantity === c.rawQuantity && s.unit === c.unit);
      assert.ok(match, `${item.canonicalKey} from ${slug}: ${c.rawQuantity}`);
    }
  }
});

console.log("\nPlan B — 24h shift: French toast bake + enchilada skillet + nacho bake + chicken paprikash");
const b = makeDeps(schedule(24, 48));
await planShift(b, {
  breakfast: "crew-french-toast-bake",
  lunch: "enchilada-beef-skillet",
  dinner: "cheesy-beef-nacho-bake",
  late_night: "chicken-paprikash-hall",
});

await test("butter in compatible units (cup + tbsp) converts into one volume amount, rounded up", async () => {
  const { list } = await open(b);
  const butter = one(list, "butter");
  assert.equal(butter.quantities?.length, 1);
  const q = butter.quantities![0]!;
  assert.equal(q.family, "volume");
  assert.deepEqual(butter.contributions.map((c) => c.unit).sort(), ["cup", "tbsp"]);
  const exact = butter.contributions.reduce((sum, c) => sum + convertUnitValue(c.value, c.unit, "tbsp")!, 0);
  const tbsp = convertUnitValue(q.value, q.unit, "tbsp")!;
  assert.ok(tbsp >= exact && tbsp < exact + 1, `${exact} tbsp rounded up for purchase (got ${butter.quantityLabel})`);
  assert.match(formatShoppingItemQuantity(butter, "metric"), /ml/);
});

await test("cheddar in incompatible units (2.4 cups + ¾ lb) stays one line with both amounts", async () => {
  const { list } = await getShiftList(b, USER);
  const cheddar = one(list!, "cheddar cheese");
  const families = cheddar.quantities!.map((q) => q.family).sort();
  assert.deepEqual(families, ["mass", "volume"], "no density guess between cups and pounds");
  assert.match(cheddar.quantityLabel, /cup.*\+.*lb|lb.*\+.*cup/);
});

await test("eggs from breakfast only, scaled 18 for 12 → 12 for 8 (egg noodles are a different item)", async () => {
  const { list } = await getShiftList(b, USER);
  assert.equal(countOf(one(list!, "egg")), 12);
  assert.equal(items(list!, "egg noodle").length, 1);
});

console.log("\nPlan C — 48h shift: same recipe on both days, skipped + BYO meals");
const c = makeDeps(schedule(48, 96));
await planShift(c, {
  breakfast: "bbq-breakfast-hash",
  "breakfast/2": "bbq-breakfast-hash",
  lunch: "turkey-burgers",
  dinner: "chicken-parm",
});

await test("the same recipe planned on two days counts twice (14 + 14 + 2 + 4)", async () => {
  const { list } = await open(c);
  assert.equal(countOf(one(list, "egg")), 34);
  assert.equal(list.meals.filter((m) => m.recipeTitle === list.meals[0]!.recipeTitle).length, 2);
});

await test("a skipped meal and a BYO meal drop out of the list", async () => {
  await patchShiftPlanSlot(c.plan, USER, { shiftKey: SHIFT, slotKey: await slotKey(c, "lunch"), skipped: true });
  await patchShiftPlanSlot(c.plan, USER, { shiftKey: SHIFT, slotKey: await slotKey(c, "dinner"), byo: true });
  const { list } = await getShiftList(c, USER);
  assert.equal(countOf(one(list!, "egg")), 28);
  assert.equal(list!.meals.length, 2);
  assert.equal(items(list!, "kosher salt").length, 0, "chicken parm's lines are gone");
});

console.log("\nList state — manual items, check-off, clear checked, undo, persistence");
const d = makeDeps(schedule(12, 12));
await planShift(d, { breakfast: "bbq-breakfast-hash", lunch: "turkey-burgers", dinner: "chicken-parm" });
await open(d);

await test("manual items are added (and a manual staple respects the pantry)", async () => {
  let list = await op(d, { type: "add_manual", name: "Coffee filters", quantity: "1 box" });
  list = await op(d, { type: "add_manual", name: "Salt" });
  const filters = list.list.items.find((i) => i.displayName === "Coffee filters")!;
  assert.equal(filters.isManual, true);
  assert.equal(filters.quantityLabel, "1 box");
  assert.equal(list.list.items.find((i) => i.displayName === "Salt")!.inPantry, true);
});

await test("check-off persists across a reload (new read from storage)", async () => {
  const eggs = one((await getShiftList(d, USER)).list!, "egg");
  await op(d, { type: "check", itemId: eggs.id, checked: true });
  await op(d, { type: "check", itemId: eggs.id, checked: true });
  const reloaded = (await getShiftList(d, USER)).list!;
  assert.equal(one(reloaded, "egg").checked, true, "check is idempotent and saved");
  assert.equal(reloaded.canUndo, true);
});

await test("clear checked removes purchased lines; undo restores them step by step", async () => {
  let list = await op(d, { type: "clear_checked" });
  assert.equal(items(list, "egg").length, 0);
  list = await op(d, { type: "undo" });
  assert.equal(one(list, "egg").checked, true);
  list = await op(d, { type: "undo" });
  list = await op(d, { type: "undo" });
  assert.equal(one(list, "egg").checked, false, "undo walks back to before the check");
});

await test("cleared items stay cleared when an unrelated meal changes; plan changes reset undo", async () => {
  const oil = one((await getShiftList(d, USER)).list!, "vegetable oil");
  await op(d, { type: "check", itemId: oil.id, checked: true });
  await op(d, { type: "clear_checked" });
  await patchShiftPlanSlot(d.plan, USER, { shiftKey: SHIFT, slotKey: await slotKey(d, "dinner"), crewSizeOverride: 12 });
  const list = (await getShiftList(d, USER)).list!;
  assert.equal(items(list, "vegetable oil").length, 0, "vegetable oil (breakfast only) doesn't come back");
  assert.equal(countOf(one(list, "egg")), 14 + 2 + 6, "dinner eggs rescaled to 12");
  assert.equal(list.canUndo, false);
  assert.ok(list.list.items.some((i) => i.displayName === "Coffee filters"), "manual items survive plan changes");
});

await test("removing a manual item", async () => {
  const filters = (await getShiftList(d, USER)).list!.list.items.find((i) => i.displayName === "Coffee filters")!;
  const list = await op(d, { type: "remove", itemId: filters.id });
  assert.ok(!list.list.items.some((i) => i.displayName === "Coffee filters"));
});

await test("a second device's pantry re-matches the shared list (account sync, no Premium check)", async () => {
  const phone = await open(d, { personal: createEmptyPantryProfile() });
  assert.equal(one(phone.list, "kosher salt").inPantry, false, "phone has no staples set → salt to buy");
  const laptop = (await getShiftList(d, USER)).list!;
  assert.equal(one(laptop, "kosher salt").inPantry, false, "other device sees the same saved list");
  assert.equal(countOf(one(laptop, "egg")), 22, "quantities unchanged by pantry");
});

console.log("\nOwnership, shift binding, validation");

await test("another user can't see this list", async () => {
  assert.equal((await getShiftList(d, "someone-else")).list, null);
});

await test("stale shift key → 409; nothing planned → 409; op before open → 409", async () => {
  await assert.rejects(
    () => openShiftList(d, USER, { shiftKey: "2026-10-01T07:00" }),
    (e: unknown) => e instanceof ShiftPlanError && e.status === 409,
  );
  const empty = makeDeps(schedule(12, 12));
  await assert.rejects(
    () => openShiftList(empty, USER, { shiftKey: SHIFT }),
    (e: unknown) => e instanceof ShiftPlanError && e.status === 409,
  );
  await planShift(empty, { lunch: "turkey-burgers" });
  await assert.rejects(
    () => applyShiftListAction(empty, USER, { shiftKey: SHIFT, op: { type: "clear_checked" } }),
    (e: unknown) => e instanceof ShiftPlanError && e.status === 409,
  );
});

await test("request schemas reject unknown ops and oversized items", () => {
  assert.equal(shiftListOpSchema.safeParse({ shiftKey: SHIFT, op: { type: "check", itemId: "x", checked: true } }).success, true);
  assert.equal(shiftListOpSchema.safeParse({ shiftKey: SHIFT, op: { type: "wipe" } }).success, false);
  assert.equal(
    shiftListOpSchema.safeParse({ shiftKey: SHIFT, op: { type: "add_manual", name: "x".repeat(81) } }).success,
    false,
  );
  assert.equal(shiftListOpenSchema.safeParse({ shiftKey: SHIFT, extra: 1 }).success, false);
});

await test("optional rule: a notes clause starting with 'optional' excludes; a qualifier doesn't", () => {
  assert.equal(isOptionalIngredient({ name: "fresh cilantro", notes: "chopped, optional" }), true);
  assert.equal(isOptionalIngredient({ name: "steel-cut oats", notes: "adds texture; optional" }), true);
  assert.equal(isOptionalIngredient({ name: "avocado", notes: "sliced, optional at the line" }), true);
  assert.equal(isOptionalIngredient({ name: "jalapeños", notes: "stemmed, seeds optional" }), false);
  assert.equal(isOptionalIngredient({ name: "whipped butter", notes: "plus optional bacon on the side" }), false);
});

await test("migration 0015 stores the list per user, tied to the source shift plan", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "server/db/pg-migrations/0015_user_shift_shopping_lists.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_shift_shopping_lists/);
  assert.match(sql, /REFERENCES user_shift_plans\(user_id, shift_key\) ON DELETE CASCADE/);
  for (const col of ["shift_key", "session_json", "undo_json", "pantry_json"]) assert.match(sql, new RegExp(col));
});

console.log(`\n${passed} shift shopping tests passed`);
process.exit(0);
