/**
 * Meal History Free/Premium — entitlements, visible window, downgrade/upgrade,
 * legacy local import, and duplicate prevention. Runs against an in-memory
 * data layer that mirrors server/meal-history/store.ts semantics.
 * Run: npx tsx scripts/test-meal-history-tiers.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BILLING_FEATURES,
  PLAN_BASE_FEATURES,
  type BillingFeature,
  type PlanId,
} from "../shared/billing/types.ts";
import {
  FREE_HISTORY_WINDOW_DAYS,
  IMPORT_MATCH_WINDOW_MS,
  planMealHistoryImport,
  resolveMealHistoryAccess,
  visibleSince,
  type MealHistoryImportCandidate,
} from "../shared/meal-history/access.ts";
import type { MealFeedbackInput, MealHistoryEntry, MealHistoryFavorite } from "../shared/meal-history/types.ts";
import { ANALYTICS_EVENT_TYPES } from "../shared/analytics/events.ts";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.ts";
import { isApprovedCatalogSlug } from "../shared/hall-catalog/gate.ts";
import {
  buildMealHistoryList,
  submitFeedbackWithAccess,
  type MealHistoryDeps,
} from "../server/meal-history/service.ts";

const NOW = new Date("2026-10-09T15:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const USER = "ff-history-user";
const [SLUG_A, SLUG_B, SLUG_C, SLUG_D] = GOLDEN_100_RECIPES.slice(0, 4).map((r) => r.slug);

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function featuresFor(planId: PlanId): Record<BillingFeature, boolean> {
  const map = {} as Record<BillingFeature, boolean>;
  for (const f of BILLING_FEATURES) map[f] = PLAN_BASE_FEATURES[planId].includes(f);
  return map;
}
const FREE = resolveMealHistoryAccess(featuresFor("personal"));
const PREMIUM = resolveMealHistoryAccess(featuresFor("firefighter_plus"));
const GUEST = resolveMealHistoryAccess(featuresFor("guest"));

interface Row {
  id: number;
  user_id: string;
  recipe_slug: string;
  cooked_at: string;
  client_entry_id: string | null;
  rating: 1 | 2 | 3 | 4 | 5 | null;
  make_again: boolean | null;
  note: string | null;
}

/** In-memory twin of store.ts: same filters/ordering, plus the import insert path. */
function createMemoryHistory() {
  const rows: Row[] = [];
  let nextId = 1;
  const toEntry = (r: Row): MealHistoryEntry => ({
    id: r.id,
    recipe_slug: r.recipe_slug,
    cooked_at: r.cooked_at,
    title: r.recipe_slug,
    recipe_path: `/recipes/${r.recipe_slug}`,
    hero_image: null,
    hall_id: null,
    meal_occasion: null,
    crew_size: null,
    nutrition_goal: null,
    is_high_protein: null,
    is_high_fiber: null,
    cost: null,
    rating: r.rating,
    make_again: r.make_again,
    feedback_tags: [],
    note: r.note,
    feedback_at: null,
  });
  const mine = (userId: string) =>
    rows
      .filter((r) => r.user_id === userId)
      .sort((a, b) => Date.parse(b.cooked_at) - Date.parse(a.cooked_at) || b.id - a.id);

  const deps: MealHistoryDeps = {
    async listPage(userId, { since, limit, offset }) {
      return mine(userId)
        .filter((r) => !since || Date.parse(r.cooked_at) >= since.getTime())
        .slice(offset, offset + limit)
        .map(toEntry);
    },
    async count(userId, since) {
      const all = mine(userId);
      return {
        total: all.length,
        older: since ? all.filter((r) => Date.parse(r.cooked_at) < since.getTime()).length : 0,
      };
    },
    async favorites(userId): Promise<MealHistoryFavorite[]> {
      const bySlug = new Map<string, Row[]>();
      for (const r of mine(userId)) bySlug.set(r.recipe_slug, [...(bySlug.get(r.recipe_slug) ?? []), r]);
      return [...bySlug.entries()]
        .filter(([, rs]) => rs.some((r) => r.make_again === true || (r.rating ?? 0) >= 4))
        .map(([slug, rs]) => ({
          recipe_slug: slug,
          title: slug,
          recipe_path: `/recipes/${slug}`,
          hero_image: null,
          times_cooked: rs.length,
          last_cooked_at: rs[0]!.cooked_at,
          best_rating: (Math.max(0, ...rs.map((r) => r.rating ?? 0)) || null) as MealHistoryFavorite["best_rating"],
        }));
    },
    async getEntry(userId, id) {
      const row = rows.find((r) => r.id === id && r.user_id === userId);
      return row ? toEntry(row) : null;
    },
    async submitFeedback(userId, id, feedback: MealFeedbackInput) {
      const row = rows.find((r) => r.id === id && r.user_id === userId);
      if (!row) return { ok: false, reason: "not_found" };
      if (feedback.rating !== undefined) row.rating = feedback.rating;
      if (feedback.make_again !== undefined) row.make_again = feedback.make_again;
      if (feedback.note !== undefined) row.note = feedback.note || null;
      return { ok: true, entry: toEntry(row) };
    },
  };

  return {
    rows,
    deps,
    cook(userId: string, slug: string, daysAgo: number, clientEntryId: string | null = null): Row {
      const row: Row = {
        id: nextId++,
        user_id: userId,
        recipe_slug: slug,
        cooked_at: new Date(NOW.getTime() - daysAgo * DAY).toISOString(),
        client_entry_id: clientEntryId,
        rating: null,
        make_again: null,
        note: null,
      };
      rows.push(row);
      return row;
    },
    /** Mirrors importMealHistoryForUser: plan, then insert with (user, client id) uniqueness. */
    importLocal(userId: string, entries: MealHistoryImportCandidate[]) {
      const plan = planMealHistoryImport(
        entries,
        mine(userId).map((r) => ({
          client_entry_id: r.client_entry_id,
          recipe_slug: r.recipe_slug,
          cooked_at_ms: Date.parse(r.cooked_at),
        })),
        isApprovedCatalogSlug,
        NOW,
      );
      let imported = 0;
      let duplicates = plan.duplicates;
      for (const p of plan.toInsert) {
        if (rows.some((r) => r.user_id === userId && r.client_entry_id === p.client_entry_id)) {
          duplicates += 1;
          continue;
        }
        rows.push({
          id: nextId++,
          user_id: userId,
          recipe_slug: p.recipe_slug,
          cooked_at: p.cooked_at,
          client_entry_id: p.client_entry_id,
          rating: null,
          make_again: null,
          note: null,
        });
        imported += 1;
      }
      return { imported, duplicates, skipped: plan.skipped };
    },
  };
}

