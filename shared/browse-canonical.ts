/**
 * Canonical catalog browse — /explore is the single browse surface.
 * Recipe detail pages remain at /recipes/:slug (and collection-specific paths).
 */

import {
  FIREHALL_CATEGORY_IDS,
  type FirehallCategoryId,
} from "./firehall-categories.js";
import { DIETARY_FILTER_KEYS, type DietaryFilterKey } from "./dietary/schema.js";
import { isFoodPreferenceKey } from "./ingredient-preferences/definitions.js";

export const BROWSE_CANONICAL_PATH = "/explore";

export type ExplorePrimaryFilter = "all" | "healthy" | "bbq_grill" | "smoothies";
export type ExploreCookTimeFilter = "all" | "under_30" | "30_to_60" | "over_60";

export interface ExploreBrowseFilterPatch {
  primary?: ExplorePrimaryFilter;
  category?: string;
  protein?: string;
  cookTime?: ExploreCookTimeFilter;
  highProtein?: boolean;
  lowCarb?: boolean;
  lowCleanup?: boolean;
  search?: string;
  dietary?: DietaryFilterKey[];
  /** Pro numeric nutrition targets — grams/kcal per serving. See shared/nutrition/filter-eligibility.ts. */
  minProtein?: number;
  maxCalories?: number;
  maxCarbs?: number;
  maxFat?: number;
  /** Pro "Foods to Avoid" preference keys — see shared/ingredient-preferences/. */
  avoid?: string[];
}

/** Sane upper bounds for numeric nutrition query params — reject garbage/abuse values rather than pass them through to the filter. */
const MAX_NUMERIC_FILTER_GRAMS = 500;
const MAX_NUMERIC_FILTER_CALORIES = 3000;

function parsePositiveIntParam(raw: string | null, max: number): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.round(n), max);
}

export function isFirehallCategoryId(id: string): id is FirehallCategoryId {
  return (FIREHALL_CATEGORY_IDS as readonly string[]).includes(id);
}

/** Map legacy /categories/:id hubs to Explore filter query strings. */
export function firehallCategoryExplorePath(categoryId: string): string {
  if (categoryId === "breakfast") return "/breakfast";

  if (!isFirehallCategoryId(categoryId)) {
    return BROWSE_CANONICAL_PATH;
  }

  const params = new URLSearchParams();

  switch (categoryId) {
    case "crew_favorites":
      params.set("category", "firehall_classics");
      break;
    case "quick_meals":
      params.set("cookTime", "under_30");
      break;
    case "comfort_food":
      params.set("category", "comfort_food");
      break;
    case "high_protein":
      params.set("highProtein", "1");
      break;
    case "bbq_smoker":
      params.set("primary", "bbq_grill");
      break;
    case "healthy_options":
      params.set("primary", "healthy");
      break;
    case "easy_cleanup":
      params.set("lowCleanup", "1");
      break;
    case "feed_a_crowd":
      params.set("category", "big_crew_feeders");
      break;
    case "game_day":
      params.set("category", "game_day_watch_party");
      break;
    default:
      break;
  }

  const qs = params.toString();
  return qs ? `${BROWSE_CANONICAL_PATH}?${qs}` : BROWSE_CANONICAL_PATH;
}

export function parseExploreBrowseSearch(search: string): ExploreBrowseFilterPatch {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const patch: ExploreBrowseFilterPatch = {};

  const primary = params.get("primary");
  if (primary === "all" || primary === "healthy" || primary === "bbq_grill" || primary === "smoothies") {
    patch.primary = primary;
  }

  const category = params.get("category");
  if (category) patch.category = category;

  const protein = params.get("protein");
  if (protein) patch.protein = protein;

  const cookTime = params.get("cookTime");
  if (cookTime === "under_30" || cookTime === "30_to_60" || cookTime === "over_60") {
    patch.cookTime = cookTime;
  } else if (cookTime === "all") {
    patch.cookTime = "all";
  }

  if (params.get("highProtein") === "1") patch.highProtein = true;
  if (params.get("lowCarb") === "1") patch.lowCarb = true;
  if (params.get("lowCleanup") === "1") patch.lowCleanup = true;

  const searchText = params.get("q") ?? params.get("search");
  if (searchText) patch.search = searchText;

  const dietary = params.get("dietary");
  if (dietary) {
    const known = new Set<string>(DIETARY_FILTER_KEYS);
    const parsed = dietary.split(",").filter((k) => known.has(k)) as DietaryFilterKey[];
    if (parsed.length > 0) patch.dietary = parsed;
  }

  const minProtein = parsePositiveIntParam(params.get("minProtein"), MAX_NUMERIC_FILTER_GRAMS);
  if (minProtein != null) patch.minProtein = minProtein;
  const maxCalories = parsePositiveIntParam(params.get("maxCalories"), MAX_NUMERIC_FILTER_CALORIES);
  if (maxCalories != null) patch.maxCalories = maxCalories;
  const maxCarbs = parsePositiveIntParam(params.get("maxCarbs"), MAX_NUMERIC_FILTER_GRAMS);
  if (maxCarbs != null) patch.maxCarbs = maxCarbs;
  const maxFat = parsePositiveIntParam(params.get("maxFat"), MAX_NUMERIC_FILTER_GRAMS);
  if (maxFat != null) patch.maxFat = maxFat;

  const avoid = params.get("avoid");
  if (avoid) {
    // Unknown values are silently dropped — never passed through to the
    // filter or reflected back into the URL, so no new indexable
    // faceted-search surface is created for arbitrary/garbage values.
    const parsed = avoid.split(",").map((v) => v.trim()).filter(isFoodPreferenceKey);
    if (parsed.length > 0) patch.avoid = [...new Set(parsed)];
  }

  return patch;
}

export function buildExploreBrowseSearch(input: {
  primary: ExplorePrimaryFilter;
  category: string;
  protein: string;
  cookTime: ExploreCookTimeFilter;
  highProtein: boolean;
  lowCarb: boolean;
  lowCleanup: boolean;
  searchQuery: string;
  dietary?: DietaryFilterKey[];
  minProtein?: number | null;
  maxCalories?: number | null;
  maxCarbs?: number | null;
  maxFat?: number | null;
  avoid?: string[];
}): string {
  const params = new URLSearchParams();

  if (input.primary !== "all") params.set("primary", input.primary);
  if (input.category !== "all") params.set("category", input.category);
  if (input.protein !== "all") params.set("protein", input.protein);
  if (input.cookTime !== "all") params.set("cookTime", input.cookTime);
  if (input.highProtein) params.set("highProtein", "1");
  if (input.lowCarb) params.set("lowCarb", "1");
  if (input.lowCleanup) params.set("lowCleanup", "1");
  if (input.searchQuery.trim()) params.set("q", input.searchQuery.trim());
  if (input.dietary && input.dietary.length > 0) params.set("dietary", input.dietary.join(","));
  if (input.minProtein != null) params.set("minProtein", String(input.minProtein));
  if (input.maxCalories != null) params.set("maxCalories", String(input.maxCalories));
  if (input.maxCarbs != null) params.set("maxCarbs", String(input.maxCarbs));
  if (input.maxFat != null) params.set("maxFat", String(input.maxFat));
  if (input.avoid && input.avoid.length > 0) {
    const known = input.avoid.filter(isFoodPreferenceKey);
    if (known.length > 0) params.set("avoid", [...new Set(known)].join(","));
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
