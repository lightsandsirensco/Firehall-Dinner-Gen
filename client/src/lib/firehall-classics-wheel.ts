import type { FilterState } from "@/components/filter-panel";
import {
  CLASSIC_HALL_MEALS,
  getClassicHallMeal,
  resolveClassicHeroImage,
  type ClassicHallMealMeta,
} from "@shared/classic-hall-meals";
import {
  resolveCuratedSlugFromTitle,
  getCuratedPackageDef,
  CURATED_HALL_PACKAGES,
  type CuratedPackageDef,
} from "@shared/curated-hall-packages";

export {
  resolveCuratedSlugFromTitle,
  getCuratedPackageDef,
  CURATED_HALL_PACKAGES,
  CLASSIC_HALL_MEALS,
  getClassicHallMeal,
} from "@shared/curated-hall-packages";

/** Wheel segment + reveal — derived from the single classic meals source. */
export interface WheelClassic {
  slug: string;
  title: string;
  shortLabel: string;
  emoji: string;
  protein: string;
  crewLine: string;
  tagline: string;
  description: string;
  heroImage: string;
  imageAlt: string;
  cuisine: string;
  mealFormat: string;
  tags: string[];
  searchQuery: string;
  segmentColor: string;
  segmentColorAlt: string;
  generatorFilters: ClassicHallMealMeta["generatorFilters"];
}

function metaToWheelClassic(meta: ClassicHallMealMeta): WheelClassic {
  const pkg = getCuratedPackageDef(meta.slug);
  return {
    slug: meta.slug,
    title: meta.title,
    shortLabel: meta.shortLabel,
    emoji: meta.emoji,
    protein: meta.protein,
    crewLine: meta.description,
    tagline: meta.tagline,
    description: meta.description,
    heroImage: resolveClassicHeroImage(meta),
    imageAlt: meta.imageAlt,
    cuisine: meta.cuisine,
    mealFormat: meta.mealFormat,
    tags: meta.tags,
    searchQuery: meta.searchQuery,
    segmentColor: meta.segmentColor,
    segmentColorAlt: meta.segmentColorAlt,
    generatorFilters: meta.generatorFilters,
  };
}

/** Curated hall dinners for the Classics Wheel — order matches CLASSIC_HALL_MEALS. */
export const WHEEL_CLASSICS: WheelClassic[] = CLASSIC_HALL_MEALS.map(metaToWheelClassic);

const SLUG_MAP = new Map(WHEEL_CLASSICS.map((c) => [c.slug, c]));

export function getWheelClassicBySlug(slug: string | null): WheelClassic | undefined {
  if (!slug) return undefined;
  return SLUG_MAP.get(slug.toLowerCase().trim());
}

export function pickRandomWheelClassic(): WheelClassic {
  return WHEEL_CLASSICS[Math.floor(Math.random() * WHEEL_CLASSICS.length)];
}

export function applyWheelClassicToFilters(
  base: FilterState,
  classic: WheelClassic,
): FilterState {
  const protein = classic.generatorFilters.proteins[0] || "chicken";
  return {
    ...base,
    meal_format: classic.generatorFilters.meal_format,
    protein,
    cuisine_style: classic.generatorFilters.cuisine_style,
    use_what_we_have: false,
    tonight_vibe: "classic_hall",
  };
}

export function buildPackageUrl(classic: WheelClassic | { slug: string }): string {
  return `/package/${encodeURIComponent(classic.slug)}`;
}

export function buildExplorePackageUrl(classic: WheelClassic): string {
  return `/explore?classic=${encodeURIComponent(classic.slug)}`;
}

const PIN_KEY = "firehall_classic_pins";

export function isClassicPinned(slug: string): boolean {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return false;
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) && list.includes(slug);
  } catch {
    return false;
  }
}

export function toggleClassicPin(slug: string): boolean {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const set = new Set(Array.isArray(list) ? list : []);
    if (set.has(slug)) {
      set.delete(slug);
    } else {
      set.add(slug);
    }
    localStorage.setItem(PIN_KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new Event("classic-pins-changed"));
    return set.has(slug);
  } catch {
    return false;
  }
}

export function playWheelSound(_event: "tick" | "land" | "reveal"): void {
  /* reserved */
}

/** Explore classics row — same 10 meals, stable fields for cards. */
export interface ExploreClassicCard {
  slug: string;
  title: string;
  searchQuery: string;
  protein: string;
  style: string;
  emoji: string;
  heroImage: string;
  imageAlt: string;
  tags: string[];
  generatorFilters: ClassicHallMealMeta["generatorFilters"];
}

export function getExploreClassicCards(): ExploreClassicCard[] {
  return WHEEL_CLASSICS.map((c) => ({
    slug: c.slug,
    title: c.title,
    searchQuery: c.searchQuery,
    protein: c.protein,
    style: c.cuisine,
    emoji: c.emoji,
    heroImage: c.heroImage,
    imageAlt: c.imageAlt,
    tags: c.tags,
    generatorFilters: c.generatorFilters,
  }));
}

export type { CuratedPackageDef };
