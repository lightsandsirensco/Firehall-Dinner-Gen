#!/usr/bin/env tsx
/**
 * Shift Planner catalog readiness audit — occasions, time, protein, batch
 * suitability, nutrition-goal coverage, metadata problems, and the slot pools
 * the planner actually draws from (occasion ∩ slot time budget ∩ restriction).
 *
 * Writes review/shift-planner-catalog-audit.{json,md}. No network, no DB writes.
 *   npx tsx scripts/audit-shift-planner-catalog.ts
 */
import fs from "node:fs";
import path from "node:path";
import { getApprovedCatalog } from "../server/approved-catalog-cache.js";
import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";
import { classifyMealOccasions, type MealOccasion } from "../shared/catalog/meal-occasions.js";
import { recipeFitsTimeBucket } from "../shared/generation/time-buckets.js";
import { slotSelectionProfile } from "../shared/shift-plan/plan.js";
import {
  PROFILE_NUTRITION_GOALS,
  scoreProfileNutritionGoal,
  type ProfileNutritionGoalKey,
} from "../shared/nutrition/profile-goals.js";
import { tonightIneligibleReason } from "../server/generation/tonight-eligibility.js";

const OUT_DIR = path.join(process.cwd(), "review");
const SLOTS: MealOccasion[] = ["breakfast", "lunch", "dinner", "late_night"];
/** A pool smaller than this can't cover a month of shifts without visible repeats. */
const THIN_POOL = 15;
/** Goal "strong fit": ≥ 10 of the goal's 30-point ranking bonus. */
const STRONG_GOAL_FIT = 10;

type ProteinGroup = "Beef" | "Chicken" | "Turkey" | "Pork" | "Seafood" | "Vegetarian" | "Eggs" | "Lamb" | "Mixed" | "Other";
type TimeBucket = "under_30" | "30_59" | "60_89" | "90_plus";
const TIME_BUCKETS: TimeBucket[] = ["under_30", "30_59", "60_89", "90_plus"];
const TIME_BUCKET_LABEL: Record<TimeBucket, string> = {
  under_30: "Under 30 min",
  "30_59": "30–60 min",
  "60_89": "60–90 min",
  "90_plus": "90+ min",
};

function proteinGroup(r: ApprovedCatalogEntry): ProteinGroup {
  switch (r.protein) {
    case "Beef":
      return "Beef";
    case "Chicken":
      return "Chicken";
    case "Turkey":
      return "Turkey";
    case "Pork":
    case "Sausage":
    case "Bacon":
      return "Pork";
    case "Salmon":
    case "Fish":
    case "Shrimp":
      return "Seafood";
    case "Vegetarian":
      return "Vegetarian";
    case "Eggs":
      return "Eggs";
    case "Lamb":
      return "Lamb";
    case "Mixed Protein":
      return "Mixed";
    default:
      return "Other";
  }
}

function timeBucket(minutes: number): TimeBucket {
  if (minutes < 30) return "under_30";
  if (minutes < 60) return "30_59";
  if (minutes < 90) return "60_89";
  return "90_plus";
}

const BATCH_CATEGORIES = new Set(["big_crew_feeders", "meal_prep_leftovers"]);
const BATCH_FORMATS = new Set(["bar_line", "slow_cooker", "smoker", "casserole", "soup_chili", "stew", "braise", "one_pot"]);
const BATCH_TITLE = /\b(batch|feed|crowd|bar night|for the crew|for the hall|tray|meal[- ]prep|leftover)\b/i;

function batchSupport(r: ApprovedCatalogEntry): "explicit" | "format" | null {
  if (BATCH_CATEGORIES.has(r.category) || /\b(batch|feed|bar night|meal[- ]prep)\b/i.test(r.title)) return "explicit";
  if (BATCH_FORMATS.has(r.mealFormat) || BATCH_TITLE.test(r.title)) return "format";
  return null;
}

function goalFacts(r: ApprovedCatalogEntry) {
  return {
    calories: r.macros?.calories,
    protein_g: r.macros?.protein,
    carbs_g: r.macros?.carbs,
    fat_g: r.macros?.fat,
    highProteinFlag: r.isHighProtein,
    lowCarbFlag: r.isLowCarb,
    lighterFlag: r.isHealthy,
  };
}

