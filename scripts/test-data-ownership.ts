/**
 * Phase 2 canonical data ownership — favourites, meal history import, shopping.
 * Run: npx tsx scripts/test-data-ownership.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const store = new Map<string, string>();
const events: string[] = [];
const fetchCalls: Array<{ url: string; body: unknown }> = [];
let importResponse: Record<string, unknown> = { entitled: true, imported: 0, duplicates: 0, skipped: 0 };

Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  window: {
    dispatchEvent: (e: { type: string }) => void events.push(e.type),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    location: { pathname: "/", search: "" },
  },
  document: { cookie: "csrf_token=test" },
  Event: class {
    constructor(public type: string) {}
  },
  CustomEvent: class {
    constructor(
      public type: string,
      public detail?: unknown,
    ) {}
  },
  fetch: async (url: string, init?: { body?: string }) => {
    fetchCalls.push({ url, body: init?.body ? JSON.parse(init.body) : undefined });
    return new Response(JSON.stringify(importResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
if (!("navigator" in globalThis)) Object.assign(globalThis, { navigator: { onLine: true } });

const saved = await import("../client/src/lib/saved-meals.ts");
const hallFav = await import("../client/src/lib/hall-favorites-store.ts");
const { getHallProfile } = await import("../client/src/lib/hall-profile-store.ts");
const { mergeSavedMeals } = await import("../shared/sync/merge.ts");
const { pendingLocalMealHistory, importLocalMealHistory } = await import(
  "../client/src/lib/meal-history-import.ts"
);
const { mealHistoryCreateSchema, mealHistoryImportSchema } = await import("../shared/meal-history/schema.ts");

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const LEGACY_KEY = "firehall_hall_favorites_v1";
const SAVED_KEY = "firehall_saved_meals";
const HISTORY_KEY = "firehall_hall_history_v1";

function writeLegacyFavorites(slugs: Array<{ slug: string; title: string; addedAt: string }>) {
  store.set(
    LEGACY_KEY,
    JSON.stringify({
      schemaVersion: 1,
      hallId: getHallProfile().hallId,
      favorites: slugs.map((s) => ({ ...s, source: "recipe_page" })),
      updatedAt: new Date().toISOString(),
    }),
  );
}

console.log("Favourites — saved meals canonical");

await test("existing saved meals (pre-Phase-2 format) still load; malformed rows are ignored", () => {
  store.set(
    SAVED_KEY,
    JSON.stringify([
      {
        id: "chili mac::beef|macaroni",
        savedAt: "2026-01-02T00:00:00.000Z",
        recipe: { title: "Chili Mac", ingredients: [{ name: "beef" }, { name: "macaroni" }] },
      },
      { id: "catalog:old-classic", savedAt: "2026-01-01T00:00:00.000Z", recipe: { title: "Old Classic" } },
      { bogus: true },
      null,
    ]),
  );
  const meals = saved.getSavedMeals();
  assert.equal(meals.length, 2);
  assert.deepEqual(
    meals.map((m) => m.id),
    ["chili mac::beef|macaroni", "catalog:old-classic"],
  );
});

await test("legacy Hall Favorites import into saved meals without touching the legacy store", () => {
  writeLegacyFavorites([
    { slug: "jerk-chicken", title: "Jerk Chicken", addedAt: "2026-02-01T00:00:00.000Z" },
    { slug: "old-classic", title: "Old Classic", addedAt: "2026-02-02T00:00:00.000Z" },
  ]);
  const legacyBefore = store.get(LEGACY_KEY);
  const added = hallFav.importLegacyHallFavorites();
  assert.equal(added, 1, "only the slug not already saved is added");
  assert.equal(store.get(LEGACY_KEY), legacyBefore, "legacy snapshot is byte-for-byte unchanged");
  assert.ok(saved.isCatalogMealSaved("jerk-chicken"));
  const jerk = saved.getSavedMeals().find((m) => m.id === "catalog:jerk-chicken")!;
  assert.equal(jerk.savedAt, "2026-02-01T00:00:00.000Z", "original pin time is preserved");
  assert.equal(jerk.recipe._slug, "jerk-chicken");
});

await test("import is idempotent and does not resurrect an un-saved classic", () => {
  assert.equal(hallFav.importLegacyHallFavorites(), 0);
  assert.equal(hallFav.removeHallFavorite("jerk-chicken"), true);
  assert.equal(hallFav.importLegacyHallFavorites(), 0);
  assert.equal(saved.isCatalogMealSaved("jerk-chicken"), false);
  assert.ok(store.get(LEGACY_KEY)!.includes("jerk-chicken"), "legacy data still preserved");
});

await test("a legacy slug that arrives later (cloud sync) is imported once", () => {
  writeLegacyFavorites([
    { slug: "jerk-chicken", title: "Jerk Chicken", addedAt: "2026-02-01T00:00:00.000Z" },
    { slug: "bbq-mac", title: "BBQ Mac", addedAt: "2026-03-01T00:00:00.000Z" },
  ]);
  assert.equal(hallFav.importLegacyHallFavorites(), 1);
  assert.ok(saved.isCatalogMealSaved("bbq-mac"));
  assert.equal(saved.isCatalogMealSaved("jerk-chicken"), false);
});

await test("Hall Classics is a projection of catalog saves — same data as Save", () => {
  const slugs = hallFav.getHallFavorites().map((f) => f.slug).sort();
  const catalogSaves = saved
    .getSavedMeals()
    .filter((m) => m.id.startsWith("catalog:"))
    .map((m) => m.id.slice(8))
    .sort();
  assert.deepEqual(slugs, catalogSaves);
});

await test("no artificial cap on favourites (old Hall Classics limit was 10)", () => {
  for (let i = 0; i < 15; i += 1) {
    const r = hallFav.addHallFavorite({ slug: `test-recipe-${i}`, title: `Test ${i}` });
    assert.equal(r.ok, true);
  }
  assert.ok(hallFav.getHallFavoritesCount() >= 15);
});

await test("catalog recipe saved from a recipe page shows as saved on RecipeCard (same id rule)", () => {
  const full = { ...saved.catalogSavedMealStub("bbq-mac", "BBQ Mac"), ingredients: [] };
  assert.equal(saved.isMealSaved(full), true);
  const result = saved.saveMeal(full);
  assert.deepEqual(result, { saved: false, duplicate: true });
});

await test("generator save still keys by title + ingredients and emits change events", () => {
  events.length = 0;
  const generated = {
    ...saved.catalogSavedMealStub("x", "Steak Sandwich"),
    _slug: undefined,
    ingredients: [{ name: "Steak", qty: 1, unit: "lb", category: "Protein" }],
  };
  assert.deepEqual(saved.saveMeal(generated), { saved: true, duplicate: false });
  assert.equal(saved.isMealSaved(generated), true);
  assert.ok(events.includes("favorites-changed"));
  assert.ok(events.includes("hall-favorites-changed"));
});

console.log("Favourites — sync merge");

await test("merge without tombstones keeps legacy union behaviour", () => {
  const merged = mergeSavedMeals(
    [{ id: "a", savedAt: "2026-01-01T00:00:00Z", recipe: {} }],
    [{ id: "b", savedAt: "2026-01-02T00:00:00Z", recipe: {} }],
  );
  assert.deepEqual(
    merged.map((m) => m.id),
    ["b", "a"],
  );
});

await test("a removed meal is not resurrected from the server; a later re-save wins", () => {
  const remote = [
    { id: "gone", savedAt: "2026-01-01T00:00:00Z", recipe: {} },
    { id: "resaved", savedAt: "2026-01-05T00:00:00Z", recipe: {} },
  ];
  const merged = mergeSavedMeals([], remote, {
    gone: "2026-01-03T00:00:00Z",
    resaved: "2026-01-03T00:00:00Z",
  });
  assert.deepEqual(
    merged.map((m) => m.id),
    ["resaved"],
  );
});

await test("removeMeal records a tombstone", () => {
  assert.equal(saved.removeCatalogMeal("bbq-mac"), true);
  assert.ok(saved.getSavedMealTombstones()["catalog:bbq-mac"]);
});

console.log("Meal history — local → user_meal_history import");

store.set(
  HISTORY_KEY,
  JSON.stringify({
    schemaVersion: 1,
    hallId: getHallProfile().hallId,
    updatedAt: new Date().toISOString(),
    entries: [
      { id: "e-1", type: "meal_cooked", at: "2026-05-01T23:00:00.000Z", title: "Jerk Chicken", recipeSlug: "jerk-chicken", crewSize: 8, source: "cook_mode" },
      { id: "e-2", type: "meal_cooked", at: "2026-05-02T23:00:00.000Z", title: "Generated thing", source: "cook_mode" },
      { id: "e-3", type: "wheel_result", at: "2026-05-03T23:00:00.000Z", title: "BBQ Mac", recipeSlug: "bbq-mac", source: "classics_wheel" },
      { id: "e 4 bad id", type: "meal_cooked", at: "2026-05-04T23:00:00.000Z", title: "X", recipeSlug: "bbq-mac", source: "cook_mode" },
    ],
  }),
);
const historyBefore = store.get(HISTORY_KEY);

await test("only cooked events with a catalog slug and a safe id are eligible", () => {
  const pending = pendingLocalMealHistory("user-1");
  assert.deepEqual(pending, [
    { client_entry_id: "e-1", recipe_slug: "jerk-chicken", cooked_at: "2026-05-01T23:00:00.000Z", crew_size: 8 },
  ]);
  assert.equal(mealHistoryImportSchema.safeParse({ entries: pending }).success, true);
});

await test("non-entitled response writes nothing locally and allows a later retry", async () => {
  importResponse = { entitled: false, imported: 0, duplicates: 0, skipped: 0 };
  assert.equal(await importLocalMealHistory("user-free"), 0);
  assert.equal(pendingLocalMealHistory("user-free").length, 1);
});

await test("entitled import posts once, marks entries sent, never mutates local history", async () => {
  importResponse = { entitled: true, imported: 1, duplicates: 0, skipped: 0 };
  fetchCalls.length = 0;
  assert.equal(await importLocalMealHistory("user-1"), 1);
  const post = fetchCalls.find((c) => c.url === "/api/meal-history/import");
  assert.ok(post, "import endpoint called");
  assert.equal((post!.body as { entries: unknown[] }).entries.length, 1);
  assert.equal(pendingLocalMealHistory("user-1").length, 0);
  assert.equal(store.get(HISTORY_KEY), historyBefore, "local history untouched");

  fetchCalls.length = 0;
  assert.equal(await importLocalMealHistory("user-1"), 0, "once per session");
  assert.equal(fetchCalls.length, 0);
});

await test("sent-ids are per account (a second account on the device still imports)", () => {
  assert.equal(pendingLocalMealHistory("user-2").length, 1);
});

await test("live Cook Mode write accepts the local entry id as idempotency key", () => {
  const parsed = mealHistoryCreateSchema.safeParse({ recipe_slug: "jerk-chicken", client_entry_id: "e-1" });
  assert.equal(parsed.success, true);
  assert.equal(
    mealHistoryCreateSchema.safeParse({ recipe_slug: "jerk-chicken", client_entry_id: "has spaces" }).success,
    false,
  );
  assert.equal(mealHistoryCreateSchema.safeParse({ recipe_slug: "jerk-chicken" }).success, true, "still optional");
});

await test("server dedupes on (user_id, client_entry_id) in the migration", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "server/db/pg-migrations/0011_meal_history_client_entry_id.sql"),
    "utf8",
  );
  assert.match(sql, /ADD COLUMN IF NOT EXISTS client_entry_id/);
  assert.match(sql, /UNIQUE INDEX IF NOT EXISTS[\s\S]*\(user_id, client_entry_id\)[\s\S]*WHERE client_entry_id IS NOT NULL/);
  assert.doesNotMatch(sql, /\bDROP\b|\bDELETE\b|\bUPDATE\b/i);
});

console.log("Shopping — one canonical engine for planner work");

await test("Shift Planner and /me/shopping-list do not use the legacy single-recipe builder", () => {
  const files = [
    "client/src/components/shift-planner/shift-grocery-list.tsx",
    "client/src/pages/me-shopping-list-page.tsx",
    "client/src/hooks/use-shopping-session.ts",
  ];
  for (const rel of files) {
    const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    assert.doesNotMatch(src, /@\/lib\/shopping-list["']/, `${rel} must target shared/shopping`);
  }
  const plannerDir = path.join(process.cwd(), "client/src/components/shift-planner");
  for (const f of fs.readdirSync(plannerDir)) {
    const src = fs.readFileSync(path.join(plannerDir, f), "utf8");
    assert.doesNotMatch(src, /@\/lib\/shopping-list["']/, `shift-planner/${f} must target shared/shopping`);
  }
});

console.log(`\n${passed} data-ownership tests passed`);
