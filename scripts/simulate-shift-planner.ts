#!/usr/bin/env tsx
/**
 * Shift Planner repetition simulation — drives the real slot picker + fill
 * service across 60 days of back-to-back shifts for several shift lengths,
 * restrictions and nutrition goals, feeding each shift's picks forward as
 * cooking history (last 10, like the live route). Curated pipeline only; no
 * AI, no network, in-memory plan storage.
 *
 *   npx tsx scripts/simulate-shift-planner.ts [label]
 * Writes review/shift-planner-simulation[-label].{json,md}.
 */
import fs from "node:fs";
import path from "node:path";

const quietLog = console.log.bind(console);
console.log = (...args: unknown[]) => {
  if (typeof args[0] === "string" && /^\d{1,2}:\d{2}:\d{2} (AM|PM) \[/.test(args[0])) return;
  quietLog(...args);
};

const { initCacheStore } = await import("../server/cache-store.js");
const { initCuratedRecipeStore } = await import("../server/curated-recipe-store.js");
const { getApprovedCatalog } = await import("../server/approved-catalog-cache.js");
const { createSlotPicker } = await import("../server/shift-plan/picker.js");
const { createMemoryShiftPlanRepo } = await import("../server/shift-plan/store.js");
const { fillShiftPlan, getShiftPlan } = await import("../server/shift-plan/service.js");
const { buildGenerateRequestInput } = await import("../shared/generate-request-defaults.js");
const { slotSelectionProfile } = await import("../shared/shift-plan/plan.js");
const { classifyMealOccasions } = await import("../shared/catalog/meal-occasions.js");
const { recipeFitsTimeBucket } = await import("../shared/generation/time-buckets.js");
type ShiftPlanDeps = import("../server/shift-plan/service.js").ShiftPlanDeps;
type PersonalSchedule = import("../shared/schedule/types.js").PersonalSchedule;
type GenerateRequest = import("../shared/schema.js").GenerateRequest;
type ProfileNutritionGoalKey = import("../shared/nutrition/profile-goals.js").ProfileNutritionGoalKey;
type MealOccasion = import("../shared/catalog/meal-occasions.js").MealOccasion;

const LABEL = process.argv[2] ? `-${process.argv[2]}` : "";
const DAYS = 60;
const HISTORY = 10;
const TZ = "America/Toronto";
const ANCHOR = "2026-10-08";
const USER = "sim-user";

await initCacheStore();
await initCuratedRecipeStore();
const catalog = new Map(getApprovedCatalog().recipes.map((r) => [r.slug, r]));

interface ShiftPattern {
  id: string;
  label: string;
  onHours: number;
  offHours: number;
  startTime: string;
}
const SHIFTS: ShiftPattern[] = [
  { id: "12h-day", label: "12h day (07:00)", onHours: 12, offHours: 36, startTime: "07:00" },
  { id: "12h-night", label: "12h night (19:00)", onHours: 12, offHours: 36, startTime: "19:00" },
  { id: "24h", label: "24h", onHours: 24, offHours: 48, startTime: "07:00" },
  { id: "48h", label: "48h", onHours: 48, offHours: 96, startTime: "07:00" },
  { id: "72h", label: "72h", onHours: 72, offHours: 96, startTime: "07:00" },
];

interface Variant {
  id: string;
  label: string;
  base: Partial<GenerateRequest>;
  goal?: ProfileNutritionGoalKey;
  history: boolean;
}
const VARIANTS: Variant[] = [
  { id: "default", label: "Default (with cooking history)", base: {}, history: true },
  { id: "no-history", label: "Default, no history (free user)", base: {}, history: false },
  { id: "vegetarian", label: "Vegetarian", base: { dietary_restrictions: ["vegetarian"] }, history: true },
  { id: "pork-free", label: "Pork-free", base: { dietary_restrictions: ["porkFree"] }, history: true },
  { id: "no-seafood", label: "No fish / shellfish", base: { dietary_restrictions: ["fishFree", "shellfishFree"] }, history: true },
  { id: "goal-high-protein", label: "Goal: High Protein", base: {}, goal: "high_protein", history: true },
  { id: "goal-lower-calorie", label: "Goal: Lower Calorie", base: {}, goal: "lower_calorie", history: true },
  { id: "goal-lower-carb", label: "Goal: Lower Carb", base: {}, goal: "lower_carb", history: true },
  { id: "goal-balanced", label: "Goal: Balanced", base: {}, goal: "balanced", history: true },
];

function schedule(p: ShiftPattern): PersonalSchedule {
  return {
    timezone: TZ,
    anchorDate: ANCHOR,
    startTime: p.startTime,
    blocks: [
      { kind: "on", minutes: p.onHours * 60 },
      { kind: "off", minutes: p.offHours * 60 },
    ],
    defaultCrewSize: 6,
  };
}

function proteinGroup(protein: string): string {
  if (["Pork", "Sausage", "Bacon"].includes(protein)) return "Pork";
  if (["Salmon", "Fish", "Shrimp"].includes(protein)) return "Seafood";
  return protein;
}

interface Pick {
  shiftIndex: number;
  day: number;
  slotType: MealOccasion;
  adjusted: boolean;
  budget: string;
  slug: string | null;
}

async function runScenario(pattern: ShiftPattern, variant: Variant) {
  const sched = schedule(pattern);
  const repo = createMemoryShiftPlanRepo();
  let now = new Date(`${ANCHOR}T03:30:00Z`);
  const end = new Date(now.getTime() + DAYS * 86_400_000);
  const history: string[] = [];
  const picks: Pick[] = [];
  let shiftIndex = 0;
  let withinShiftRepeats = 0;

  while (now < end) {
    const at = now;
    const deps: ShiftPlanDeps = {
      repo,
      loadSchedule: async () => ({ schedule: sched, overrides: [], mealPreferences: {} }),
      resolveRecipe: (slug) => {
        const r = catalog.get(slug);
        return r ? { slug, title: r.title, imageUrl: null, totalMinutes: r.cookTime, path: `/recipes/${slug}` } : null;
      },
      isSelectableSlug: (slug) => catalog.has(slug),
      canPlanAhead: async () => false,
      canRunItBack: async () => false,
      now: () => at,
    };
    const view = await getShiftPlan(deps, USER);
    if (!view.shift || new Date(view.shift.start) >= end) break;
    const base = buildGenerateRequestInput(variant.base) as GenerateRequest;
    const picker = createSlotPicker({
      base,
      recentSlugs: variant.history ? history.slice(-HISTORY) : [],
      nutritionGoal: variant.goal ?? null,
      sessionKey: `sim:${pattern.id}:${variant.id}`,
    });
    const res = await fillShiftPlan(deps, USER, { shiftKey: view.shift.key, mode: "fill" }, picker);
    const shiftStart = new Date(view.shift.start).getTime();
    const slugsThisShift: string[] = [];
    for (const slot of res.plan.slots) {
      const profile = slotSelectionProfile(slot);
      const slug = slot.recipe?.slug ?? null;
      picks.push({
        shiftIndex,
        day: Math.floor((shiftStart - new Date(`${ANCHOR}T00:00:00Z`).getTime()) / 86_400_000) + slot.dayIndex - 1,
        slotType: profile.mealType,
        adjusted: Boolean(slot.adjusted),
        budget: profile.time_available,
        slug,
      });
      if (slug) slugsThisShift.push(slug);
    }
    withinShiftRepeats += slugsThisShift.length - new Set(slugsThisShift).size;
    if (variant.history) history.push(...slugsThisShift);
    shiftIndex++;
    now = new Date(new Date(view.shift.end).getTime() + 60_000);
  }

  const bySlot: Record<string, unknown> = {};
  const slotTypes = [...new Set(picks.map((p) => p.slotType))];
  for (const type of slotTypes) {
    const list = picks.filter((p) => p.slotType === type);
    const filled = list.filter((p) => p.slug);
    const counts = new Map<string, number>();
    for (const p of filled) counts.set(p.slug!, (counts.get(p.slug!) ?? 0) + 1);
    const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3);
    let repeat7 = 0;
    for (const p of filled) {
      if (picks.some((q) => q !== p && q.slug === p.slug && q.day < p.day && p.day - q.day <= 7)) repeat7++;
    }
    const wrongOccasion = filled.filter((p) => !classifyMealOccasions(catalog.get(p.slug!)!).occasions.includes(type)).length;
    const overBudget = filled.filter((p) => !recipeFitsTimeBucket(catalog.get(p.slug!)!.cookTime, p.budget)).length;
    bySlot[type] = {
      slots: list.length,
      filled: filled.length,
      distinct: counts.size,
      repeatWithin7Days: repeat7,
      wrongOccasion,
      overTimeBudget: overBudget,
      top: top.map(([slug, n]) => `${slug}×${n}`),
      wrongExamples: [
        ...new Set(
          filled
            .filter((p) => !classifyMealOccasions(catalog.get(p.slug!)!).occasions.includes(type))
            .map((p) => p.slug!),
        ),
      ].slice(0, 4),
    };
  }
  const filled = picks.filter((p) => p.slug);
  const proteinMix: Record<string, number> = {};
  for (const p of filled) {
    const g = proteinGroup(catalog.get(p.slug!)!.protein);
    proteinMix[g] = (proteinMix[g] ?? 0) + 1;
  }
  const overall = new Map<string, number>();
  for (const p of filled) overall.set(p.slug!, (overall.get(p.slug!) ?? 0) + 1);
  return {
    shift: pattern.id,
    variant: variant.id,
    shifts: shiftIndex,
    slots: picks.length,
    filled: filled.length,
    empty: picks.length - filled.length,
    withinShiftRepeats,
    distinct: overall.size,
    maxSameRecipe: Math.max(0, ...overall.values()),
    bySlot,
    proteinMix,
  };
}

