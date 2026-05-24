import type { FilterState } from "@/components/filter-panel";

/** UI-only vibe keys; mapped to existing backend filter fields. */
export type TonightVibe =
  | "classic_hall"
  | "quick_easy"
  | "healthy"
  | "big_appetite"
  | "comfort"
  | "surprise_meal";

export const DEFAULT_TONIGHT_VIBE: TonightVibe = "classic_hall";

const VIBE_BACKEND: Record<
  TonightVibe,
  Pick<FilterState, "healthiness_preference" | "meal_format" | "cuisine_style">
> = {
  classic_hall: {
    healthiness_preference: "balanced",
    meal_format: "random",
    cuisine_style: "any",
  },
  quick_easy: {
    healthiness_preference: "balanced",
    meal_format: "skillet",
    cuisine_style: "any",
  },
  healthy: {
    healthiness_preference: "lean",
    meal_format: "random",
    cuisine_style: "any",
  },
  big_appetite: {
    healthiness_preference: "comfort",
    meal_format: "plated_main",
    cuisine_style: "any",
  },
  comfort: {
    healthiness_preference: "comfort",
    meal_format: "one_pot",
    cuisine_style: "any",
  },
  surprise_meal: {
    healthiness_preference: "balanced",
    meal_format: "random",
    cuisine_style: "any",
  },
};

export const TONIGHT_VIBE_OPTIONS: { value: TonightVibe; label: string; hint: string }[] = [
  { value: "classic_hall", label: "Hall classic", hint: "What the crew expects on a normal night" },
  { value: "quick_easy", label: "Quick on shift", hint: "Skillet or one-pan — in and out" },
  { value: "healthy", label: "Healthy", hint: "Lighter plates — still hearty, grilled bowls, real sides" },
  { value: "big_appetite", label: "Big appetite", hint: "Extra hearty — real portions" },
  { value: "comfort", label: "Comfort night", hint: "Stick-to-your-ribs" },
  { value: "surprise_meal", label: "Shake it up", hint: "Something different tonight" },
];

/** Primary homepage chips — S1 simplified generator */
export const CREW_CHIPS = [
  { value: 4, label: "4" },
  { value: 6, label: "6" },
  { value: 8, label: "8" },
  { value: 10, label: "10+" },
] as const;

export const TIME_CHIPS = [
  { value: "20-30", label: "~25 min" },
  { value: "25-40", label: "~35 min" },
  { value: "45-60", label: "45+ min" },
] as const;

export const PROTEIN_CHIPS = [
  { value: "chicken", label: "Chicken" },
  { value: "beef", label: "Beef" },
  { value: "any", label: "Surprise Me" },
] as const;

export function createDefaultFilters(): FilterState {
  return {
    crew_size: 6,
    time_available: "25-40",
    appliances: ["stove", "oven"],
    protein: "chicken",
    healthiness_preference: "balanced",
    budget_level: "standard",
    cuisine_style: "any",
    meal_format: "random",
    allergens_to_avoid: [],
    vegetarian_swap_needed: false,
    use_what_we_have: false,
    ingredients_on_hand_text: "",
    tonight_vibe: DEFAULT_TONIGHT_VIBE,
  };
}

/** S9 — first-visit defaults: one tap to a full hall meal without setup. */
export function createFirstTapDefaults(): FilterState {
  return applySimplifiedChipSelection(
    applyTonightVibe(createDefaultFilters(), "surprise_meal"),
    { protein: "any" },
  );
}

export function inferVibeFromFilters(filters: Partial<FilterState>): TonightVibe {
  if (filters.tonight_vibe) {
    const v = filters.tonight_vibe as string;
    if (v === "high_protein") return "big_appetite";
    if (TONIGHT_VIBE_OPTIONS.some((o) => o.value === v)) return v as TonightVibe;
  }

  const h = filters.healthiness_preference;
  const m = filters.meal_format;

  if (h === "lean") return "healthy";
  if (h === "comfort" || m === "one_pot" || m === "stew" || m === "soup_chili") return "comfort";
  if (m === "skillet") return "quick_easy";
  if (m === "plated_main") return "big_appetite";
  if (m === "random" && h === "balanced") return "classic_hall";

  return DEFAULT_TONIGHT_VIBE;
}

export function applyTonightVibe(filters: FilterState, vibe: TonightVibe): FilterState {
  const mapped = VIBE_BACKEND[vibe];
  return {
    ...filters,
    tonight_vibe: vibe,
    healthiness_preference: mapped.healthiness_preference,
    meal_format: mapped.meal_format,
    cuisine_style: mapped.cuisine_style,
  };
}

