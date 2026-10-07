/**
 * Pick Tonight's Meal — style / time-window matching and firehall practicality scoring.
 * Reads the same catalog index Explore uses (covers every Tonight-eligible dinner).
 */

import type { GenerateRequest } from "@shared/schema";
import {
  TONIGHT_TIME_WINDOW_RANGE,
  type TonightMealStyle,
  type TonightTimeWindow,
} from "../../shared/tonight-filters.js";
import { TIME_BUCKET_GRACE_MINUTES } from "../../shared/generation/time-buckets.js";
import { loadMergedHallCatalogIndex } from "../meal-catalog/load-index.js";
import { readBbqCatalogIndexFromDisk } from "../bbq-catalog/catalog.js";

export interface TonightRecipeMeta {
  title: string;
  category: string;
  mealFormat: string;
  cuisine: string;
  difficulty: string;
  tags: string[];
  heroImage: string;
}

let metaCache: { source: unknown; map: Map<string, TonightRecipeMeta> } | null = null;

export function loadTonightRecipeMeta(): Map<string, TonightRecipeMeta> {
  const index = loadMergedHallCatalogIndex();
  if (metaCache?.source === index) return metaCache.map;
  const map = new Map<string, TonightRecipeMeta>();
  const add = (r: {
    slug: string;
    title?: string;
    category?: string;
    mealFormat?: string;
    cuisine?: string;
    difficulty?: string;
    tags?: string[];
    heroImage?: string;
  }) =>
    map.set(r.slug, {
      title: (r.title ?? "").toLowerCase(),
      category: r.category ?? "",
      mealFormat: r.mealFormat ?? "",
      cuisine: (r.cuisine ?? "").toLowerCase(),
      difficulty: r.difficulty ?? "",
      tags: (r.tags ?? []).map((t) => t.toLowerCase()),
      heroImage: r.heroImage ?? "",
    });
  for (const r of index.recipes) add(r);
  for (const r of readBbqCatalogIndexFromDisk()?.recipes ?? []) add(r);
  metaCache = { source: index, map };
  return map;
}

const COMFORT_FORMATS = new Set(["bake", "baked", "casserole", "soup_chili", "stew", "braise", "roast", "slow_cooker"]);
const HEALTHY_FORMATS = new Set(["bowl", "bowls", "salad"]);
const BBQ_FORMATS = new Set(["grill", "smoker", "bbq", "smokehouse_board", "crew_kebab", "skewer"]);
const ONE_POT_FORMATS = new Set([
  "one_pot", "soup", "soup_chili", "stew", "slow_cooker", "braise", "casserole", "skillet", "sheet_pan",
]);
const GLOBAL_CUISINES = new Set([
  "japanese", "mediterranean", "greek", "asian", "indian", "thai", "moroccan", "argentinian", "cajun", "korean",
]);
const PASTA_TITLE =
  /pasta|spaghetti|lasagn|penne|ziti|rigatoni|fettuccine|linguine|farfalle|orecchiette|bucatini|cavatappi|tagliatelle|pappardelle|macaroni|orzo|alfredo|mac (and|&) cheese|noodle|tortellini|ravioli|carbonara|bolognese/;
/** Noodle soups read as soup night, not pasta night. */
const NOODLE_SOUP_TITLE = /(noodle|orzo) soup|\bpho\b|ramen|bun bo/;

/** Crew-feeder formats that batch for 10+ without per-plate assembly. */
const BIG_CREW_FORMATS = new Set([
  "bar_line", "sheet_pan", "slow_cooker", "one_pot", "bake", "baked", "casserole", "soup_chili", "soup",
  "stew", "pasta", "smokehouse_board", "platter", "braise",
]);
const PER_PLATE_FORMATS = new Set(["plated_main", "plated", "skewer", "crew_kebab"]);

