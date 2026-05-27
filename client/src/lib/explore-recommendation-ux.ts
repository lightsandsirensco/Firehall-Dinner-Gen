/**
 * Explore recommendation storytelling — client-side emotional UX layer.
 */

import type { ExploreEditorialSection } from "@shared/explore-editorial";
import type { MasterCategoryId } from "@shared/categories/constants";
import { MASTER_CATEGORIES_BY_ID } from "@shared/categories/definitions";
import type { ExploreRecipeCard } from "@/lib/explore-recipe";
import type { ExploreContextResponse } from "@/lib/explore-context-api";

export type ExploreTimeSlot = "morning" | "afternoon" | "evening" | "late";
export type ExploreShiftMode = "default" | "quick_shift" | "comfort" | "performance" | "game_day";

export interface ExploreFeedContext {
  timeSlot: ExploreTimeSlot;
  dayOfWeek: number;
  isFriday: boolean;
  isWeekend: boolean;
  shiftMode: ExploreShiftMode;
  serverHints: string[];
}

export interface ExploreHeroCopy {
  eyebrow: string;
  title: string;
  subtitle: string;
  chips: ExploreRecommendationChip[];
}

export interface ExploreRecommendationChip {
  id: string;
  label: string;
  mode: ExploreShiftMode;
}

export interface ExploreRailPresentation {
  title: string;
  subtitle: string;
  hook: string;
  emoji: string;
  chips: string[];
  editorialBadge?: string;
  isHeroRail: boolean;
}

const SEEN_STORAGE_KEY = "firehall_explore_seen_v1";

export function getExploreSeenRecipeIds(): number[] {
  try {
    const raw = sessionStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n) => typeof n === "number" && n > 0).slice(-40);
  } catch {
    return [];
  }
}

