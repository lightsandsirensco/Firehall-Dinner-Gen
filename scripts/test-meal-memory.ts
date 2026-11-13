#!/usr/bin/env tsx
/**
 * Meal Memory acceptance tests (real catalog, real pick pipeline, PGlite DB).
 *
 *  1. A 5★ meal cooked 30 days ago returns in >= 20% of 200 eligible picks (and not so often it crowds out variety).
 *  2. A meal cooked 3 days ago is never auto-picked.
 *  3. "Not for us": never auto-picked in 500 picks (Pro and Free), still in Explore and still has a recipe page; undo restores it.
 *  4. Explanations match the stored rows (rating, days ago, saved state); "Picked for you" only when a personal signal fired.
 *  5. Allergies, diets and Foods to Avoid still hard-exclude a 5★ favorite.
 *  6. Nutrition-goal lines only for recipes with validated nutrition.
 *  7. Shift Planner: same exclusions + reasons; reasons persist with the slot and clear on a manual change;
 *     meals planned on shifts within 7 days are avoided.
 *
 *   npx tsx scripts/test-meal-memory.ts
 */
import "./lib/pglite-test-db.js";
import fs from "node:fs";
import path from "node:path";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";
import { initCacheStore } from "../server/cache-store.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { deleteUserAccount, upsertEmailUser } from "../server/auth/auth-store.js";
import { adminSetUserPlan, initBillingStore, resolveUserBilling } from "../server/billing/store.js";
import { initHallMembershipStore } from "../server/hall-membership/store.js";
import { pgRun } from "../server/db/pg-sql.js";
import { hasFeature } from "../shared/billing/types.js";
import {
  computeHistorySignals,
  invalidateHistorySignalsCache,
  type HistorySignals,
} from "../server/generation/history-personalization.js";
import { runLocalFirstGeneratePipeline } from "../server/generation/local-first-pipeline.js";
import { tonightStandaloneMealSlugs } from "../server/generation/tonight-eligibility.js";
import {
  addDislike,
  listDislikedSlugs,
  listDislikes,
  loadDislikedSlugsForPicking,
  removeDislike,
} from "../server/meal-memory/dislikes.js";
import { getApprovedCatalog } from "../server/approved-catalog-cache.js";
import { loadCanonicalCatalogPage } from "../server/meal-catalog/canonical-page.js";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";
import { classifyRecipeDietary } from "../shared/dietary/classify-recipe.js";
import { ALLERGEN_KEYWORDS, scanRecipeForAllergens } from "../server/allergens.js";
import { FOOD_PREFERENCE_DEFINITIONS } from "../shared/ingredient-preferences/definitions.js";
import { recipeMatchesFoodPreference } from "../shared/ingredient-preferences/match.js";
import {
  PROFILE_NUTRITION_GOALS,
  describeNutritionGoalFit,
} from "../shared/nutrition/profile-goals.js";
import { nutritionGoalFactsForSlug } from "../server/generation/nutrition-goals-gate.js";
import { createSlotPicker } from "../server/shift-plan/picker.js";
import { createMemoryShiftPlanRepo } from "../server/shift-plan/store.js";
import { fillShiftPlan, getShiftPlan, patchShiftPlanSlot, type ShiftPlanDeps, type SlotPicker } from "../server/shift-plan/service.js";
import { applySlotPatch, defaultSlotState } from "../shared/shift-plan/plan.js";
import type { PersonalSchedule } from "../shared/schedule/types.js";
import type { PlannedRecipe } from "../shared/shift-plan/types.js";

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
  else {
    failed++;
    console.error(`✗ FAIL: ${name}${detail ? `\n    ${detail}` : ""}`);
  }
}

const ALLERGEN_KEYS = Object.keys(ALLERGEN_KEYWORDS);
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY - 60_000);

interface Pick {
  slug: string;
  reasons: string[];
  pickedForYou: boolean;
  favoriteReturned: boolean;
}

