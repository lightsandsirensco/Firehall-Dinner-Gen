/**
 * Hall trust badges — visible signals of shift-life usability.
 */

export type MealTrustBadgeId =
  | "rookie_friendly"
  | "busy_shift"
  | "crew_favorite"
  | "fast_cleanup"
  | "heavy_call_night"
  | "bbq_hall_classic"
  | "feeds_crew"
  | "protein_packed";

export interface MealTrustBadge {
  id: MealTrustBadgeId;
  label: string;
  shortLabel: string;
  /** Tailwind accent for badge chip */
  tone: "red" | "amber" | "zinc" | "emerald";
}

export const MEAL_TRUST_BADGES: Record<MealTrustBadgeId, MealTrustBadge> = {
  rookie_friendly: {
    id: "rookie_friendly",
    label: "Rookie Friendly",
    shortLabel: "Rookie OK",
    tone: "emerald",
  },
  busy_shift: {
    id: "busy_shift",
    label: "Busy Shift Approved",
    shortLabel: "Busy shift",
    tone: "amber",
  },
  crew_favorite: {
    id: "crew_favorite",
    label: "Crew Favorite",
    shortLabel: "Crew fav",
    tone: "red",
  },
  fast_cleanup: {
    id: "fast_cleanup",
    label: "Fast Cleanup",
    shortLabel: "Easy cleanup",
    tone: "emerald",
  },
  heavy_call_night: {
    id: "heavy_call_night",
    label: "Heavy Call Night Meal",
    shortLabel: "After a tough call",
    tone: "red",
  },
  bbq_hall_classic: {
    id: "bbq_hall_classic",
    label: "BBQ Hall Classic",
    shortLabel: "BBQ classic",
    tone: "amber",
  },
  feeds_crew: {
    id: "feeds_crew",
    label: "Feeds a Hungry Crew",
    shortLabel: "Feeds the crew",
    tone: "red",
  },
  protein_packed: {
    id: "protein_packed",
    label: "Protein Packed",
    shortLabel: "High protein",
    tone: "emerald",
  },
};

export interface MealTrustInput {
  category?: string;
  tags?: string[];
  cookTime?: number;
  difficulty?: string;
  cleanupDifficulty?: string;
  protein?: number;
  popularityWeight?: number;
  cuisine?: string;
}

const TAG_SET = (tags?: string[]) => new Set((tags ?? []).map((t) => t.toLowerCase()));

export function deriveMealTrustBadges(input: MealTrustInput, max = 4): MealTrustBadge[] {
  const cat = (input.category ?? "").toLowerCase();
  const tags = TAG_SET(input.tags);
  const mins = input.cookTime ?? 0;
  const ids: MealTrustBadgeId[] = [];

  if (
    cat.includes("rookie") ||
    input.difficulty === "easy" ||
    tags.has("rookie_friendly") ||
    tags.has("beginner")
  ) {
    ids.push("rookie_friendly");
  }

  if (
    cat.includes("quick") ||
    mins > 0 && mins <= 40 ||
    tags.has("quick") ||
    tags.has("busy_shift")
  ) {
    ids.push("busy_shift");
  }

  if (
    cat.includes("comfort") ||
    cat.includes("classic") ||
    cat.includes("firehall") ||
    (input.popularityWeight ?? 0) >= 7
  ) {
    ids.push("crew_favorite");
  }

  if (
    input.cleanupDifficulty === "easy" ||
    (mins > 0 && mins <= 35 && cat.includes("quick"))
  ) {
    ids.push("fast_cleanup");
  }

  if (
    cat.includes("comfort") ||
    cat.includes("big_crew") ||
    cat.includes("feeder") ||
    tags.has("comfort")
  ) {
    ids.push("heavy_call_night");
  }

  if (cat.includes("bbq") || (input.cuisine ?? "").toLowerCase().includes("bbq") || tags.has("bbq")) {
    ids.push("bbq_hall_classic");
  }

  if (cat.includes("big_crew") || cat.includes("feeder") || tags.has("crew_feeder")) {
    ids.push("feeds_crew");
  }

  if (
    cat.includes("healthy") ||
    cat.includes("performance") ||
    tags.has("high_protein") ||
    tags.has("healthy") ||
    (input.protein ?? 0) >= 35
  ) {
    ids.push("protein_packed");
  }

  const unique = [...new Set(ids)];
  return unique.slice(0, max).map((id) => MEAL_TRUST_BADGES[id]);
}