/** Map simplified chip picks → internal vibe/backend hints. */
export function applySimplifiedChipSelection(
  filters: FilterState,
  change: { crew_size?: number; time_available?: string; protein?: string },
): FilterState {
  let next: FilterState = { ...filters, ...change };

  if (change.crew_size !== undefined) {
    next.crew_size = change.crew_size;
    if (change.crew_size >= 10 && next.protein !== "any") {
      next = applyTonightVibe(next, "big_appetite");
    }
  }

  if (change.time_available !== undefined) {
    next.time_available = change.time_available;
    if (next.protein === "any") {
      // Surprise Me owns meal_format/cuisine randomization
    } else if (change.time_available === "20-30") {
      next = applyTonightVibe(next, "quick_easy");
    } else if (change.time_available === "45-60" && next.tonight_vibe === "quick_easy") {
      next = applyTonightVibe(next, "classic_hall");
    }
  }

  if (change.protein !== undefined) {
    next.protein = change.protein;
    if (change.protein === "any") {
      next = applyTonightVibe(next, "surprise_meal");
      next.cuisine_style = "any";
      next.meal_format = "random";
    } else if (filters.protein === "any") {
      next = applyTonightVibe(next, DEFAULT_TONIGHT_VIBE);
    }
  }

  return next;
}

export function normalizeLoadedFilters(parsed: Partial<FilterState>): FilterState {
  const { busy_level: _legacyBusy, ...rest } = parsed as Partial<FilterState> & {
    busy_level?: string;
  };
  const base = { ...createDefaultFilters(), ...rest };

  if ((base as { tonight_vibe?: string }).tonight_vibe === "high_protein") {
    (base as FilterState).tonight_vibe = "big_appetite";
  }
  if (!TONIGHT_VIBE_OPTIONS.some((v) => v.value === base.tonight_vibe)) {
    base.tonight_vibe = inferVibeFromFilters(base);
  }

  if (!CREW_CHIPS.some((c) => c.value === base.crew_size)) {
    if (base.crew_size >= 10) base.crew_size = 10;
    else if (base.crew_size > 8) base.crew_size = 8;
    else if (base.crew_size > 6) base.crew_size = 6;
    else if (base.crew_size > 4) base.crew_size = 6;
  }

  if (!TIME_CHIPS.some((t) => t.value === base.time_available)) {
    if (base.time_available === "15-25" || base.time_available === "30-45") {
      base.time_available = "25-40";
    }
  }

  if (base.protein === "surprise") base.protein = "any";
  if (!PROTEIN_CHIPS.some((p) => p.value === base.protein) && !base.use_what_we_have) {
    base.protein = "chicken";
  }

  base.tonight_vibe = inferVibeFromFilters(base);

  const mapped = VIBE_BACKEND[base.tonight_vibe];
  if (!parsed.tonight_vibe && !parsed.meal_format) {
    base.healthiness_preference = mapped.healthiness_preference;
    base.meal_format = mapped.meal_format;
  }
  if (!parsed.cuisine_style) {
    base.cuisine_style = mapped.cuisine_style;
  }

  return base;
}

export function apiProtein(protein: string): string {
  return protein === "surprise" ? "any" : protein;
}

export function timeChipLabel(timeAvailable: string): string {
  const chip = TIME_CHIPS.find((t) => t.value === timeAvailable);
  return chip?.label ?? "~35 min";
}

/** @deprecated Import from `@/lib/meal-outcome-copy` — kept for existing imports */
export { formatDinnerOutcomeLine as formatGenerateSummary } from "@/lib/meal-outcome-copy";

export function isAdvancedCustomized(filters: FilterState): boolean {
  const vibeDefaults = VIBE_BACKEND[filters.tonight_vibe];

  return (
    filters.use_what_we_have ||
    filters.allergens_to_avoid.length > 0 ||
    filters.cuisine_style !== "any" ||
    filters.budget_level !== "standard" ||
    filters.meal_format !== vibeDefaults.meal_format ||
    filters.healthiness_preference !== vibeDefaults.healthiness_preference ||
    filters.vegetarian_swap_needed ||
    filters.tonight_vibe !== DEFAULT_TONIGHT_VIBE ||
    !["chicken", "beef", "any"].includes(filters.protein) ||
    filters.appliances.length !== 2 ||
    !filters.appliances.includes("stove") ||
    !filters.appliances.includes("oven")
  );
}