export function matchesMealStyle(meta: TonightRecipeMeta | undefined, style: TonightMealStyle | undefined): boolean {
  if (!style || style === "any") return true;
  if (!meta) return false;
  const { category, mealFormat, tags } = meta;
  switch (style) {
    case "comfort":
      return (
        category === "comfort_food" ||
        category === "firehall_classics" ||
        COMFORT_FORMATS.has(mealFormat) ||
        tags.includes("comfort") ||
        tags.includes("hearty")
      );
    case "healthy":
      return (
        category === "healthy_performance" ||
        (HEALTHY_FORMATS.has(mealFormat) &&
          category !== "game_day_watch_party" &&
          !tags.some((t) => t === "game_day" || t === "comfort" || t === "hearty"))
      );
    case "pasta":
      return (
        mealFormat === "pasta" ||
        tags.includes("pasta") ||
        (PASTA_TITLE.test(meta.title) && !NOODLE_SOUP_TITLE.test(meta.title))
      );
    case "bbq":
      return (
        category === "bbq_grill_nights" ||
        category === "smoker_recipes" ||
        BBQ_FORMATS.has(mealFormat) ||
        tags.includes("smoker")
      );
    case "one_pot":
      return ONE_POT_FORMATS.has(mealFormat) || tags.includes("one_pot");
    case "different":
      return category === "global_flavors" || GLOBAL_CUISINES.has(meta.cuisine);
    default:
      return true;
  }
}

/** Does `totalMinutes` land inside the preferred window? Unknown time only matches "any". */
export function matchesTimeWindow(totalMinutes: number, window: TonightTimeWindow | undefined): boolean {
  if (!window || window === "any") return true;
  if (!totalMinutes || totalMinutes <= 0) return false;
  const { min, max } = TONIGHT_TIME_WINDOW_RANGE[window];
  return totalMinutes >= min && totalMinutes <= max + TIME_BUCKET_GRACE_MINUTES;
}

function isCrewFeeder(meta: TonightRecipeMeta): boolean {
  return (
    meta.category === "crew_feeders" ||
    meta.category === "big_crew_feeders" ||
    meta.tags.includes("category:crew_feeders") ||
    meta.tags.includes("big_crew") ||
    BIG_CREW_FORMATS.has(meta.mealFormat)
  );
}

const EASY_CLEANUP_FORMATS = new Set(["one_pot", "sheet_pan", "slow_cooker", "skillet", "soup", "soup_chili", "stew"]);
const LEFTOVER_FORMATS = new Set(["soup_chili", "stew", "braise", "casserole", "slow_cooker"]);
const HANDS_OFF_FORMATS = new Set(["slow_cooker", "smoker", "braise", "roast", "smokehouse_board"]);

/** Soft score: easy to run on shift, scales to the crew, has an approved hero image. */
export function scoreFirehallPractical(meta: TonightRecipeMeta | undefined, request: GenerateRequest): number {
  if (!meta) return 0;
  let score = 0;
  if (meta.difficulty === "easy") score += 8;
  else if (meta.difficulty === "hard") score -= 8;
  if (meta.heroImage.trim()) score += 10;

  const crew = request.crew_size;
  const crewFeeder = isCrewFeeder(meta);
  if (crew >= 10) {
    if (crewFeeder) score += 15;
    if (PER_PLATE_FORMATS.has(meta.mealFormat)) score -= 12;
  } else if (crew >= 8 && crewFeeder) {
    score += 6;
  }
  return score;
}

const HEAVY_FORMATS = new Set([...COMFORT_FORMATS, "pizza", "burger", "smokehouse_board"]);

/**
 * "Not feeling it" session nudges. Soft only — they reorder the weighted draw, never empty it.
 * Lightness/budget read real catalog data (category, format, tags, curated metadata) only.
 */
