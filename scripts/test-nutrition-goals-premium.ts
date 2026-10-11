#!/usr/bin/env tsx
/**
 * Firehall Meals Pro — saved single-select "Nutrition Goal".
 *
 *   npx tsx scripts/test-nutrition-goals-premium.ts
 */
import {
  PROFILE_NUTRITION_GOALS,
  PROFILE_NUTRITION_GOAL_KEY_LABELS,
  PROFILE_GOAL_MAX_BONUS,
  PROFILE_GOAL_MAX_PENALTY,
  profileNutritionGoalToList,
  sanitizeProfileNutritionGoal,
  scoreProfileNutritionGoal,
  type ProfileGoalRecipeFacts,
  type ProfileNutritionGoalKey,
} from "../shared/nutrition/profile-goals.js";
import { gateNutritionGoalByEntitlement } from "../server/generation/nutrition-goals-gate.js";
import { BILLING_FEATURES, PLAN_BASE_FEATURES, type BillingFeature } from "../shared/billing/types.js";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";
import { pickBreakfast, type BreakfastCandidate } from "../shared/shift-plan/breakfast.js";
import { buildSlotGenerateRequest } from "../shared/shift-plan/plan.js";
import { profileUpdateSchema } from "../shared/auth/schema.js";

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) console.log(`  ok  ${name}${detail ? ` — ${detail}` : ""}`);
  else {
    failures++;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function features(enabled: BillingFeature[]): Record<BillingFeature, boolean> {
  return Object.fromEntries(BILLING_FEATURES.map((f) => [f, enabled.includes(f)])) as Record<BillingFeature, boolean>;
}

const GOALS = PROFILE_NUTRITION_GOALS;

/** Rank a pool by goal score alone (stable tie-break on slug). */
function rankBy<T extends { slug: string; facts: ProfileGoalRecipeFacts }>(goal: ProfileNutritionGoalKey | null, pool: T[]): string[] {
  return pool
    .map((r) => ({ slug: r.slug, s: scoreProfileNutritionGoal(goal, r.facts) }))
    .sort((a, b) => b.s - a.s || a.slug.localeCompare(b.slug))
    .map((r) => r.slug);
}

/** Spearman rank correlation between two orderings of the same items. */
function spearman(a: string[], b: string[]): number {
  const pos = new Map(b.map((s, i) => [s, i]));
  const n = a.length;
  const d2 = a.reduce((sum, s, i) => sum + (i - pos.get(s)!) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

console.log("Definitions");
check("exactly the 4 launch goals", GOALS.join() === "high_protein,lower_calorie,lower_carb,balanced");
check("labels", GOALS.map((g) => PROFILE_NUTRITION_GOAL_KEY_LABELS[g]).join() === "High Protein,Lower Calorie,Lower Carb,Balanced");
check("Pro plan includes nutrition_goals", PLAN_BASE_FEATURES.firefighter_plus.includes("nutrition_goals"));
check(
  "Free plans exclude nutrition_goals",
  !PLAN_BASE_FEATURES.guest.includes("nutrition_goals") && !PLAN_BASE_FEATURES.personal.includes("nutrition_goals"),
);

console.log("Single select");
check("unknown keys dropped", sanitizeProfileNutritionGoal(["keto", 4, "lower_carb"]) === "lower_carb");
check("legacy multi-select row keeps only its first launch goal", sanitizeProfileNutritionGoal(["lower_fat", "balanced", "high_protein"]) === "balanced");
check("retired-only goals read back as no goal", sanitizeProfileNutritionGoal(["higher_carb", "higher_fibre"]) === null);
check("empty → null", sanitizeProfileNutritionGoal([]) === null && sanitizeProfileNutritionGoal(null) === null);
check("stored as a 0-or-1 list", profileNutritionGoalToList("balanced").join() === "balanced" && profileNutritionGoalToList(null).length === 0);
check("profile PATCH schema accepts the list shape", profileUpdateSchema.safeParse({ nutrition_goals: ["high_protein"] }).success);

console.log("Entitlement gate");
check("Free account → null even with a stored goal", gateNutritionGoalByEntitlement({ features: features([]) }, ["high_protein"]) === null);
check("Pro account → its goal", gateNutritionGoalByEntitlement({ features: features(["nutrition_goals"]) }, ["bogus", "lower_calorie"]) === "lower_calorie");
check("Pro account with nothing saved → null", gateNutritionGoalByEntitlement({ features: features(["nutrition_goals"]) }, []) === null);

console.log("Per-goal signals");
const s = scoreProfileNutritionGoal;
check("no goal → 0", s(null, { calories: 500, protein_g: 40, carbs_g: 30, fat_g: 15 }) === 0);
check("high protein: 45 g > 35 g > 22 g", s("high_protein", { protein_g: 45 }) > s("high_protein", { protein_g: 35 }) && s("high_protein", { protein_g: 35 }) > s("high_protein", { protein_g: 22 }));
check("high protein: 22 g is penalized", s("high_protein", { protein_g: 22 }) < 0);
check("lower calorie: 450 > 600 > 900 kcal", s("lower_calorie", { calories: 450, protein_g: 35 }) > s("lower_calorie", { calories: 600, protein_g: 35 }) && s("lower_calorie", { calories: 600, protein_g: 35 }) > s("lower_calorie", { calories: 900, protein_g: 35 }));
check("lower calorie: a too-light plate is capped", s("lower_calorie", { calories: 300, protein_g: 30 }) < s("lower_calorie", { calories: 450, protein_g: 35 }));
check("lower calorie: low protein is capped", s("lower_calorie", { calories: 420, protein_g: 12 }) < s("lower_calorie", { calories: 420, protein_g: 30 }));
check("lower carb: 15 g > 35 g > 70 g", s("lower_carb", { carbs_g: 15, protein_g: 35 }) > s("lower_carb", { carbs_g: 35, protein_g: 35 }) && s("lower_carb", { carbs_g: 35, protein_g: 35 }) > s("lower_carb", { carbs_g: 70, protein_g: 35 }));
check("lower carb: 70 g is penalized", s("lower_carb", { carbs_g: 70, protein_g: 35 }) < 0);
check(
  "balanced: 30/40/30 split beats a fat-heavy plate",
  s("balanced", { protein_g: 38, carbs_g: 50, fat_g: 17 }) > s("balanced", { protein_g: 25, carbs_g: 10, fat_g: 45 }),
);
check("balanced: over 950 kcal loses points", s("balanced", { calories: 1000, protein_g: 38, carbs_g: 50, fat_g: 17 }) < s("balanced", { calories: 600, protein_g: 38, carbs_g: 50, fat_g: 17 }));
check("bounded", GOALS.every((g) => [{ protein_g: 90, carbs_g: 1, fat_g: 1, calories: 200 }, { protein_g: 5, carbs_g: 200, fat_g: 90, calories: 2000 }]
  .every((f) => { const v = s(g, f); return v <= PROFILE_GOAL_MAX_BONUS && v >= PROFILE_GOAL_MAX_PENALTY; })));
check("unknown macros: flags/category nudge, never invented", s("lower_carb", {}) === 0 && s("high_protein", { highProteinFlag: true }) > 0 && s("lower_calorie", { nutritionCategory: "indulgent" }) < 0);

console.log("Same pool, different ranking (fixture)");
const fixture = [
  { slug: "grilled-chicken-breast-greens", facts: { calories: 430, protein_g: 48, carbs_g: 12, fat_g: 16 } },
  { slug: "turkey-chili", facts: { calories: 520, protein_g: 38, carbs_g: 48, fat_g: 14 } },
  { slug: "shrimp-veg-stir-fry", facts: { calories: 360, protein_g: 30, carbs_g: 30, fat_g: 10 } },
  { slug: "steak-and-potatoes", facts: { calories: 780, protein_g: 50, carbs_g: 55, fat_g: 34 } },
  { slug: "pasta-bake", facts: { calories: 820, protein_g: 32, carbs_g: 95, fat_g: 30 } },
  { slug: "pork-belly-bowl", facts: { calories: 900, protein_g: 28, carbs_g: 20, fat_g: 70 } },
  { slug: "salmon-rice-bowl", facts: { calories: 610, protein_g: 40, carbs_g: 60, fat_g: 18 } },
  { slug: "loaded-nachos", facts: { calories: 1050, protein_g: 26, carbs_g: 90, fat_g: 55 } },
];
const fixtureRanks = Object.fromEntries(GOALS.map((g) => [g, rankBy(g, fixture)])) as Record<ProfileNutritionGoalKey, string[]>;
for (const g of GOALS) console.log(`     ${g.padEnd(13)} ${fixtureRanks[g].slice(0, 4).join(" > ")}`);
check("high protein leads with the 48 g+ meals", fixtureRanks.high_protein.slice(0, 2).sort().join() === "grilled-chicken-breast-greens,steak-and-potatoes");
check("lower calorie leads with the 360 kcal stir fry", fixtureRanks.lower_calorie[0] === "shrimp-veg-stir-fry");
check("lower carb leads with the 12 g carb plate", fixtureRanks.lower_carb[0] === "grilled-chicken-breast-greens");
check("balanced leads with an even split, not the leanest plate", ["turkey-chili", "salmon-rice-bowl"].includes(fixtureRanks.balanced[0]!));
check("every goal puts loaded nachos in the bottom three", GOALS.every((g) => fixtureRanks[g].indexOf("loaded-nachos") >= fixture.length - 3));
check("no two goals produce the same order", new Set(GOALS.map((g) => fixtureRanks[g].join())).size === GOALS.length);

// ---------------------------------------------------------------------------
console.log("Real catalog (no AI, local SQLite)");
const { initCacheStore } = await import("../server/cache-store.js");
const { initCuratedRecipeStore } = await import("../server/curated-recipe-store.js");
const { getApprovedCatalog } = await import("../server/approved-catalog-cache.js");
const { getDefaultGeneratorPoolSlugs, pickGolden100ForGenerate } = await import("../server/generation/pick-local-recipes.js");
const { nutritionGoalFactsForSlug } = await import("../server/generation/nutrition-goals-gate.js");
const { createSlotPicker, loadBreakfastCandidates } = await import("../server/shift-plan/picker.js");
const { flushSqliteToDisk, releaseSqliteTimersForTests } = await import("../server/sqlite.js");
await initCacheStore();
await initCuratedRecipeStore();

const catalog = new Map(getApprovedCatalog().recipes.map((r) => [r.slug, r]));
const dairyFree = (slug: string) => {
  const d = catalog.get(slug)?.dietarySummary;
  return d?.confidence === "high" && d.flags.dairyFree === true;
};

const pool = [...getDefaultGeneratorPoolSlugs().slugs]
  .filter(dairyFree)
  .map((slug) => ({ slug, facts: nutritionGoalFactsForSlug(slug) }))
  .filter((r) => (r.facts.calories ?? 0) > 0);
const realRanks = Object.fromEntries(GOALS.map((g) => [g, rankBy(g, pool)])) as Record<ProfileNutritionGoalKey, string[]>;
const mean = (slugs: string[], key: "calories" | "protein_g" | "carbs_g") =>
  slugs.reduce((sum, slug) => sum + (pool.find((r) => r.slug === slug)!.facts[key] ?? 0), 0) / slugs.length;
const top = (g: ProfileNutritionGoalKey) => realRanks[g].slice(0, 15);
check(`dairy-free eligible pool with verified macros is non-trivial`, pool.length >= 40, `${pool.length} recipes`);
check("high protein top 15 average more protein than the pool", mean(top("high_protein"), "protein_g") > mean(pool.map((r) => r.slug), "protein_g") + 5,
  `${mean(top("high_protein"), "protein_g").toFixed(0)} g vs ${mean(pool.map((r) => r.slug), "protein_g").toFixed(0)} g`);
check("lower calorie top 15 average fewer calories", mean(top("lower_calorie"), "calories") < mean(pool.map((r) => r.slug), "calories") - 60,
  `${mean(top("lower_calorie"), "calories").toFixed(0)} vs ${mean(pool.map((r) => r.slug), "calories").toFixed(0)} kcal`);
check("lower carb top 15 average fewer carbs", mean(top("lower_carb"), "carbs_g") < mean(pool.map((r) => r.slug), "carbs_g") - 10,
  `${mean(top("lower_carb"), "carbs_g").toFixed(0)} g vs ${mean(pool.map((r) => r.slug), "carbs_g").toFixed(0)} g`);
for (let i = 0; i < GOALS.length; i++) {
  for (let j = i + 1; j < GOALS.length; j++) {
    const [a, b] = [GOALS[i]!, GOALS[j]!];
    const overlap = top(a).filter((x) => top(b).includes(x)).length;
    const rho = spearman(realRanks[a], realRanks[b]);
    check(`${a} vs ${b}: different top 15 and order`, overlap <= 10 && rho < 0.85, `top-15 overlap ${overlap}, spearman ${rho.toFixed(2)}`);
  }
}

console.log("Pick Tonight picker (real pipeline)");
const request = buildGenerateRequestInput({
  protein: "any",
  allergens_to_avoid: ["dairy"],
  dietary_restrictions: ["dairyFree"],
  foods_to_avoid: ["mushrooms"],
});
const SEEDS = 60;
const picksFor = (goal: ProfileNutritionGoalKey | null) =>
  Array.from({ length: SEEDS }, (_, i) => pickGolden100ForGenerate(request, { varietySeed: `goal-test-${i}`, nutritionGoal: goal })?.slug ?? null);
const baseline = picksFor(null);
const byGoal = Object.fromEntries(GOALS.map((g) => [g, picksFor(g)])) as Record<ProfileNutritionGoalKey, (string | null)[]>;
const factsMean = (slugs: (string | null)[], key: "calories" | "protein_g" | "carbs_g") => {
  const vals = slugs.filter(Boolean).map((slug) => nutritionGoalFactsForSlug(slug!)[key] ?? 0).filter((v) => v > 0);
  return vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
};
/** How well a set of picks fits a goal, measured by that goal's own ranking signal. */
const goalFit = (slugs: (string | null)[], goal: ProfileNutritionGoalKey) => {
  const vals = slugs.filter(Boolean).map((slug) => scoreProfileNutritionGoal(goal, nutritionGoalFactsForSlug(slug!)));
  return vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
};
const baseFilled = baseline.filter(Boolean).length;
check("baseline fills every seed", baseFilled === SEEDS, `${baseFilled}/${SEEDS}`);
for (const g of GOALS) {
  const picks = byGoal[g];
  check(`${g}: no extra empty results`, picks.filter(Boolean).length === baseFilled, `${picks.filter(Boolean).length}/${SEEDS}`);
  check(`${g}: every pick is high-confidence dairy-free`, picks.every((slug) => !slug || dairyFree(slug)));
  check(`${g}: no pick contains a food to avoid`, picks.every((slug) => !slug || !(catalog.get(slug)?.avoidTags ?? []).includes("mushrooms")));
  const changed = picks.filter((slug, i) => slug !== baseline[i]).length;
  check(`${g}: changes what gets picked`, changed >= SEEDS / 4, `${changed}/${SEEDS} seeds differ from no goal`);
  check(`${g}: picks fit the goal better than no goal`, goalFit(picks, g) > goalFit(baseline, g) + 2,
    `goal fit ${goalFit(picks, g).toFixed(1)} vs ${goalFit(baseline, g).toFixed(1)}`);
}
for (const g of GOALS) {
  const others = GOALS.filter((h) => h !== g).map((h) => goalFit(byGoal[h], g));
  const otherMean = others.reduce((a, b) => a + b, 0) / others.length;
  check(`${g}: same Pick Tonight pool fits ${g} best under ${g}`, goalFit(byGoal[g], g) > otherMean + 2,
    `fit ${goalFit(byGoal[g], g).toFixed(1)} vs ${otherMean.toFixed(1)} under the other goals`);
}
const hp35 = (slugs: (string | null)[]) => slugs.filter((slug) => slug && (nutritionGoalFactsForSlug(slug).protein_g ?? 0) >= 35).length;
check("high protein serves more 35 g+ meals", hp35(byGoal.high_protein) > hp35(baseline), `${hp35(byGoal.high_protein)}/${SEEDS} vs ${hp35(baseline)}/${SEEDS}`);
check("lower calorie picks carry fewer calories", factsMean(byGoal.lower_calorie, "calories") < factsMean(baseline, "calories"),
  `${factsMean(byGoal.lower_calorie, "calories").toFixed(0)} vs ${factsMean(baseline, "calories").toFixed(0)} kcal`);
check("lower carb picks carry fewer carbs", factsMean(byGoal.lower_carb, "carbs_g") < factsMean(baseline, "carbs_g"),
  `${factsMean(byGoal.lower_carb, "carbs_g").toFixed(1)} g vs ${factsMean(baseline, "carbs_g").toFixed(1)} g`);

console.log("Narrow pool never empties");
const narrow = buildGenerateRequestInput({ protein: "vegetarian", dietary_restrictions: ["vegetarian", "dairyFree"], allergens_to_avoid: ["dairy"] });
const narrowBase = Array.from({ length: 20 }, (_, i) => pickGolden100ForGenerate(narrow, { varietySeed: `n-${i}` })?.slug ?? null);
for (const g of GOALS) {
  const picks = Array.from({ length: 20 }, (_, i) => pickGolden100ForGenerate(narrow, { varietySeed: `n-${i}`, nutritionGoal: g })?.slug ?? null);
  check(`${g}: vegetarian + dairy-free still filled whenever it was without a goal`,
    picks.filter(Boolean).length === narrowBase.filter(Boolean).length && picks.every((slug) => !slug || catalog.get(slug)?.dietarySummary?.flags.vegetarian === true),
    `${picks.filter(Boolean).length}/20`);
}

console.log("Shift Planner auto-fill");
type Slot = Parameters<ReturnType<typeof createSlotPicker>>[0];
const dinnerSlot = { type: "dinner", plannedLocal: "2026-10-09T18:00", adjusted: false, crewSize: 6 } as unknown as Slot;
const breakfastSlot = { type: "breakfast", plannedLocal: "2026-10-09T07:30", adjusted: false, crewSize: 6 } as unknown as Slot;
const noAvoid = { hard: [] as string[], soft: [] as string[] };
const shiftBase = buildGenerateRequestInput({ allergens_to_avoid: ["dairy"], dietary_restrictions: ["dairyFree"] });
const openBase = buildGenerateRequestInput();
const lunchSlot = { type: "lunch", plannedLocal: "2026-10-09T12:00", adjusted: false, crewSize: 6 } as unknown as Slot;
const dinners = async (base: typeof shiftBase, goal: ProfileNutritionGoalKey | null) => {
  const picker = createSlotPicker({ base, recentSlugs: [], nutritionGoal: goal, sessionKey: "goal-test" });
  const out: (string | null)[] = [];
  for (let i = 0; i < 30; i++) {
    out.push(await picker(dinnerSlot, noAvoid, `shift-${i}`));
    out.push(await picker(lunchSlot, noAvoid, `shift-${i}`));
  }
  return out;
};
const safeBaseline = await dinners(shiftBase, null);
const openByGoal = {} as Record<ProfileNutritionGoalKey, (string | null)[]>;
for (const g of GOALS) {
  const safe = await dinners(shiftBase, g);
  check(`${g}: dairy-free lunch + dinner slots stay filled and dairy-free`,
    safe.filter(Boolean).length === safeBaseline.filter(Boolean).length && safe.every((slug) => !slug || dairyFree(slug)),
    `${safe.filter(Boolean).length}/60`);
  openByGoal[g] = await dinners(openBase, g);
}
for (const g of GOALS) {
  const others = GOALS.filter((h) => h !== g).map((h) => goalFit(openByGoal[h], g));
  const otherMean = others.reduce((a, b) => a + b, 0) / others.length;
  check(`${g}: same lunch + dinner slot pools fit ${g} best under ${g}`, goalFit(openByGoal[g], g) > otherMean,
    `fit ${goalFit(openByGoal[g], g).toFixed(1)} vs ${otherMean.toFixed(1)} under the other goals`);
}

const breakfasts = loadBreakfastCandidates();
const bfPicks = (base: typeof shiftBase, goal: ProfileNutritionGoalKey | null) =>
  Array.from({ length: 60 }, (_, i) =>
    pickBreakfast(breakfasts, buildSlotGenerateRequest(base, breakfastSlot), {
      avoid: noAvoid,
      seed: `bf-${i}`,
      ...(goal ? { preferenceScore: (slug: string) => scoreProfileNutritionGoal(goal, nutritionGoalFactsForSlug(slug)) } : {}),
    }));
const bfBase = bfPicks(openBase, null);
const bfHp = bfPicks(openBase, "high_protein");
const hpShare = (picks: (string | null)[]) => picks.filter((slug) => slug && catalog.get(slug)?.isHighProtein).length;
check("breakfast: high protein goal favours high-protein breakfasts", hpShare(bfHp) > hpShare(bfBase), `${hpShare(bfHp)}/60 vs ${hpShare(bfBase)}/60`);
const bfSafeBase = bfPicks(shiftBase, null);
const bfSafe = bfPicks(shiftBase, "high_protein");
check("breakfast: goal keeps every pick dairy-free and filled",
  bfSafe.filter(Boolean).length === bfSafeBase.filter(Boolean).length && bfSafe.every((slug) => !slug || dairyFree(slug)));
const live = createSlotPicker({ base: shiftBase, recentSlugs: [], nutritionGoal: "high_protein", sessionKey: "goal-test" });
check("breakfast slot through the real slot picker", dairyFree((await live(breakfastSlot, noAvoid, "bf-live")) ?? ""));

flushSqliteToDisk();
releaseSqliteTimersForTests();
if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll Nutrition Goal checks passed.");
process.exit(0);
