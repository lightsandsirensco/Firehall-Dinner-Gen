import type { FilterState } from "@/components/filter-panel";
export {
  resolveCuratedSlugFromTitle,
  getCuratedPackageDef,
  CURATED_HALL_PACKAGES,
} from "@shared/curated-hall-packages";

/** Curated hall dinners for the Classics Wheel — not random AI picks. */
export interface WheelClassic {
  slug: string;
  title: string;
  shortLabel: string;
  emoji: string;
  protein: string;
  crewLine: string;
  tagline: string;
  searchQuery: string;
  segmentColor: string;
  segmentColorAlt: string;
  generatorFilters: {
    meal_format: string;
    proteins: string[];
    cuisine_style: string;
  };
}

export const WHEEL_CLASSICS: WheelClassic[] = [
  {
    slug: "chicken-parm",
    title: "Chicken Parm",
    shortLabel: "Chicken Parm",
    emoji: "🍝",
    protein: "Chicken",
    crewLine: "Cheesy, saucy — the hall classic everyone fights over.",
    tagline: "Italian night at the station",
    searchQuery: "chicken parmesan",
    segmentColor: "#8B2500",
    segmentColorAlt: "#C62828",
    generatorFilters: { meal_format: "pasta", proteins: ["chicken"], cuisine_style: "italian" },
  },
  {
    slug: "taco-night",
    title: "Taco Night",
    shortLabel: "Taco Night",
    emoji: "🌮",
    protein: "Beef",
    crewLine: "Shells, salsa, and a line out the bay door.",
    tagline: "Build-your-own crew favorite",
    searchQuery: "ground beef tacos",
    segmentColor: "#6B3A1F",
    segmentColorAlt: "#E65100",
    generatorFilters: { meal_format: "tacos", proteins: ["beef"], cuisine_style: "mexican" },
  },
  {
    slug: "pulled-pork",
    title: "Pulled Pork Sandwiches",
    shortLabel: "Pulled Pork",
    emoji: "🥪",
    protein: "Pork",
    crewLine: "Low-and-slow vibes without the lecture.",
    tagline: "Sandwich line for the whole hall",
    searchQuery: "pulled pork sandwich",
    segmentColor: "#5C3D2E",
    segmentColorAlt: "#BF360C",
    generatorFilters: { meal_format: "sandwich", proteins: ["pork"], cuisine_style: "bbq" },
  },
  {
    slug: "smash-burgers",
    title: "Smash Burgers",
    shortLabel: "Smash Burgers",
    emoji: "🍔",
    protein: "Beef",
    crewLine: "Crispy edges, melty cheese — shift-approved.",
    tagline: "Griddle night energy",
    searchQuery: "smash burgers with fries",
    segmentColor: "#4A3728",
    segmentColorAlt: "#D84315",
    generatorFilters: { meal_format: "burger", proteins: ["beef"], cuisine_style: "any" },
  },
  {
    slug: "chili-garlic-bread",
    title: "Chili & Garlic Bread",
    shortLabel: "Chili & Bread",
    emoji: "🌶️",
    protein: "Beef",
    crewLine: "One pot, big ladle, zero complaints.",
    tagline: "Stick-to-your-ribs hall fuel",
    searchQuery: "beef chili garlic bread",
    segmentColor: "#7F1D1D",
    segmentColorAlt: "#B71C1C",
    generatorFilters: { meal_format: "soup_chili", proteins: ["beef"], cuisine_style: "any" },
  },
  {
    slug: "chicken-caesar",
    title: "Chicken Caesar Salad",
    shortLabel: "Caesar Salad",
    emoji: "🥗",
    protein: "Chicken",
    crewLine: "Big bowl, cold crunch, hot grill marks on the bird.",
    tagline: "When the crew wants something lighter",
    searchQuery: "chicken caesar salad",
    segmentColor: "#2E5E4E",
    segmentColorAlt: "#388E3C",
    generatorFilters: { meal_format: "salad", proteins: ["chicken"], cuisine_style: "any" },
  },
  {
    slug: "jerk-chicken",
    title: "Jerk Chicken",
    shortLabel: "Jerk Chicken",
    emoji: "🔥",
    protein: "Chicken",
    crewLine: "Char, spice, and Caribbean hall swagger.",
    tagline: "Fire on the grill",
    searchQuery: "jerk chicken",
    segmentColor: "#4A148C",
    segmentColorAlt: "#6A1B9A",
    generatorFilters: { meal_format: "grill", proteins: ["chicken"], cuisine_style: "any" },
  },
  {
    slug: "loaded-nachos",
    title: "Loaded Nachos",
    shortLabel: "Loaded Nachos",
    emoji: "🧀",
    protein: "Beef",
    crewLine: "Sheet pans, melted cheese, hands in the pile.",
    tagline: "Game-night at the hall",
    searchQuery: "loaded nachos ground beef",
    segmentColor: "#E65100",
    segmentColorAlt: "#FF8F00",
    generatorFilters: { meal_format: "loaded_fries", proteins: ["beef"], cuisine_style: "mexican" },
  },
  {
    slug: "beef-dip",
    title: "Beef Dip Sandwiches",
    shortLabel: "Beef Dip",
    emoji: "🥖",
    protein: "Beef",
    crewLine: "Au jus on the counter — dip like you mean it.",
    tagline: "Canadian hall legend",
    searchQuery: "french dip beef sandwich",
    segmentColor: "#5D4037",
    segmentColorAlt: "#8D6E63",
    generatorFilters: { meal_format: "sandwich", proteins: ["beef"], cuisine_style: "canadian" },
  },
  {
    slug: "bbq-chicken-bowls",
    title: "BBQ Chicken Bowls",
    shortLabel: "BBQ Bowls",
    emoji: "🍗",
    protein: "Chicken",
    crewLine: "Sweet smoke, rice base, everyone eats happy.",
    tagline: "Line up the bowls",
    searchQuery: "bbq chicken rice bowl",
    segmentColor: "#1565C0",
    segmentColorAlt: "#1976D2",
    generatorFilters: { meal_format: "bowl", proteins: ["chicken"], cuisine_style: "bbq" },
  },
];

const SLUG_MAP = new Map(WHEEL_CLASSICS.map((c) => [c.slug, c]));

export function getWheelClassicBySlug(slug: string | null): WheelClassic | undefined {
  if (!slug) return undefined;
  return SLUG_MAP.get(slug.toLowerCase().trim());
}

export function pickRandomWheelClassic(): WheelClassic {
  return WHEEL_CLASSICS[Math.floor(Math.random() * WHEEL_CLASSICS.length)];
}

/** Map wheel classic into generator filters for a curated Firehall plate. */
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

/** Open the full curated dinner package (main + sides + steps). */
export function buildPackageUrl(classic: WheelClassic | { slug: string }): string {
  return `/package/${encodeURIComponent(classic.slug)}`;
}

/** Legacy: optional Spoonacular browse */
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
    localStorage.setItem(PIN_KEY, JSON.stringify([...set]));
    window.dispatchEvent(new Event("classic-pins-changed"));
    return set.has(slug);
  } catch {
    return false;
  }
}

/** Optional hook for future sound design — no-op in v1. */
export function playWheelSound(_event: "tick" | "land" | "reveal"): void {
  /* reserved */
}