async function pickMany(
  n: number,
  label: string,
  opts: { signals?: HistorySignals | null; disliked?: ReadonlySet<string>; request?: Record<string, unknown> },
): Promise<Pick[]> {
  const out: Pick[] = [];
  for (let i = 0; i < n; i++) {
    const request = buildGenerateRequestInput({
      crew_size: 8,
      time_available: "45-60",
      protein: "any",
      healthiness_preference: "balanced",
      ...(opts.request ?? {}),
    } as never);
    try {
      const hit = await runLocalFirstGeneratePipeline({
        request,
        v2SessionKey: `meal-memory:${label}:${i}`,
        varietySeed: 50_000 + i * 104_729,
        recentSignatures: [],
        recentSlugs: [],
        preferDifferentStyle: false,
        startTime: Date.now(),
        restrictToSlugs: tonightStandaloneMealSlugs(),
        historySignals: opts.signals ?? null,
        dislikedSlugs: opts.disliked ?? null,
      });
      out.push({
        slug: String(hit.extras._slug),
        reasons: (hit.extras._personalization_reasons as string[] | undefined) ?? [],
        pickedForYou: hit.extras._picked_for_you === true,
        favoriteReturned: hit.extras._favorite_returned === true,
      });
    } catch {
      out.push({ slug: "<none>", reasons: [], pickedForYou: false, favoriteReturned: false });
    }
  }
  return out;
}

const pct = (part: number, whole: number) => Math.round((part / whole) * 100);