function local(id: string, slug: string, daysAgo: number): MealHistoryImportCandidate {
  return { client_entry_id: id, recipe_slug: slug, cooked_at: new Date(NOW.getTime() - daysAgo * DAY).toISOString() };
}

function seedMixedHistory() {
  const mem = createMemoryHistory();
  mem.cook(USER, SLUG_A, 1);
  mem.cook(USER, SLUG_B, 10);
  mem.cook(USER, SLUG_C, 29);
  const old1 = mem.cook(USER, SLUG_A, 31);
  old1.rating = 5;
  old1.make_again = true;
  mem.cook(USER, SLUG_D, 200);
  mem.cook("someone-else", SLUG_A, 2);
  return mem;
}

async function main() {
  assert.ok([SLUG_A, SLUG_B, SLUG_C, SLUG_D].every((s) => isApprovedCatalogSlug(s!)), "fixture slugs are real");

  console.log("\nEntitlements");
  await test("every signed-in plan logs durable history; guest does not", () => {
    assert.equal(FREE.canLog, true);
    assert.equal(PREMIUM.canLog, true);
    assert.equal(GUEST.canLog, false);
  });
  await test("Free = 30-day window without full history; Premium = full history", () => {
    assert.deepEqual(FREE, { tier: "free", canLog: true, windowDays: FREE_HISTORY_WINDOW_DAYS, fullHistory: false });
    assert.deepEqual(PREMIUM, { tier: "premium", canLog: true, windowDays: null, fullHistory: true });
    assert.equal(FREE_HISTORY_WINDOW_DAYS, 30);
  });
  await test("meal_history is free (personal); meal_memory stays Pro-only", () => {
    assert.ok(PLAN_BASE_FEATURES.personal.includes("meal_history"));
    assert.ok(!PLAN_BASE_FEATURES.personal.includes("meal_memory"));
    assert.ok(PLAN_BASE_FEATURES.firefighter_plus.includes("meal_history"));
    assert.ok(PLAN_BASE_FEATURES.firefighter_plus.includes("meal_memory"));
    assert.ok(!PLAN_BASE_FEATURES.guest.includes("meal_history"));
  });
  await test("an admin-disabled meal_history flag turns logging off for Free", () => {
    const features = featuresFor("personal");
    features.meal_history = false;
    assert.equal(resolveMealHistoryAccess(features).canLog, false);
  });

  console.log("\nFree user");
  await test("sees only the last 30 days, newest first, and a locked count for older meals", async () => {
    const mem = seedMixedHistory();
    const res = await buildMealHistoryList(mem.deps, USER, FREE, {}, NOW);
    assert.equal(res.tier, "free");
    assert.equal(res.window_days, 30);
    assert.deepEqual(
      res.entries.map((e) => e.recipe_slug),
      [SLUG_A, SLUG_B, SLUG_C],
    );
    assert.equal(res.locked_count, 2);
    assert.deepEqual(res.favorites, []);
  });
  await test("can rate, note, and mark make-again on a visible meal", async () => {
    const mem = seedMixedHistory();
    const visible = mem.rows.find((r) => r.recipe_slug === SLUG_B)!;
    const out = await submitFeedbackWithAccess(
      mem.deps,
      USER,
      FREE,
      visible.id,
      { rating: 4, make_again: true, note: "Double the garlic" },
      NOW,
    );
    assert.ok(out.ok);
    assert.equal(visible.rating, 4);
    assert.equal(visible.make_again, true);
    assert.equal(visible.note, "Double the garlic");
  });
  await test("cannot edit long-term ratings/notes on meals older than 30 days", async () => {
    const mem = seedMixedHistory();
    const old = mem.rows.find((r) => r.recipe_slug === SLUG_D)!;
    const out = await submitFeedbackWithAccess(mem.deps, USER, FREE, old.id, { rating: 1 }, NOW);
    assert.ok(!out.ok && out.status === 403);
    assert.equal(old.rating, null, "row untouched");
  });
  await test("recent-repeat avoidance only draws from the free window", () => {
    const since = visibleSince(FREE, NOW)!;
    assert.equal(since.toISOString(), new Date(NOW.getTime() - 30 * DAY).toISOString());
    assert.equal(visibleSince(PREMIUM, NOW), null);
  });
  await test("another user's rows are never counted or shown", async () => {
    const mem = seedMixedHistory();
    const res = await buildMealHistoryList(mem.deps, USER, PREMIUM, {}, NOW);
    assert.equal(res.entries.length, 5);
  });

  console.log("\nPremium user");
  await test("sees full history, no locked rows, and crew favorites from old meals", async () => {
    const mem = seedMixedHistory();
    const res = await buildMealHistoryList(mem.deps, USER, PREMIUM, {}, NOW);
    assert.equal(res.tier, "premium");
    assert.equal(res.window_days, null);
    assert.equal(res.entries.length, 5);
    assert.equal(res.locked_count, 0);
    assert.deepEqual(
      res.favorites.map((f) => f.recipe_slug),
      [SLUG_A],
    );
  });
  await test("can edit feedback on a meal from 200 days ago", async () => {
    const mem = seedMixedHistory();
    const old = mem.rows.find((r) => r.recipe_slug === SLUG_D)!;
    const out = await submitFeedbackWithAccess(mem.deps, USER, PREMIUM, old.id, { note: "Crew classic" }, NOW);
    assert.ok(out.ok);
    assert.equal(old.note, "Crew classic");
  });
  await test("pages through full history with has_more", async () => {
    const mem = createMemoryHistory();
    for (let i = 0; i < 45; i++) mem.cook(USER, SLUG_A, i * 3);
    const first = await buildMealHistoryList(mem.deps, USER, PREMIUM, { limit: 30 }, NOW);
    assert.equal(first.entries.length, 30);
    assert.equal(first.has_more, true);
    const all = await buildMealHistoryList(mem.deps, USER, PREMIUM, { limit: 60 }, NOW);
    assert.equal(all.entries.length, 45);
    assert.equal(all.has_more, false);
  });

  console.log("\nDowngrade and upgrade");
  await test("downgrade hides older meals but keeps every row stored", async () => {
    const mem = seedMixedHistory();
    const before = mem.rows.length;
    const asPremium = await buildMealHistoryList(mem.deps, USER, PREMIUM, {}, NOW);
    const asFree = await buildMealHistoryList(mem.deps, USER, FREE, {}, NOW);
    assert.equal(asPremium.entries.length, 5);
    assert.equal(asFree.entries.length, 3);
    assert.equal(asFree.locked_count, 2);
    assert.equal(mem.rows.length, before, "nothing deleted on downgrade");
    const old = mem.rows.find((r) => r.recipe_slug === SLUG_A && r.rating === 5);
    assert.ok(old, "older rating survives downgrade");
  });
  await test("upgrading again shows older meals immediately, with ratings intact", async () => {
    const mem = seedMixedHistory();
    await buildMealHistoryList(mem.deps, USER, FREE, {}, NOW);
    const again = await buildMealHistoryList(mem.deps, USER, PREMIUM, {}, NOW);
    assert.equal(again.entries.length, 5);
    assert.equal(again.locked_count, 0);
    assert.equal(again.entries.find((e) => e.rating === 5)?.make_again, true);
  });
  await test("a meal that ages past 30 days moves from visible to locked, not deleted", async () => {
    const mem = createMemoryHistory();
    mem.cook(USER, SLUG_A, 29);
    const today = await buildMealHistoryList(mem.deps, USER, FREE, {}, NOW);
    const later = await buildMealHistoryList(mem.deps, USER, FREE, {}, new Date(NOW.getTime() + 2 * DAY));
    assert.equal(today.entries.length, 1);
    assert.equal(later.entries.length, 0);
    assert.equal(later.locked_count, 1);
  });

  console.log("\nImported legacy history");
  await test("Free users import local history, including meals older than 30 days", async () => {
    const mem = createMemoryHistory();
    const out = mem.importLocal(USER, [local("loc-1", SLUG_A, 3), local("loc-2", SLUG_B, 45), local("loc-3", SLUG_C, 120)]);
    assert.deepEqual(out, { imported: 3, duplicates: 0, skipped: 0 });
    const free = await buildMealHistoryList(mem.deps, USER, FREE, {}, NOW);
    assert.equal(free.entries.length, 1);
    assert.equal(free.locked_count, 2);
    const premium = await buildMealHistoryList(mem.deps, USER, PREMIUM, {}, NOW);
    assert.equal(premium.entries.length, 3);
  });
  await test("invalid slugs and implausible timestamps are skipped", () => {
    const mem = createMemoryHistory();
    const out = mem.importLocal(USER, [
      local("bad-1", "not-a-real-recipe-xyz", 2),
      { client_entry_id: "bad-2", recipe_slug: SLUG_A!, cooked_at: "2019-01-01T00:00:00Z" },
      { client_entry_id: "bad-3", recipe_slug: SLUG_A!, cooked_at: new Date(NOW.getTime() + 3 * DAY).toISOString() },
      { client_entry_id: "bad-4", recipe_slug: SLUG_A!, cooked_at: "not a date" },
    ]);
    assert.deepEqual(out, { imported: 0, duplicates: 0, skipped: 4 });
    assert.equal(mem.rows.length, 0);
  });

  console.log("\nNo duplicate meals");
  await test("re-running the same import inserts nothing", () => {
    const mem = createMemoryHistory();
    const batch = [local("loc-1", SLUG_A, 3), local("loc-2", SLUG_B, 45)];
    mem.importLocal(USER, batch);
    const again = mem.importLocal(USER, batch);
    assert.deepEqual(again, { imported: 0, duplicates: 2, skipped: 0 });
    assert.equal(mem.rows.length, 2);
  });
  await test("a live Cook Mode log carrying the local id is not imported again", () => {
    const mem = createMemoryHistory();
    mem.cook(USER, SLUG_A, 0, "loc-live");
    const out = mem.importLocal(USER, [local("loc-live", SLUG_A, 0)]);
    assert.equal(out.imported, 0);
    assert.equal(mem.rows.length, 1);
  });
  await test("an older keyless live row absorbs the matching local entry once", () => {
    const mem = createMemoryHistory();
    const keyless = mem.cook(USER, SLUG_A, 5);
    const near = new Date(Date.parse(keyless.cooked_at) + IMPORT_MATCH_WINDOW_MS / 2).toISOString();
    const out = mem.importLocal(USER, [
      { client_entry_id: "dev-1", recipe_slug: SLUG_A!, cooked_at: near },
      { client_entry_id: "dev-2", recipe_slug: SLUG_A!, cooked_at: near },
    ]);
    assert.deepEqual(out, { imported: 1, duplicates: 1, skipped: 0 }, "second genuine cook is still kept");
    assert.equal(mem.rows.length, 2);
  });
  await test("the same client id twice in one batch is inserted once", () => {
    const mem = createMemoryHistory();
    const out = mem.importLocal(USER, [local("dup", SLUG_A, 2), local("dup", SLUG_A, 2)]);
    assert.deepEqual(out, { imported: 1, duplicates: 1, skipped: 0 });
  });
  await test("the same recipe cooked on different days stays as separate meals", () => {
    const mem = createMemoryHistory();
    const out = mem.importLocal(USER, [local("d1", SLUG_A, 2), local("d2", SLUG_A, 9)]);
    assert.equal(out.imported, 2);
  });
  await test("one user's client ids never collide with another user's", () => {
    const mem = createMemoryHistory();
    mem.importLocal("other-user", [local("shared-id", SLUG_A, 2)]);
    const out = mem.importLocal(USER, [local("shared-id", SLUG_A, 2)]);
    assert.equal(out.imported, 1);
  });

  console.log("\nGuest / analytics / wiring");
  await test("a session without meal_history gets an empty, non-entitled response", async () => {
    const mem = seedMixedHistory();
    const res = await buildMealHistoryList(mem.deps, USER, GUEST, {}, NOW);
    assert.equal(res.entitled, false);
    assert.equal(res.entries.length, 0);
    const fb = await submitFeedbackWithAccess(mem.deps, USER, GUEST, 1, { rating: 5 }, NOW);
    assert.ok(!fb.ok && fb.status === 403);
  });
  await test("analytics events are registered", () => {
    for (const e of ["meal_logged", "meal_rated", "meal_note_added", "history_paywall_viewed"]) {
      assert.ok((ANALYTICS_EVENT_TYPES as readonly string[]).includes(e), e);
    }
  });
  await test("API, Cook Mode, and Generator recency no longer require Pro to log history", () => {
    const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
    assert.ok(!/meal_memory/.test(read("server/meal-history/routes.ts")));
    const button = read("client/src/components/cook-mode/start-cooking-button.tsx");
    assert.ok(/if \(!canLogHistory \|\| !recipeSlug\) return;/.test(button));
    const gen = read("server/routes.ts");
    assert.ok(/listRecentCookedSlugsOldestFirst\(authUserId, 10, visibleSince\(historyAccess\)\)/.test(gen));
    assert.ok(/hasFeature\(requestUserBilling\.features, "meal_memory"\) &&\s*request\.personalize_with_history/.test(gen));
  });

  console.log(`\n${passed} meal history tier checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
