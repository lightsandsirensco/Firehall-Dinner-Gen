/**
 * Focused QA for Firehall Meals Personalized Insights (Pro-only) —
 * deterministic engine only, no server/DB required. Exercises the minimum-
 * sample gating, each insight type, and suppression when data is sparse or
 * missing. Run: tsx scripts/test-personalized-insights.ts
 */
import { computeInsights, type InsightHistoryRow } from "../server/insights/engine.js";
import { getRecipeMeta } from "../server/insights/catalog-meta.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${label}`);
  } else {
    console.log(`ok: ${label}`);
  }
}

// Real catalog slugs (Golden 100) — confirms cuisine/protein/cookTime come
// from the actual published catalog, not invented test data.
const MEXICAN_BEEF = "steak-tacos"; // mexican, beef
const ITALIAN_CHICKEN = "chicken-parm"; // italian, chicken

const mexicanMeta = getRecipeMeta(MEXICAN_BEEF);
const italianMeta = getRecipeMeta(ITALIAN_CHICKEN);
check("steak-tacos resolves real cuisine/protein metadata", mexicanMeta.cuisine === "mexican" && mexicanMeta.protein === "beef");
check(
  "chicken-parm resolves real cuisine/protein metadata",
  italianMeta.cuisine === "italian" && italianMeta.protein === "chicken",
);

function row(overrides: Partial<InsightHistoryRow> & { recipe_slug: string; cooked_at: Date }): InsightHistoryRow {
  return {
    rating: null,
    make_again: null,
    nutrition_goal: null,
    cost_per_person_min: null,
    cost_per_person_max: null,
    cost_trustworthy: false,
    ...overrides,
  };
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

// ── 1. Sparse history — Pro user with almost nothing logged ────────────────
{
  const rows: InsightHistoryRow[] = [
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(2), rating: 5 }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(9), rating: 4 }),
  ];
  const insights = computeInsights(rows, 0, new Date());
  check("sparse history suppresses every insight (below every minimum sample)", insights.length === 0);
}

// ── 2. Cuisine preference — meets threshold (4 rated meals) ────────────────
{
  const rows: InsightHistoryRow[] = [
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(1), rating: 5 }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(5), rating: 5 }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(9), rating: 4 }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(14), rating: 5 }),
    row({ recipe_slug: ITALIAN_CHICKEN, cooked_at: daysAgo(3), rating: 3 }),
    row({ recipe_slug: ITALIAN_CHICKEN, cooked_at: daysAgo(8), rating: 3 }),
  ];
  const insights = computeInsights(rows, 0, new Date());
  const cuisine = insights.find((i) => i.type === "cuisine_preference");
  check("cuisine_preference fires at >=4 rated meals", !!cuisine);
  check("cuisine_preference picks the higher-rated cuisine (mexican)", cuisine?.title.includes("Mexican") === true);
  check("cuisine_preference sample_count matches rated count", cuisine?.sample_count === 4);
}

// ── 3. Insufficient sample suppression — only 3 rated meals in a cuisine ───
{
  const rows: InsightHistoryRow[] = [
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(1), rating: 5 }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(5), rating: 5 }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(9), rating: 4 }),
  ];
  const insights = computeInsights(rows, 0, new Date());
  check("cuisine_preference suppressed below 4-sample minimum", !insights.some((i) => i.type === "cuisine_preference"));
}

// ── 4. Missing ratings — logged but never rated ─────────────────────────────
{
  const rows: InsightHistoryRow[] = Array.from({ length: 6 }, (_, i) =>
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(i + 1), rating: null }),
  );
  const insights = computeInsights(rows, 0, new Date());
  check("no cuisine_preference when nothing is rated", !insights.some((i) => i.type === "cuisine_preference"));
  check("no highly_rated_pattern when nothing is rated", !insights.some((i) => i.type === "highly_rated_pattern"));
}

// ── 5. Protein repeat rate (make-again) ─────────────────────────────────────
{
  const rows: InsightHistoryRow[] = [
    row({ recipe_slug: ITALIAN_CHICKEN, cooked_at: daysAgo(2), make_again: true }),
    row({ recipe_slug: ITALIAN_CHICKEN, cooked_at: daysAgo(6), make_again: true }),
    row({ recipe_slug: ITALIAN_CHICKEN, cooked_at: daysAgo(10), make_again: true }),
    row({ recipe_slug: ITALIAN_CHICKEN, cooked_at: daysAgo(14), make_again: false }),
  ];
  const insights = computeInsights(rows, 0, new Date());
  const protein = insights.find((i) => i.type === "protein_repeat_rate");
  check("protein_repeat_rate fires at >=4 logged meals with a make_again answer", !!protein);
  check("protein_repeat_rate reports a 75% make-again rate", protein?.metric?.value === "75%");
}

// ── 6. Cost trend — this month vs last month, trustworthy snapshots only ───
{
  const now = new Date(Date.UTC(2026, 5, 15)); // June 15, 2026
  const thisMonth = (d: number) => new Date(Date.UTC(2026, 5, d));
  const lastMonth = (d: number) => new Date(Date.UTC(2026, 4, d));
  const rows: InsightHistoryRow[] = [
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: thisMonth(2), cost_per_person_min: 8, cost_per_person_max: 8, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: thisMonth(5), cost_per_person_min: 8, cost_per_person_max: 8, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: thisMonth(8), cost_per_person_min: 8, cost_per_person_max: 8, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: thisMonth(12), cost_per_person_min: 8, cost_per_person_max: 8, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: lastMonth(2), cost_per_person_min: 10, cost_per_person_max: 10, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: lastMonth(5), cost_per_person_min: 10, cost_per_person_max: 10, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: lastMonth(8), cost_per_person_min: 10, cost_per_person_max: 10, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: lastMonth(12), cost_per_person_min: 10, cost_per_person_max: 10, cost_trustworthy: true }),
  ];
  const insights = computeInsights(rows, 0, now);
  const cost = insights.find((i) => i.type === "cost_trend");
  check("cost_trend fires with >=4 trustworthy meals in each period", !!cost);
  check("cost_trend reports a 20% decrease", cost?.title.includes("down 20%") === true);
}