function inc<K extends string>(map: Record<K, number>, key: K, by = 1) {
  map[key] = (map[key] ?? 0) + by;
}

function main() {
  const catalog = getApprovedCatalog();
  const rows = catalog.recipes.map((r) => ({
    r,
    occ: classifyMealOccasions(r),
    protein: proteinGroup(r),
    time: timeBucket(r.cookTime),
    batch: batchSupport(r),
    held: tonightIneligibleReason(r.slug),
  }));

  // ── Occasion counts ────────────────────────────────────────────────
  const primary: Record<string, number> = {};
  const eligible: Record<MealOccasion, number> = { breakfast: 0, lunch: 0, dinner: 0, late_night: 0 };
  const combos: Record<string, number> = {};
  const roles: Record<string, number> = {};
  for (const x of rows) {
    inc(primary, x.occ.primary);
    inc(roles, x.occ.role);
    for (const o of x.occ.occasions) eligible[o]++;
    if (x.occ.occasions.length > 1) inc(combos, x.occ.occasions.join("+"));
  }

  // ── Time / protein / batch ──────────────────────────────────────────
  const meals = rows.filter((x) => x.occ.role === "meal");
  const timeAll: Record<TimeBucket, number> = { under_30: 0, "30_59": 0, "60_89": 0, "90_plus": 0 };
  const proteinAll: Record<string, number> = {};
  const batch = { explicit: 0, format: 0 };
  for (const x of meals) {
    inc(timeAll, x.time);
    inc(proteinAll, x.protein);
    if (x.batch) batch[x.batch]++;
  }

  const byOccasion = Object.fromEntries(
    SLOTS.map((slot) => {
      const pool = meals.filter((x) => x.occ.occasions.includes(slot));
      const time: Record<TimeBucket, number> = { under_30: 0, "30_59": 0, "60_89": 0, "90_plus": 0 };
      const protein: Record<string, number> = {};
      let batchCount = 0;
      for (const x of pool) {
        inc(time, x.time);
        inc(protein, x.protein);
        if (x.batch) batchCount++;
      }
      return [slot, { total: pool.length, time, protein, batchFriendly: batchCount }];
    }),
  ) as Record<MealOccasion, { total: number; time: Record<TimeBucket, number>; protein: Record<string, number>; batchFriendly: number }>;

  // ── Planner slot pools: occasion ∩ slot time budget ∩ restriction ──
  const restrictions: Record<string, (r: ApprovedCatalogEntry) => boolean> = {
    none: () => true,
    vegetarian: (r) => r.dietarySummary?.confidence === "high" && Boolean(r.dietarySummary.flags.vegetarian),
    porkFree: (r) => r.dietarySummary?.confidence === "high" && Boolean(r.dietarySummary.flags.porkFree),
    noSeafood: (r) =>
      r.dietarySummary?.confidence === "high" &&
      Boolean(r.dietarySummary.flags.fishFree && r.dietarySummary.flags.shellfishFree),
    glutenFree: (r) => r.dietarySummary?.confidence === "high" && Boolean(r.dietarySummary.flags.glutenFree),
    dairyFree: (r) => r.dietarySummary?.confidence === "high" && Boolean(r.dietarySummary.flags.dairyFree),
  };
  const slotBudgets = SLOTS.flatMap((slot) =>
    [false, true].map((adjusted) => {
      const type = slot;
      const profile = slotSelectionProfile({ type, plannedLocal: "2026-10-08T12:00", adjusted });
      return { slot, adjusted, budget: profile.time_available };
    }),
  );
  const slotPools = slotBudgets.map(({ slot, adjusted, budget }) => {
    const occasionPool = meals.filter((x) => x.occ.occasions.includes(slot) && !x.held);
    const inTime = occasionPool.filter((x) => recipeFitsTimeBucket(x.r.cookTime, budget));
    const perRestriction = Object.fromEntries(
      Object.entries(restrictions).map(([k, fn]) => [k, inTime.filter((x) => fn(x.r)).length]),
    );
    const perProtein: Record<string, number> = {};
    for (const x of inTime) inc(perProtein, x.protein);
    return { slot, adjusted, budget, occasionPool: occasionPool.length, inTime: inTime.length, perRestriction, perProtein };
  });

  const neverFitsDinner = meals.filter(
    (x) => x.occ.occasions.includes("dinner") && !recipeFitsTimeBucket(x.r.cookTime, "45-60"),
  );

  // ── Nutrition-goal coverage ─────────────────────────────────────────
  const nutrition = Object.fromEntries(
    SLOTS.map((slot) => {
      const pool = meals.filter((x) => x.occ.occasions.includes(slot));
      const withMacros = pool.filter((x) => (x.r.macros?.calories ?? 0) > 0);
      const flagOnly = pool.filter(
        (x) => !((x.r.macros?.calories ?? 0) > 0) && (x.r.isHighProtein || x.r.isLowCarb || x.r.isHealthy),
      );
      const goals = Object.fromEntries(
        PROFILE_NUTRITION_GOALS.map((g: ProfileNutritionGoalKey) => [
          g,
          withMacros.filter((x) => scoreProfileNutritionGoal(g, goalFacts(x.r)) >= STRONG_GOAL_FIT).length,
        ]),
      );
      return [
        slot,
        {
          total: pool.length,
          withMacros: withMacros.length,
          flagOnly: flagOnly.length,
          noNutrition: pool.length - withMacros.length - flagOnly.length,
          strongFitWithMacros: goals,
        },
      ];
    }),
  );

  // ── Metadata problems ───────────────────────────────────────────────
  const issues: Array<{ slug: string; title: string; kind: string; issue: string }> = [];
  const add = (r: ApprovedCatalogEntry, issue: string) => issues.push({ slug: r.slug, title: r.title, kind: r.kind, issue });
  const MEAT_TITLE = /\b(chicken|beef|steak|pork|sausage|bacon|turkey|lamb|shrimp|salmon|cod|fish|tilapia|trout|prosciutto|pepperoni|chorizo|ham|mortadella|anchov)/i;
  const BREAKFAST_DEFAULT_EGGS = /\b(oat|oatmeal|pancake|waffle|french toast|johnnycake|bagel)/i;
  for (const x of rows) {
    const r = x.r;
    if (!r.cookTime || r.cookTime <= 0) add(r, "missing cook time");
    const veg = r.dietarySummary?.flags.vegetarian;
    if (r.protein === "Vegetarian" && r.dietarySummary?.confidence === "high" && veg === false) {
      add(r, "protein label 'Vegetarian' but dietary analysis says not vegetarian");
    }
    if (r.protein === "Vegetarian" && MEAT_TITLE.test(r.title)) add(r, "protein label 'Vegetarian' but title names a meat");
    if (
      !r.isSmoothie &&
      r.protein !== "Vegetarian" &&
      r.protein !== "Eggs" &&
      veg === true &&
      r.dietarySummary?.confidence === "high"
    ) {
      add(r, `protein label '${r.protein}' but dietary analysis says vegetarian`);
    }
    if (
      r.mealFormat === "breakfast" &&
      r.protein === "Eggs" &&
      BREAKFAST_DEFAULT_EGGS.test(r.title) &&
      r.dietarySummary?.flags.eggFree === true
    ) {
      add(r, "breakfast protein 'Eggs' on an egg-free dish (protein-tag fallback)");
    }
    if (x.occ.source === "override" && x.occ.role !== "meal") {
      add(r, `${x.occ.role}, not a meal — previously eligible for meal slots`);
    }
    if (x.occ.source === "override" && x.occ.occasions.includes("breakfast") && r.mealFormat !== "breakfast") {
      add(r, "breakfast dish filed outside the breakfast catalog (meal format " + r.mealFormat + ")");
    }
  }
  const TEMPLATE_FORMATS = new Set(["river_fish", "bayou_fillet", "tropical_fillet", "foil_fish", "hoagie_press", "crew_kebab", "smokehouse_board"]);
  for (const x of rows) {
    if (TEMPLATE_FORMATS.has(x.r.mealFormat) || (x.r.kind === "bbq_catalog" && x.occ.source === "override")) {
      add(x.r, `meal format '${x.r.mealFormat}' is a BBQ authoring template, not the dish`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      approved: catalog.recipeCount,
      meals: meals.length,
      roles,
      heldFromTonight: rows.filter((x) => x.held).length,
    },
    occasions: { primary, eligible, multiPurposeCombos: combos },
    time: timeAll,
    protein: proteinAll,
    batchFriendly: batch,
    byOccasion,
    slotPools,
    dinnerNeverFitsSlotBudget: neverFitsDinner.length,
    nutrition,
    issues,
    thinPoolThreshold: THIN_POOL,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "shift-planner-catalog-audit.json"), JSON.stringify(report, null, 2));

  const md: string[] = [];
  const table = (head: string[], body: Array<Array<string | number>>) => {
    md.push(`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`);
    for (const row of body) md.push(`| ${row.join(" | ")} |`);
    md.push("");
  };
  md.push("# Shift Planner catalog readiness audit", "", `Approved recipes: **${catalog.recipeCount}** · meals: **${meals.length}**`, "");
  md.push("## Primary occasion", "");
  table(["Occasion", "Recipes"], Object.entries(primary).sort((a, b) => b[1] - a[1]));
  md.push("## Eligible per slot (a recipe can count for several)", "");
  table(["Slot", "Recipes"], SLOTS.map((s) => [s, eligible[s]]));
  md.push("## Time (meals)", "");
  table(["Bucket", "All meals", ...SLOTS], TIME_BUCKETS.map((t) => [TIME_BUCKET_LABEL[t], timeAll[t], ...SLOTS.map((s) => byOccasion[s].time[t])]));
  md.push("## Protein (meals)", "");
  const proteins = Object.keys(proteinAll).sort((a, b) => proteinAll[b]! - proteinAll[a]!);
  table(["Protein", "All meals", ...SLOTS], proteins.map((p) => [p, proteinAll[p]!, ...SLOTS.map((s) => byOccasion[s].protein[p] ?? 0)]));
  md.push(`Batch-friendly: **${batch.explicit}** explicit (big-crew / meal-prep category or batch title) + **${batch.format}** by format.`, "");
  md.push("## Planner slot pools (occasion ∩ slot time budget)", "");
  table(
    ["Slot", "Budget", "Occasion pool", "In budget", ...Object.keys(restrictions)],
    slotPools.map((p) => [
      `${p.slot}${p.adjusted ? " (late crew)" : ""}`,
      p.budget,
      p.occasionPool,
      p.inTime,
      ...Object.values(p.perRestriction).map((n) => (n < THIN_POOL ? `**${n}**` : n)),
    ]),
  );
  md.push(`Dinner recipes that never fit a dinner slot's time budget (45–60, +10 grace): **${neverFitsDinner.length}**.`, "");
  md.push("## Nutrition-goal coverage", "");
  table(
    ["Slot", "Pool", "With macros", "Flags only", "None", ...PROFILE_NUTRITION_GOALS.map((g) => `${g} strong fit`)],
    SLOTS.map((s) => {
      const n = nutrition[s] as { total: number; withMacros: number; flagOnly: number; noNutrition: number; strongFitWithMacros: Record<string, number> };
      return [s, n.total, n.withMacros, n.flagOnly, n.noNutrition, ...PROFILE_NUTRITION_GOALS.map((g) => n.strongFitWithMacros[g] ?? 0)];
    }),
  );
  md.push(`## Metadata issues (${issues.length})`, "");
  table(["Recipe", "Kind", "Issue"], issues.map((i) => [`${i.title} (\`${i.slug}\`)`, i.kind, i.issue]));
  fs.writeFileSync(path.join(OUT_DIR, "shift-planner-catalog-audit.md"), md.join("\n"));

  console.log(JSON.stringify({ totals: report.totals, primary, eligible, time: timeAll, protein: proteinAll, batch, slotPools, neverFitsDinner: neverFitsDinner.length, nutrition, issueCount: issues.length }, null, 1));
}

main();
