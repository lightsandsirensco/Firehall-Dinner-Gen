/**
 * Context-aware recommendation inputs — shift, time, crew, fatigue.
 */

import type { MasterCategoryId } from "../../../shared/categories/constants.js";
import { MASTER_CATEGORIES_BY_ID } from "../../../shared/categories/definitions.js";
import { editorialDaySeed } from "../../../shared/explore-editorial.js";
import type {
  DayOfWeek,
  RecommendationContext,
  TimeOfDaySlot,
} from "../../../shared/recommendation/types.js";
import type { ExploreFeedSafetyFilters } from "../../explore-editorial.js";

export interface BuildRecommendationContextInput extends ExploreFeedSafetyFilters {
  seenRecipeIds?: number[];
  recentProteins?: string[];
  crewSize?: number;
  maxReadyMinutes?: number;
  performanceMode?: number;
  /** Override clock for tests */
  now?: Date;
}

function timeSlotFromHour(hour: number): TimeOfDaySlot {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "late";
}

function preferredCategoriesForContext(
  dayOfWeek: DayOfWeek,
  timeSlot: TimeOfDaySlot,
  performanceMode?: number,
  maxReadyMinutes?: number,
): MasterCategoryId[] {
  const preferred: MasterCategoryId[] = [];

  if (dayOfWeek === 5 || dayOfWeek === 6) {
    preferred.push("bbq_grill_nights", "pizza_night", "game_day_watch_party");
  }
  if (timeSlot === "evening" || timeSlot === "late") {
    preferred.push("comfort_food", "firehall_classics");
  }
  if (timeSlot === "morning" || timeSlot === "afternoon") {
    preferred.push("breakfast_brunch", "quick_shift_meals");
  }
  if (maxReadyMinutes != null && maxReadyMinutes <= 35) {
    preferred.push("quick_shift_meals", "rookie_friendly");
  }
  if (performanceMode != null && performanceMode >= 0.55) {
    preferred.push("healthy_performance");
  } else if (performanceMode != null && performanceMode <= 0.35) {
    preferred.push("comfort_food", "bbq_grill_nights");
  }

  return [...new Set(preferred)];
}

export function buildRecommendationContext(
  input: BuildRecommendationContextInput = {},
): RecommendationContext {
  const now = input.now ?? new Date();
  const dayOfWeek = now.getDay() as DayOfWeek;
  const timeSlot = timeSlotFromHour(now.getHours());

  return {
    daySeed: editorialDaySeed(now),
    timeSlot,
    dayOfWeek,
    crewSize: input.crewSize,
    maxReadyMinutes: input.maxReadyMinutes,
    performanceMode: input.performanceMode,
    seenRecipeIds: input.seenRecipeIds ?? [],
    recentProteins: (input.recentProteins ?? []).map((p) => p.toLowerCase()),
    preferredCategories: preferredCategoriesForContext(
      dayOfWeek,
      timeSlot,
      input.performanceMode,
      input.maxReadyMinutes,
    ),
    diet: input.diet,
    intolerances: input.intolerances,
    excludeIngredients: input.excludeIngredients,
    weatherHint: undefined,
  };
}

export function contextHintsForDisplay(ctx: RecommendationContext): string[] {
  const hints: string[] = [];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (ctx.dayOfWeek === 5) hints.push("Friday night — BBQ, pizza, and watch-party energy");
  if (ctx.timeSlot === "evening") hints.push("Evening hall feed — comfort and classics rank higher");
  if (ctx.maxReadyMinutes != null && ctx.maxReadyMinutes <= 30) {
    hints.push("Quick shift — under 30 minutes prioritized");
  }
  if (ctx.performanceMode != null && ctx.performanceMode >= 0.6) {
    hints.push("Performance mode — healthy rails boosted");
  }
  if (ctx.crewSize != null && ctx.crewSize >= 10) {
    hints.push("Big crew — batch-friendly meals surface first");
  }

  for (const catId of ctx.preferredCategories.slice(0, 2)) {
    const cat = MASTER_CATEGORIES_BY_ID[catId];
    if (cat) hints.push(cat.emotional.firefighterHook);
  }

  if (hints.length === 0) {
    hints.push(`${dayNames[ctx.dayOfWeek]} discovery — curated for your hall`);
  }

  return hints.slice(0, 4);
}

export function parseSeenIds(seen?: string): number[] {
  if (!seen?.trim()) return [];
  return seen
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function parseRecentProteins(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
