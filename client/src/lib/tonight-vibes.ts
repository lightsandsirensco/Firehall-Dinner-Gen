import type { FilterState } from "@/components/filter-panel";



/** UI-only vibe keys; mapped to existing backend filter fields. */

export type TonightVibe =

  | "classic_hall"

  | "quick_easy"

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

  { value: "big_appetite", label: "Big appetite", hint: "Extra hearty — real portions" },

  { value: "comfort", label: "Comfort night", hint: "Stick-to-your-ribs" },

  { value: "surprise_meal", label: "Shake it up", hint: "Something different tonight" },

];



export const CREW_CHIPS = [

  { value: 4, label: "4" },

  { value: 6, label: "6" },

  { value: 8, label: "8" },

  { value: 10, label: "10" },

  { value: 12, label: "12+" },

] as const;



export const TIME_CHIPS = [

  { value: "20-30", label: "~25 min" },

  { value: "25-40", label: "~35 min" },

  { value: "45-60", label: "45+ min" },

] as const;



/** Primary protein chips; "surprise" maps to API protein "any". */

export const PROTEIN_CHIPS = [

  { value: "chicken", label: "Chicken" },

  { value: "beef", label: "Beef" },

  { value: "any", label: "Surprise me" },

] as const;



export function createDefaultFilters(): FilterState {

  return {

    crew_size: 6,

    busy_level: "average",

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



export function inferVibeFromFilters(filters: Partial<FilterState>): TonightVibe {

  if (filters.tonight_vibe) {

    const v = filters.tonight_vibe as string;

    if (v === "high_protein") return "big_appetite";

    return v as TonightVibe;

  }



  const h = filters.healthiness_preference;

  const m = filters.meal_format;



  if (h === "comfort" || m === "one_pot" || m === "stew" || m === "soup_chili") return "comfort";

  if (m === "skillet" || m === "sheet_pan") return "quick_easy";

  if (h === "lean" || m === "grill") return "big_appetite";

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

    busy_level: "average",

  };

}



export function normalizeLoadedFilters(parsed: Partial<FilterState>): FilterState {

  const base = { ...createDefaultFilters(), ...parsed };

  base.busy_level = "average";

  if ((base as { tonight_vibe?: string }).tonight_vibe === "high_protein") {

    (base as FilterState).tonight_vibe = "big_appetite";

  }

  base.tonight_vibe = inferVibeFromFilters(base);

  const mapped = VIBE_BACKEND[base.tonight_vibe];

  if (!parsed.tonight_vibe) {

    base.healthiness_preference = mapped.healthiness_preference;

    base.meal_format = mapped.meal_format;

  }

  if (base.protein === "surprise") base.protein = "any";

  return base;

}



export function apiProtein(protein: string): string {

  return protein === "surprise" ? "any" : protein;

}



export function timeChipLabel(timeAvailable: string): string {

  const chip = TIME_CHIPS.find((t) => t.value === timeAvailable);

  return chip?.label ?? "~35 min";

}



export function formatGenerateSummary(filters: FilterState): string {

  const protein =

    filters.protein === "any"

      ? "crew's pick"

      : filters.protein.charAt(0).toUpperCase() + filters.protein.slice(1);

  return `${filters.crew_size} at the table · ${timeChipLabel(filters.time_available)} · ${protein}`;

}



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

    !["chicken", "beef", "any"].includes(filters.protein)

  );

}