export function scoreSessionFeedback(
  meta: TonightRecipeMeta | undefined,
  cookMinutes: number,
  request: GenerateRequest,
  curated?: { mealStyle?: string; nutritionCategory?: string } | null,
): number {
  const fb = request.session_feedback;
  if (!fb) return 0;
  let score = 0;
  if (fb.prefer_quick) {
    if (cookMinutes > 0 && cookMinutes <= 35) score += 30;
    else if (cookMinutes > 0 && cookMinutes <= 50) score += 12;
    else if (cookMinutes > 90) score -= 35;
    else score -= 10;
    if (meta?.difficulty === "easy") score += 10;
    else if (meta?.difficulty === "hard") score -= 20;
  }
  if (fb.prefer_light) {
    const light =
      curated?.nutritionCategory === "lighter" ||
      meta?.category === "healthy_performance" ||
      HEALTHY_FORMATS.has(meta?.mealFormat ?? "");
    const heavy =
      curated?.nutritionCategory === "indulgent" ||
      curated?.nutritionCategory === "comfort" ||
      HEAVY_FORMATS.has(meta?.mealFormat ?? "") ||
      !!meta?.tags.some((t) => t === "comfort" || t === "hearty");
    if (light) score += 30;
    else if (heavy) score -= 30;
  }
  if (fb.prefer_budget && (curated?.mealStyle === "budget" || meta?.tags.includes("budget"))) {
    score += 35;
  }
  return score;
}

export const TONIGHT_BADGES = [
  "Hall Favourite",
  "Under 45 Min",
  "Big Crew",
  "Budget Pick",
  "Easy Cleanup",
  "Good for Leftovers",
] as const;
export type TonightBadge = (typeof TONIGHT_BADGES)[number];

/**
 * One badge + one short "why this works tonight" line for the result card, built only from
 * catalog facts (format, tags, category, real timing) and the crew's own filters.
 */
export function buildTonightHighlights(
  slug: string,
  timing: { total_minutes?: number; prep_minutes?: number; cook_minutes?: number } | undefined,
  request: GenerateRequest,
  sourceKind?: string,
): { badge?: TonightBadge; why: string } {
  const meta = loadTonightRecipeMeta().get(slug);
  const total = timing?.total_minutes ?? 0;
  const crew = request.crew_size;
  const format = meta?.mealFormat ?? "";
  const tags = meta?.tags ?? [];

  const quick = total > 0 && total <= 45;
  const bigCrew = crew >= 10 && !!meta && isCrewFeeder(meta);
  const easyCleanup =
    EASY_CLEANUP_FORMATS.has(format) ||
    tags.includes("one_pot") ||
    /one[- ]pot|one[- ]pan|sheet[- ]pan/.test(meta?.title ?? "");
  const leftovers =
    LEFTOVER_FORMATS.has(format) || tags.includes("meal_prep") || meta?.category === "meal_prep_leftovers";
  const budget = tags.includes("budget");
  const hallFavourite =
    sourceKind === "hall_classic" ||
    meta?.category === "firehall_classics" ||
    tags.includes("category:firehall_classics");

  const window = request.time_window;
  const ordered: Array<[boolean, TonightBadge]> = [
    [bigCrew, "Big Crew"],
    [quick && (window === "under_30" || window === "30_60"), "Under 45 Min"],
    [easyCleanup && request.meal_style === "one_pot", "Easy Cleanup"],
    [hallFavourite, "Hall Favourite"],
    [quick, "Under 45 Min"],
    [budget, "Budget Pick"],
    [easyCleanup, "Easy Cleanup"],
    [leftovers, "Good for Leftovers"],
  ];
  const badge = ordered.find(([ok]) => ok)?.[1];

  const prep = timing?.prep_minutes ?? 0;
  const cook = timing?.cook_minutes ?? 0;
  let timeClause: string;
  if (!total) timeClause = "A proven hall dinner";
  else if (quick) timeClause = `Done in ${total} min`;
  else if (HANDS_OFF_FORMATS.has(format) && cook >= prep * 2) {
    timeClause = `${prep} min of prep, then it cooks itself`;
  } else if (total >= 90) {
    const halfHours = Math.round(total / 30) / 2;
    const hours = `${Math.floor(halfHours)}${halfHours % 1 ? "½" : ""}`;
    timeClause = `About ${hours} hrs start to finish`;
  } else timeClause = `${total} min start to finish`;

  const crewClause = bigCrew || (meta && isCrewFeeder(meta)) ? `batches easily for ${crew}` : `scaled for ${crew}`;

  let extra: string | null = null;
  if (easyCleanup) extra = "one pan to clean";
  else if (leftovers) extra = "leftovers hold for next shift";
  else if (budget) extra = "easy on the meal fund";

  return { badge, why: `${timeClause}, ${crewClause}${extra ? ` — ${extra}` : ""}.` };
}