async function main(): Promise<void> {
  initCacheStore();
  await initCuratedRecipeStore();
  await initHallMembershipStore();
  await initBillingStore();

  // Fixture meals: frequent default Free picks (from the parity baseline), so each is genuinely eligible.
  const baseline = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "scripts", "fixtures", "meal-memory-free-baseline.json"), "utf8"),
  ) as Record<string, string[]>;
  const counts = new Map<string, number>();
  for (const slug of Object.values(baseline).flat()) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  const meatDinners = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug)
    .filter((slug) => {
      const page = loadCanonicalCatalogPage(slug);
      return page && !classifyRecipeDietary(page.ingredients.map((i) => ({ name: i.name, notes: i.notes }))).flags.vegetarian;
    });
  const [DISLIKED, FAV, RECENT, SAVED] = meatDinners;
  check("fixture meals chosen from real default picks", Boolean(DISLIKED && FAV && RECENT && SAVED), [DISLIKED, FAV, RECENT, SAVED].join(", "));

  const { user: pro } = await upsertEmailUser("meal-memory-pro@test.firehall");
  const { user: free } = await upsertEmailUser("meal-memory-free@test.firehall");
  await adminSetUserPlan(pro.user_id, "firefighter_plus", "active");

  // Seed history: FAV 5★ 30 days ago, RECENT 5★ 3 days ago, SAVED saved (never cooked), plus filler so totalRows is realistic.
  const insert = (userId: string, slug: string, when: Date, rating: number | null) =>
    pgRun(`INSERT INTO user_meal_history (user_id, recipe_slug, cooked_at, rating) VALUES ($1, $2, $3, $4)`, [userId, slug, when, rating]);
  for (const user of [pro, free]) {
    await insert(user.user_id, FAV!, daysAgo(30), 5);
    await insert(user.user_id, RECENT!, daysAgo(3), 5);
    await pgRun(
      `INSERT INTO user_saved_recipes (user_id, recipe_key, recipe_json) VALUES ($1, $2, $3)`,
      [user.user_id, `saved-${SAVED}`, JSON.stringify({ _slug: SAVED, title: "Saved" })],
    );
  }

  console.log("\n--- Entitlement ---");
  const proBilling = await resolveUserBilling(pro.user_id);
  const freeBilling = await resolveUserBilling(free.user_id);
  check("Pro has meal_memory", hasFeature(proBilling.features, "meal_memory"));
  check("Free does not have meal_memory (no favorites/explanations, same picks as before)", !hasFeature(freeBilling.features, "meal_memory"));

  const signals = await computeHistorySignals(pro.user_id);
  check("history signals load from the database", Boolean(signals) && signals!.savedSlugs.has(SAVED!) && signals!.latestRatingBySlug.get(FAV!) === 5);

  console.log("\n--- 1 & 2. Favorites come back; recent cooks sit out (200 Pro picks) ---");
  const proPicks = await pickMany(200, "pro", { signals });
  const favCount = proPicks.filter((p) => p.slug === FAV).length;
  const savedCount = proPicks.filter((p) => p.slug === SAVED).length;
  const recentCount = proPicks.filter((p) => p.slug === RECENT).length;
  const distinct = new Set(proPicks.map((p) => p.slug)).size;
  const favoriteReturns = proPicks.filter((p) => p.favoriteReturned).length;
  check("a due favorite (rated or saved) returns in >= 20% of picks", pct(favCount + savedCount, 200) >= 20, `rated ${pct(favCount, 200)}% + saved ${pct(savedCount, 200)}%`);
  check("favorites don't crowd out variety (<= 45% combined)", pct(favCount + savedCount, 200) <= 45, `${distinct} different meals in 200 picks`);
  check("the 5★ favorite alone returns at least 1 pick in 10", pct(favCount, 200) >= 10, `${favCount}/200`);
  check("a meal cooked 3 days ago is never auto-picked", recentCount === 0, `${recentCount}/200`);
  check("favorites lane fires on roughly 30% of picks", favoriteReturns >= 40 && favoriteReturns <= 80, `${favoriteReturns}/200`);

  console.log("\n--- 4. Explanations match the stored data ---");
  const favPick = proPicks.find((p) => p.slug === FAV);
  const savedPick = proPicks.find((p) => p.slug === SAVED);
  check(
    "rated favorite explains with the real rating and days since cooked",
    favPick?.reasons[0] === "You rated this 5★ · last cooked 4 weeks ago",
    JSON.stringify(favPick?.reasons),
  );
  check("saved favorite explains it was saved and never cooked", savedPick?.reasons[0] === "Saved by you · not cooked yet", JSON.stringify(savedPick?.reasons));
  check("favorites carry the Picked-for-you label", Boolean(favPick?.pickedForYou && savedPick?.pickedForYou));
  const wrongLabel = proPicks.filter((p) => p.pickedForYou && p.slug !== FAV && p.slug !== SAVED);
  check("no other pick claims Picked for you (no personal signal fired for them)", wrongLabel.length === 0, wrongLabel.map((p) => p.slug).join(","));
  const vague = proPicks.filter((p) => p.reasons.some((r) => /worth another round|tends to/i.test(r)));
  check("no old generic explanation text remains", vague.length === 0);

  console.log("\n--- 3. Not for us ---");
  await addDislike(pro.user_id, DISLIKED!);
  await addDislike(free.user_id, DISLIKED!);
  await addDislike(pro.user_id, DISLIKED!); // idempotent
  const proDisliked = await loadDislikedSlugsForPicking(pro.user_id);
  const freeDisliked = await loadDislikedSlugsForPicking(free.user_id);
  check("dislike stored once per user", (await listDislikes(pro.user_id)).length === 1 && freeDisliked.has(DISLIKED!));
  const baselineHits = Object.values(baseline).flat().filter((s) => s === DISLIKED).length;
  const proAfter = await pickMany(250, "pro-dislike", { signals, disliked: proDisliked });
  const freeAfter = await pickMany(250, "free-dislike", { disliked: freeDisliked });
  const dislikedHits = [...proAfter, ...freeAfter].filter((p) => p.slug === DISLIKED).length;
  check("a 'Not for us' meal never appears in 500 automatic picks (Pro + Free)", dislikedHits === 0, `it was picked ${baselineHits}/120 times in the Free baseline`);
  check("Free 'Not for us' picks never claim personalization", freeAfter.every((p) => !p.pickedForYou && p.reasons.length === 0));
  check("still listed in Explore", getApprovedCatalog().recipes.some((r) => r.slug === DISLIKED));
  check("still has its recipe page", loadCanonicalCatalogPage(DISLIKED!) != null);
  await removeDislike(pro.user_id, DISLIKED!);
  check("undo removes it from the hidden list", !(await loadDislikedSlugsForPicking(pro.user_id)).has(DISLIKED!));
  check("signed-out users have no dislikes", (await loadDislikedSlugsForPicking(null)).size === 0);

  console.log("\n--- 5. Hard rules beat favorites ---");
  const vegPicks = await pickMany(60, "veg", { signals, request: { dietary_restrictions: ["vegetarian"] } });
  check("vegetarian diet never serves the (meat) 5★ favorite or saved meal", vegPicks.every((p) => p.slug !== FAV && p.slug !== SAVED));
  const favProtein = getApprovedCatalog().recipes.find((r) => r.slug === FAV)?.protein ?? "";
  const otherProtein = favProtein === "chicken" ? "beef" : "chicken";
  const proteinPicks = await pickMany(60, "protein", { signals, request: { protein: otherProtein } });
  check(`an explicit ${otherProtein} request never serves the ${favProtein} favorite`, proteinPicks.every((p) => p.slug !== FAV));

  const favPage = loadCanonicalCatalogPage(FAV!)!;
  const favIngredients = favPage.ingredients.map((i) => ({ name: i.name, notes: i.notes }));
  const avoidKey = FOOD_PREFERENCE_DEFINITIONS.find((d) => recipeMatchesFoodPreference(favIngredients, d))?.key;
  if (avoidKey) {
    const avoidPicks = await pickMany(60, "avoid", { signals, request: { foods_to_avoid: [avoidKey] } });
    check(`Foods to Avoid (${avoidKey}) never serves the 5★ favorite`, avoidPicks.every((p) => p.slug !== FAV));
  } else {
    check("favorite matches a Foods to Avoid definition (fixture)", false, `no definition matched ${FAV}`);
  }
  const allergen = ALLERGEN_KEYS.find(
    (a) => scanRecipeForAllergens(favPage.ingredients.map((i) => ({ item: i.name, amount: "", notes: i.notes })), [], favPage.title, [a]).found,
  );
  if (allergen) {
    const allergyPicks = await pickMany(60, "allergy", { signals, request: { allergens_to_avoid: [allergen] } });
    check(`allergy (${allergen}) never serves the 5★ favorite`, allergyPicks.every((p) => p.slug !== FAV));
  } else {
    console.log(`  (no tracked allergen in ${FAV}; allergy exclusion covered by the diet and Foods to Avoid checks)`);
  }

  console.log("\n--- 6. Nutrition goal claims need validated nutrition ---");
  const catalog = getApprovedCatalog().recipes;
  let badClaims = 0;
  const recipesWithClaim = new Set<string>();
  for (const r of catalog) {
    for (const goal of PROFILE_NUTRITION_GOALS) {
      const line = describeNutritionGoalFit(goal, nutritionGoalFactsForSlug(r.slug));
      if (!line) continue;
      recipesWithClaim.add(r.slug);
      if (!r.numericFilterEligible) badClaims++;
      if (goal === "high_protein" && r.macros && !line.includes(`${Math.round(r.macros.protein)} g protein`)) badClaims++;
    }
  }
  const validated = catalog.filter((r) => r.numericFilterEligible).length;
  check(
    "no goal-fit line for any recipe without validated nutrition; grams match the data",
    badClaims === 0,
    `${validated}/${catalog.length} recipes have validated nutrition; ${recipesWithClaim.size} can show a goal-fit line`,
  );

  console.log("\n--- 7. Shift Planner ---");
  const TZ = "America/Toronto";
  const sched: PersonalSchedule = {
    timezone: TZ,
    anchorDate: "2026-10-08",
    startTime: "07:00",
    blocks: [
      { kind: "on", minutes: 24 * 60 },
      { kind: "off", minutes: 48 * 60 },
    ],
    defaultCrewSize: 6,
  };
  const NOW = new Date("2026-10-08T03:30:00Z");
  const resolveRecipe = (slug: string): PlannedRecipe => ({ slug, title: slug, imageUrl: null, totalMinutes: 30, path: `/recipes/${slug}` });
  const makeDeps = (repo = createMemoryShiftPlanRepo()): ShiftPlanDeps => ({
    repo,
    loadSchedule: async () => ({ schedule: sched, overrides: [], mealPreferences: {} }),
    resolveRecipe,
    isSelectableSlug: () => true,
    canPlanAhead: async () => true,
    canRunItBack: async () => false,
    now: () => NOW,
  });

  // Real picker, real catalog: dinner slot with Pro signals + a dislike.
  await addDislike(pro.user_id, DISLIKED!);
  const view = await getShiftPlan(makeDeps(), pro.user_id);
  const dinner = view.slots.find((s) => s.type === "dinner")!;
  const breakfast = view.slots.find((s) => s.type === "breakfast")!;
  const realPicker = createSlotPicker({
    base: buildGenerateRequestInput({ crew_size: 6, protein: "any" } as never),
    recentSlugs: [],
    historySignals: signals,
    dislikedSlugs: await loadDislikedSlugsForPicking(pro.user_id),
    sessionKey: "meal-memory-shift",
  });
  const slotPicks = [];
  for (let i = 0; i < 80; i++) {
    const raw = await realPicker(dinner, { hard: [], soft: [] }, `seed-${i}`);
    slotPicks.push(typeof raw === "string" ? { slug: raw, why: null } : raw);
  }
  const shiftFav = slotPicks.filter((p) => p?.slug === FAV || p?.slug === SAVED).length;
  check("planner never auto-picks a 'Not for us' meal", slotPicks.every((p) => p?.slug !== DISLIKED));
  check("planner never auto-picks a meal cooked 3 days ago", slotPicks.every((p) => p?.slug !== RECENT));
  check("planner brings favorites back too", shiftFav >= 8, `${shiftFav}/80 dinner slots`);
  const favSlot = slotPicks.find((p) => p?.slug === FAV);
  check(
    "planner shows the same explanation as Pick Tonight",
    favSlot?.why?.reasons[0] === "You rated this 5★ · last cooked 4 weeks ago" && favSlot.why.pickedForYou === true,
    JSON.stringify(favSlot?.why),
  );
  const bfast = await realPicker(breakfast, { hard: [], soft: [] }, "bfast-1");
  check("breakfast slots still get a pick with Meal Memory on", Boolean(bfast));

  // Service: reasons persist, clear on manual change; nearby-shift repeats avoided.
  const repo = createMemoryShiftPlanRepo();
  const deps = makeDeps(repo);
  const shiftKey = "2026-10-08T07:00";
  const nextShiftKey = "2026-10-11T07:00";
  const nextView = await getShiftPlan(deps, pro.user_id, nextShiftKey);
  const nextDinner = nextView.slots.find((s) => s.type === "dinner")!;
  await repo.saveSlots(pro.user_id, nextShiftKey, [
    applySlotPatch(defaultSlotState(nextDinner.key), { recipeSlug: "dinner-a", selectionSource: "auto" }, 6),
  ]);
  const log: Array<{ soft: string[] }> = [];
  const fake: SlotPicker = async (slot, avoid) => {
    log.push({ soft: avoid.soft });
    const prefix = slot.type === "dinner" ? "dinner" : slot.type === "lunch" ? "lunch" : slot.type === "breakfast" ? "eggs" : "late";
    const pool = ["a", "b", "c"].map((x) => `${prefix}-${x}`);
    const slug = pool.find((s) => !avoid.hard.includes(s) && !avoid.soft.includes(s)) ?? pool[0]!;
    return { slug, why: { reasons: [`You rated this 5★ · last cooked 4 weeks ago`], pickedForYou: true } };
  };
  const filled = await fillShiftPlan(deps, pro.user_id, { shiftKey, mode: "fill" }, fake);
  const filledDinner = filled.plan.slots.find((s) => s.type === "dinner")!;
  check("a meal planned 3 days later is avoided when anything else fits", log.every((l) => l.soft.includes("dinner-a")) && filledDinner.recipe?.slug !== "dinner-a", `dinner → ${filledDinner.recipe?.slug}`);
  check("auto-pick reasons are saved with the slot", filledDinner.pickWhy?.pickedForYou === true && filledDinner.pickWhy.reasons.length === 1);
  const manual = await patchShiftPlanSlot(deps, pro.user_id, { shiftKey, slotKey: filledDinner.key, recipeSlug: "dinner-c" });
  const manualDinner = manual.plan.slots.find((s) => s.key === filledDinner.key)!;
  check("a manual pick clears the old reasons (no stale 'Picked for you')", manualDinner.pickWhy === null);

  console.log("\n--- Privacy ---");
  await addDislike(free.user_id, RECENT!);
  await deleteUserAccount(free.user_id);
  check("account deletion removes the user's hidden meals", (await listDislikedSlugs(free.user_id)).size === 0);

  invalidateHistorySignalsCache(pro.user_id);
  console.log(`\n[test-meal-memory] ${failed === 0 ? "OK" : `${failed} FAILURE(S)`}`);
}

main()
  .catch((err) => {
    console.error(err);
    failed++;
  })
  .finally(() => {
    releaseSqliteTimersForTests();
    process.exit(failed > 0 ? 1 : 0);
  });
