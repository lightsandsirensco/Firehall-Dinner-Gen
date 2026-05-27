/**
 * Deterministic emergency meals — always available offline-ish.
 * Indexed by protein, cook-time bucket, crew size band, and format tags.
 */

import type { GenerateRequest } from "./schema.js";

export type EmergencyTimeBucket =
  | "quick"
  | "standard"
  | "long";

export type EmergencyCrewBand = "small" | "standard" | "large";

export interface EmergencyMealSeed {
  id: string;
  title: string;
  protein: string;
  mealFormat: string;
  timeBucket: EmergencyTimeBucket;
  crewBand: EmergencyCrewBand;
  tags: string[];
  cuisine: string;
  whyItFits: string;
}

const TIME_BUCKET: Record<string, EmergencyTimeBucket> = {
  "15-25": "quick",
  "20-30": "quick",
  "25-40": "standard",
  "30-45": "standard",
  "45-60": "long",
  "60-90": "long",
};

export function emergencyTimeBucket(timeAvailable: string): EmergencyTimeBucket {
  return TIME_BUCKET[timeAvailable] || "standard";
}

export function emergencyCrewBand(crewSize: number): EmergencyCrewBand {
  if (crewSize >= 10) return "large";
  if (crewSize <= 4) return "small";
  return "standard";
}

/** Seeded catalog — expanded over time; ids stable for telemetry. */
export const EMERGENCY_FALLBACK_POOL: EmergencyMealSeed[] = [
  {
    id: "ef-chicken-skillet-quick",
    title: "Garlic Butter Chicken Skillet",
    protein: "chicken",
    mealFormat: "skillet",
    timeBucket: "quick",
    crewBand: "standard",
    tags: ["high_protein", "one_pan"],
    cuisine: "american",
    whyItFits: "Fast hall skillet — big flavor, minimal dishes.",
  },
  {
    id: "ef-beef-tacos-standard",
    title: "Firehall Beef Tacos",
    protein: "beef",
    mealFormat: "tacos",
    timeBucket: "standard",
    crewBand: "standard",
    tags: ["handheld", "crowd"],
    cuisine: "mexican",
    whyItFits: "Build-your-own tacos — crew feeds itself at the table.",
  },
  {
    id: "ef-pork-sheet-long",
    title: "Brown Sugar Pork Sheet Pan",
    protein: "pork",
    mealFormat: "sheet_pan",
    timeBucket: "long",
    crewBand: "large",
    tags: ["sheet_pan", "batch"],
    cuisine: "american",
    whyItFits: "Sheet pan scales for a full shift without babysitting the stove.",
  },
  {
    id: "ef-turkey-bowl-quick",
    title: "Smoky Turkey Bowls",
    protein: "turkey",
    mealFormat: "bowl",
    timeBucket: "quick",
    crewBand: "small",
    tags: ["bowl", "lean"],
    cuisine: "american",
    whyItFits: "Lean protein bowls — ready before the next call comes in.",
  },
  {
    id: "ef-fish-plated-standard",
    title: "Lemon Herb Fish Plates",
    protein: "fish",
    mealFormat: "plated_main",
    timeBucket: "standard",
    crewBand: "standard",
    tags: ["plated", "light"],
    cuisine: "mediterranean",
    whyItFits: "Light plated dinner when the hall wants something cleaner.",
  },
  {
    id: "ef-seafood-pasta-standard",
    title: "Garlic Shrimp Pasta Night",
    protein: "seafood",
    mealFormat: "pasta",
    timeBucket: "standard",
    crewBand: "standard",
    tags: ["pasta", "comfort"],
    cuisine: "italian",
    whyItFits: "Crew pasta night with real seafood — feels like a win.",
  },
  {
    id: "ef-veg-chili-long",
    title: "Hearty Hall Veggie Chili",
    protein: "vegetarian",
    mealFormat: "soup_chili",
    timeBucket: "long",
    crewBand: "large",
    tags: ["vegetarian", "batch", "comfort"],
    cuisine: "american",
    whyItFits: "Big pot chili — vegetarian-friendly and scales for the whole hall.",
  },
  {
    id: "ef-beef-burger-quick",
    title: "Firehall Smash Burgers",
    protein: "beef",
    mealFormat: "burger",
    timeBucket: "quick",
    crewBand: "small",
    tags: ["handheld", "grill"],
    cuisine: "american",
    whyItFits: "Classic shift burgers — fast, familiar, always a hit.",
  },
  {
    id: "ef-chicken-stir-quick",
    title: "Ginger Sesame Chicken Stir-Fry",
    protein: "chicken",
    mealFormat: "stir_fry",
    timeBucket: "quick",
    crewBand: "standard",
    tags: ["wok", "asian"],
    cuisine: "asian",
    whyItFits: "High-heat stir-fry — dinner on the table in one pan.",
  },
  {
    id: "ef-any-casserole-standard",
    title: "Hall Crew Casserole",
    protein: "any",
    mealFormat: "casserole",
    timeBucket: "standard",
    crewBand: "large",
    tags: ["casserole", "comfort", "batch"],
    cuisine: "american",
    whyItFits: "When everything else fails — a reliable casserole feeds the hall.",
  },
];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function proteinMatches(want: string, have: string): boolean {
  const w = (want || "any").toLowerCase();
  const h = (have || "any").toLowerCase();
  if (w === "any" || h === "any") return true;
  return w === h;
}

/**
 * Pick the best emergency seed for filters — deterministic for a given seed string.
 */
export function pickEmergencyFallbackSeed(
  request: GenerateRequest,
  varietySeed: string,
): EmergencyMealSeed {
  const timeBucket = emergencyTimeBucket(request.time_available);
  const crewBand = emergencyCrewBand(request.crew_size ?? 4);
  const fmt = (request.meal_format || "random").toLowerCase();
  const wantProtein = (request.protein || "any").toLowerCase();

  const scored = EMERGENCY_FALLBACK_POOL.map((meal) => {
    let score = 0;
    if (proteinMatches(wantProtein, meal.protein)) score += 50;
    if (meal.timeBucket === timeBucket) score += 20;
    if (meal.crewBand === crewBand) score += 12;
    if (fmt !== "random" && meal.mealFormat === fmt) score += 28;
    const cuisine = (request.cuisine_style || "any").toLowerCase();
    if (cuisine !== "any" && meal.cuisine.includes(cuisine)) score += 10;
    for (const tag of meal.tags) {
      if (fmt.includes(tag) || tag.includes(fmt)) score += 4;
    }
    return { meal, score };
  }).sort((a, b) => b.score - a.score);

  const viable = scored.filter((x) => x.score > 0);
  const pool = viable.length > 0 ? viable : scored;
  const idx = hashSeed(varietySeed) % Math.min(pool.length, 6);
  return pool[idx]!.meal;
}