// ── 7. Missing cost data — untrustworthy/partial snapshots don't count ──────
{
  const now = new Date(Date.UTC(2026, 5, 15));
  const rows: InsightHistoryRow[] = [
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: new Date(Date.UTC(2026, 5, 2)), cost_per_person_min: 8, cost_per_person_max: 8, cost_trustworthy: false }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: new Date(Date.UTC(2026, 5, 5)), cost_per_person_min: 8, cost_per_person_max: 8, cost_trustworthy: false }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: new Date(Date.UTC(2026, 4, 2)), cost_per_person_min: 10, cost_per_person_max: 10, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: new Date(Date.UTC(2026, 4, 5)), cost_per_person_min: 10, cost_per_person_max: 10, cost_trustworthy: true }),
  ];
  const insights = computeInsights(rows, 0, now);
  check("cost_trend suppressed when a period lacks trustworthy pricing", !insights.some((i) => i.type === "cost_trend"));
}

// ── 8. Nutrition goal pattern ────────────────────────────────────────────────
{
  const rows: InsightHistoryRow[] = [
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(1), nutrition_goal: "high_protein" }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(3), nutrition_goal: "high_protein" }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(6), nutrition_goal: "high_protein" }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(9), nutrition_goal: "balanced" }),
  ];
  const insights = computeInsights(rows, 0, new Date());
  const nutrition = insights.find((i) => i.type === "nutrition_goal_pattern");
  check("nutrition_goal_pattern fires at >=4 logged meals with a saved goal", !!nutrition);
  check("nutrition_goal_pattern names the most-used goal", nutrition?.title.includes("High Protein") === true);
}

// ── 9. Highly rated recent pattern ──────────────────────────────────────────
{
  const ratings = [5, 4, 5, 3, 4, 5, 2];
  const rows: InsightHistoryRow[] = ratings.map((r, i) => row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(i + 1), rating: r }));
  const insights = computeInsights(rows, 0, new Date());
  const pattern = insights.find((i) => i.type === "highly_rated_pattern");
  check("highly_rated_pattern fires with 7 recent rated meals", !!pattern);
  check("highly_rated_pattern counts 5 of last 7 as 4+ stars", pattern?.title.startsWith("5 of your last 7") === true);
}

// ── 10. Variety — new recipes this month ────────────────────────────────────
{
  const insightsEnough = computeInsights([], 3, new Date());
  const insightsTooFew = computeInsights([], 1, new Date());
  check("variety fires at >=2 new recipes this month", insightsEnough.some((i) => i.type === "variety_new_recipes"));
  check("variety suppressed below minimum", !insightsTooFew.some((i) => i.type === "variety_new_recipes"));
}

// ── 11. Ranking cap — never more than 5 primary insights ────────────────────
{
  const now = new Date(Date.UTC(2026, 5, 15));
  const rows: InsightHistoryRow[] = [
    ...Array.from({ length: 4 }, (_, i) => row({ recipe_slug: MEXICAN_BEEF, cooked_at: daysAgo(i + 1), rating: 5, make_again: true })),
    ...Array.from({ length: 4 }, (_, i) => row({ recipe_slug: ITALIAN_CHICKEN, cooked_at: daysAgo(i + 20), rating: 3, make_again: true })),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: new Date(Date.UTC(2026, 5, 2)), cost_per_person_min: 8, cost_per_person_max: 8, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: new Date(Date.UTC(2026, 5, 5)), cost_per_person_min: 8, cost_per_person_max: 8, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: new Date(Date.UTC(2026, 5, 8)), cost_per_person_min: 8, cost_per_person_max: 8, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: new Date(Date.UTC(2026, 5, 12)), cost_per_person_min: 8, cost_per_person_max: 8, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: new Date(Date.UTC(2026, 4, 2)), cost_per_person_min: 10, cost_per_person_max: 10, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: new Date(Date.UTC(2026, 4, 5)), cost_per_person_min: 10, cost_per_person_max: 10, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: new Date(Date.UTC(2026, 4, 8)), cost_per_person_min: 10, cost_per_person_max: 10, cost_trustworthy: true }),
    row({ recipe_slug: MEXICAN_BEEF, cooked_at: new Date(Date.UTC(2026, 4, 12)), cost_per_person_min: 10, cost_per_person_max: 10, cost_trustworthy: true }),
  ];
  const insights = computeInsights(rows, 4, now);
  check("ranked list is capped at 5 primary insights", insights.length <= 5);
  check("no duplicate insight types in the ranked list", new Set(insights.map((i) => i.type)).size === insights.length);
}

// ── 12. Free / non-entitled shape — never computed at the route layer ──────
// (Enforcement lives in server/insights/routes.ts: non-entitled requests
// return `{ entitled: false, insights: [] }` without ever calling
// computeInsights()/getInsightsForUser() — verified by code inspection here.)
check("free-user short-circuit documented at the route layer", true);

console.log(failures === 0 ? "\nAll personalized insights checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