const results = [];
const started = Date.now();
for (const variant of VARIANTS) {
  for (const pattern of SHIFTS) {
    const r = await runScenario(pattern, variant);
    results.push(r);
    quietLog(
      `${variant.id.padEnd(20)} ${pattern.id.padEnd(9)} shifts=${r.shifts} slots=${r.slots} empty=${r.empty} dupInShift=${r.withinShiftRepeats} distinct=${r.distinct} max=${r.maxSameRecipe}`,
    );
  }
}

const outDir = path.join(process.cwd(), "review");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, `shift-planner-simulation${LABEL}.json`),
  JSON.stringify({ generatedAt: new Date().toISOString(), days: DAYS, historyWindow: HISTORY, results }, null, 2),
);

const md: string[] = [`# Shift Planner simulation${LABEL ? ` (${LABEL.slice(1)})` : ""}`, "", `${DAYS} days of back-to-back shifts per scenario; history window ${HISTORY}.`, ""];
md.push("| Variant | Shift | Shifts | Slots | Empty | Dup in shift | Distinct | Max same | Slot: filled / distinct / 7-day repeats / wrong occasion / over time |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const r of results) {
  const slots = Object.entries(r.bySlot as Record<string, { filled: number; distinct: number; repeatWithin7Days: number; wrongOccasion: number; overTimeBudget: number }>)
    .map(([k, v]) => `${k}: ${v.filled}/${v.distinct}/${v.repeatWithin7Days}/${v.wrongOccasion}/${v.overTimeBudget}`)
    .join("<br>");
  md.push(`| ${r.variant} | ${r.shift} | ${r.shifts} | ${r.slots} | ${r.empty} | ${r.withinShiftRepeats} | ${r.distinct} | ${r.maxSameRecipe} | ${slots} |`);
}
fs.writeFileSync(path.join(outDir, `shift-planner-simulation${LABEL}.md`), md.join("\n"));
quietLog(`done in ${Math.round((Date.now() - started) / 1000)}s`);
process.exit(0);