export function recordExploreSeenRecipeId(id: number): void {
  if (!id || id <= 0) return;
  const prev = getExploreSeenRecipeIds();
  if (prev.includes(id)) return;
  const next = [...prev, id].slice(-40);
  try {
    sessionStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

function timeSlotFromHour(hour: number): ExploreTimeSlot {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "late";
}

export function detectExploreFeedContext(
  serverHints: string[] = [],
  shiftMode: ExploreShiftMode = "default",
): ExploreFeedContext {
  const now = new Date();
  const dayOfWeek = now.getDay();
  return {
    timeSlot: timeSlotFromHour(now.getHours()),
    dayOfWeek,
    isFriday: dayOfWeek === 5,
    isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
    shiftMode,
    serverHints,
  };
}

const SHIFT_CHIPS: ExploreRecommendationChip[] = [
  { id: "default", label: "Tonight at the hall", mode: "default" },
  { id: "quick", label: "Busy shift", mode: "quick_shift" },
  { id: "comfort", label: "Comfort night", mode: "comfort" },
  { id: "performance", label: "Recovery fuel", mode: "performance" },
  { id: "game", label: "Game day", mode: "game_day" },
];

export function defaultShiftChips(): ExploreRecommendationChip[] {
  return SHIFT_CHIPS;
}

export function buildExploreHeroCopy(ctx: ExploreFeedContext): ExploreHeroCopy {
  const { timeSlot, isFriday, isWeekend, shiftMode, serverHints } = ctx;

  let title = "Meals picked for your hall tonight";
  let subtitle =
    "Curated rails ranked for appetite, crew reality, and shift energy — swipe like a feed, cook like firefighters.";

  if (shiftMode === "quick_shift") {
    title = "Built for a busy shift tonight";
    subtitle = "Under 40 minutes, minimal chaos — the engine surfaces quick hall wins first.";
  } else if (shiftMode === "comfort") {
    title = "Post-call comfort is calling";
    subtitle = "Hearty, familiar spreads when the rig's back and the crew wants something real.";
  } else if (shiftMode === "performance") {
    title = "High-protein recovery meals";
    subtitle = "Lean, satisfying plates that still feel like dinner — not diet food.";
  } else if (shiftMode === "game_day") {
    title = "Game-day hall spread";
    subtitle = "Handhelds, dips, and feeds that keep the couch crew happy.";
  } else if (isFriday && timeSlot !== "morning") {
    title = "Trending at halls this Friday";
    subtitle = "BBQ, pizza, and watch-party energy — what crews are actually cooking tonight.";
  } else if (timeSlot === "morning" || timeSlot === "afternoon") {
    title = "Fuel before the next run";
    subtitle = "Breakfast-for-dinner and quick turns while the station's still moving.";
  } else if (timeSlot === "late") {
    title = "Late shift, real food";
    subtitle = "Satisfying plates when you're past dinner time but the hall's still hungry.";
  }

  if (serverHints[0] && shiftMode === "default") {
    subtitle = serverHints[0];
  }

  const chips = SHIFT_CHIPS.map((c) => ({
    ...c,
    label:
      c.mode === shiftMode
        ? c.label
        : c.mode === "quick_shift" && isWeekend
          ? "Quick weekend meal"
          : c.label,
  }));

  return {
    eyebrow: isWeekend ? "Weekend watch · curated discovery" : "Shift-aware · curated discovery",
    title,
    subtitle,
    chips,
  };
}

function masterId(section: ExploreEditorialSection): MasterCategoryId | null {
  const id = section.masterCategoryId || section.id;
  if (id in MASTER_CATEGORIES_BY_ID) return id as MasterCategoryId;
  return null;
}

const CONTEXTUAL_SUBTITLES: Partial<
  Record<MasterCategoryId, Partial<Record<ExploreShiftMode, string>>>
> = {
  quick_shift_meals: {
    default: "Under 40 minutes — when the tones drop and the crew's hungry",
    quick_shift: "First picks when you need food on the table fast",
  },
  comfort_food: {
    default: "Hearty bowls and bakes after a long call",
    comfort: "Maximum comfort — ranked for emotional payoff",
  },
  healthy_performance: {
    default: "Lean protein that still satisfies a hungry hall",
    performance: "Recovery fuel — high protein, practical cleanup",
  },
  bbq_grill_nights: {
    default: "Smoke, char, and grill marks — outdoor station energy",
    game_day: "Perfect alongside the game — feeds a crowd",
  },
  pizza_night: {
    default: "Friday hall energy without the delivery boxes",
    game_day: "Pies that beat takeout for watch night",
  },
  game_day_watch_party: {
    default: "Handhelds and shareable feeds for the whole couch",
    game_day: "What halls are making for watch night right now",
  },
  firehall_classics: {
    default: "The lineup crews already argue about — hall-proven",
  },
  rookie_friendly: {
    default: "Hard to mess up — built for newer cooks on the line",
    quick_shift: "Simple steps when the shift won't wait",
  },
  meal_prep_leftovers: {
    default: "Cook once, feed the week — Sunday hall prep energy",
  },
  big_crew_feeders: {
    default: "Feeds 10+ without kitchen chaos",
  },
};

const RAIL_CHIPS: Partial<Record<MasterCategoryId, string[]>> = {
  quick_shift_meals: ["≤40 min", "One-pan friendly", "Busy shift"],
  comfort_food: ["Post-call", "Crew favorite", "Hearty"],
  healthy_performance: ["High protein", "Recovery", "Lean grill"],
  bbq_grill_nights: ["Smoked & grilled", "Friday energy"],
  pizza_night: ["Hall pizza night", "Feeds the table"],
  game_day_watch_party: ["Game day", "Shareable"],
  firehall_classics: ["Hall-tested", "Crew picks"],
  big_crew_feeders: ["Feeds 10+", "Batch cook"],
  rookie_friendly: ["Easy steps", "Rookie-safe"],
  global_flavors: ["World plates", "Still practical"],
  breakfast_brunch: ["All-day breakfast", "Morning crew"],
  meal_prep_leftovers: ["Meal prep", "Leftover smart"],
};

export function buildRailPresentation(
  section: ExploreEditorialSection,
  ctx: ExploreFeedContext,
  sectionIndex: number,
): ExploreRailPresentation {
  const catId = masterId(section);
  const def = catId ? MASTER_CATEGORIES_BY_ID[catId] : undefined;
  const emoji = def?.emoji ?? "🔥";
  const hook = section.firefighterHook?.trim() || def?.emotional.firefighterHook || section.subtitle;

  const contextualSub =
    catId && CONTEXTUAL_SUBTITLES[catId]?.[ctx.shiftMode]
      ? CONTEXTUAL_SUBTITLES[catId]![ctx.shiftMode]
      : catId && CONTEXTUAL_SUBTITLES[catId]?.default;

  let subtitle = contextualSub || section.subtitle;
  if (ctx.isFriday && catId === "bbq_grill_nights" && ctx.shiftMode === "default") {
    subtitle = "Trending at halls this Friday — smoke and char ranked first";
  }
  if (ctx.shiftMode === "quick_shift" && sectionIndex <= 2 && catId === "quick_shift_meals") {
    subtitle = "Built for a busy shift tonight — fastest high-quality picks";
  }

  const isHeroRail =
    section.id === "firehouse_staples" ||
    section.id === "firehall_classics" ||
    sectionIndex === 0;

  let editorialBadge: string | undefined;
  if (isHeroRail) editorialBadge = "Top picks";
  else if (ctx.isFriday && (catId === "pizza_night" || catId === "game_day_watch_party")) {
    editorialBadge = "Friday night";
  } else if (ctx.shiftMode === "performance" && catId === "healthy_performance") {
    editorialBadge = "Recovery";
  }

  return {
    title: section.title,
    subtitle,
    hook,
    emoji,
    chips: catId ? RAIL_CHIPS[catId] || [] : [],
    editorialBadge,
    isHeroRail,
  };
}

export function buildWhyThisMeal(
  recipe: ExploreRecipeCard,
  section: ExploreEditorialSection,
  ctx: ExploreFeedContext,
): string {
  if (recipe.hookLine?.trim()) return recipe.hookLine.trim();

  const text = `${recipe.title} ${recipe.summary || ""}`.toLowerCase();
  const catId = masterId(section);
  const mins = recipe.readyInMinutes;

  if (ctx.shiftMode === "quick_shift" && mins > 0 && mins <= 35) {
    return "Built for a busy shift tonight — on the table before the next tone";
  }
  if (ctx.shiftMode === "comfort" && /chili|mac|stew|comfort|cheese|mashed/.test(text)) {
    return "Crew favorite comfort food — exactly what the hall wants after a long call";
  }
  if (ctx.shiftMode === "performance" && /grilled|lean|salmon|turkey|bowl|protein/.test(text)) {
    return "High-protein recovery meal — satisfies without feeling like diet food";
  }
  if (ctx.shiftMode === "game_day" && /nacho|wing|slider|dip|burger|pizza/.test(text)) {
    return "Game-day hall meal — built for sharing around the watch";
  }
  if (/one pot|sheet pan|skillet/.test(text)) {
    return "Minimal cleanup tonight — one pan, less dishes after the call";
  }
  if (mins > 0 && mins <= 30) return "Quick turn for a hungry crew — practical on a busy night";
  if (recipe.fromCuratedDb && recipe.publisherMedia) {
    return "Curated hall pick — real photography, trusted recipe structure";
  }
  if (catId === "firehall_classics") return "Hall-tested classic — crews already know this one";
  if (ctx.isFriday && /bbq|pizza|grill|smoke/.test(text)) {
    return "Trending at halls this Friday — smoke, char, and craveable plates";
  }

  const def = catId ? MASTER_CATEGORIES_BY_ID[catId] : undefined;
  return def?.emotional.trustPromise || "Picked for appetite and hall practicality";
}

export function buildRecommendationChip(
  recipe: ExploreRecipeCard,
  section: ExploreEditorialSection,
  ctx: ExploreFeedContext,
): string | null {
  const text = `${recipe.title} ${recipe.summary || ""}`.toLowerCase();
  const mins = recipe.readyInMinutes;

  if (recipe.fromCuratedDb && recipe.publisherMedia) return "Hall curated";
  if (section.id === "firehouse_staples") return "Crew favorite";
  if (ctx.shiftMode === "quick_shift" && mins > 0 && mins <= 30) return "Quick shift";
  if (ctx.shiftMode === "performance" && /salmon|grilled|lean|turkey|bowl/.test(text)) {
    return "Recovery fuel";
  }
  if (ctx.shiftMode === "comfort") return "Comfort pick";
  if (ctx.isFriday && /bbq|pizza|wing|smoke/.test(text)) return "Friday trending";
  if (/feeds|batch|large|crowd|12|10/.test(text) || (recipe.servings >= 10)) return "Feeds hard";
  if (mins > 0 && mins <= 25) return `${mins} min`;
  return null;
}

/** Highlight sections that match active shift mode or server suggestions */
export function rankSectionsForShiftMode(
  sections: ExploreEditorialSection[],
  ctx: ExploreFeedContext,
  apiContext: ExploreContextResponse | null | undefined,
): ExploreEditorialSection[] {
  const boostIds = new Set<string>();
  if (ctx.shiftMode === "quick_shift") boostIds.add("quick_shift_meals");
  if (ctx.shiftMode === "comfort") boostIds.add("comfort_food");
  if (ctx.shiftMode === "performance") boostIds.add("healthy_performance");
  if (ctx.shiftMode === "game_day") {
    boostIds.add("game_day_watch_party");
    boostIds.add("pizza_night");
    boostIds.add("bbq_grill_nights");
  }
  for (const s of apiContext?.suggestions?.slice(0, 2) || []) {
    boostIds.add(s.categoryId);
  }

  if (boostIds.size === 0) return sections;

  const boosted: ExploreEditorialSection[] = [];
  const rest: ExploreEditorialSection[] = [];
  for (const s of sections) {
    const key = s.masterCategoryId || s.id;
    if (boostIds.has(key) || (s.id === "firehouse_staples" && ctx.shiftMode === "default")) {
      boosted.push(s);
    } else {
      rest.push(s);
    }
  }
  if (ctx.shiftMode === "default") return sections;
  return [...boosted, ...rest];
}

export function performanceModeValue(mode: ExploreShiftMode): number | undefined {
  if (mode === "performance") return 0.75;
  if (mode === "comfort") return 0.2;
  return undefined;
}

export function maxReadyMinutesForMode(mode: ExploreShiftMode): number | undefined {
  if (mode === "quick_shift") return 40;
  return undefined;
}
