/**
 * Simplified generator — five inputs, hard/soft filter contract.
 * Shared between client UI and server matching/QA.
 */

import type { GenerateRequest } from "./schema.js";
import { inferBusyLevelFromTime } from "./busy-level.js";

/** Crew buckets shown in the generator UI */
export const CREW_SIZE_BUCKETS = ["2-4", "5-8", "9-12", "12+"] as const;
export type CrewSizeBucketUi = (typeof CREW_SIZE_BUCKETS)[number];

/** Representative crew_size sent to the API for scaling */
export const CREW_BUCKET_TO_SIZE: Record<CrewSizeBucketUi, number> = {
  "2-4": 4,
  "5-8": 6,
  "9-12": 10,
  "12+": 14,
};

export const CREW_BUCKET_LABELS: Record<CrewSizeBucketUi, string> = {
  "2-4": "2–4",
  "5-8": "5–8",
  "9-12": "9–12",
  "12+": "12+",
};

/** Protein choices — "surprise" maps to API "any" */
export const SIMPLIFIED_PROTEINS = [
  "chicken",
  "beef",
  "pork",
  "turkey",
  "seafood",
  "vegetarian",
  "surprise",
] as const;
export type SimplifiedProtein = (typeof SIMPLIFIED_PROTEINS)[number];

export const SIMPLIFIED_PROTEIN_LABELS: Record<SimplifiedProtein, string> = {
  chicken: "Chicken",
  beef: "Beef",
  pork: "Pork",
  turkey: "Turkey",
  seafood: "Seafood",
  vegetarian: "Vegetarian",
  surprise: "Surprise Me",
};

/** Appliance multi-select — empty means all common appliances available */
export const SIMPLIFIED_APPLIANCE_IDS = [
  "bbq",
  "smoker",
  "oven",
  "stovetop",
  "slow_cooker",
  "air_fryer",
  "flat_top",
] as const;
export type SimplifiedApplianceId = (typeof SIMPLIFIED_APPLIANCE_IDS)[number];

export const SIMPLIFIED_APPLIANCE_LABELS: Record<SimplifiedApplianceId, string> = {
  bbq: "BBQ",
  smoker: "Smoker",
  oven: "Oven",
  stovetop: "Stovetop",
  slow_cooker: "Slow Cooker",
  air_fryer: "Air Fryer",
  flat_top: "Blackstone / Flat Top",
};

/** Hard allergen exclusions */
export const SIMPLIFIED_ALLERGENS = ["dairy", "gluten", "nuts", "shellfish", "eggs"] as const;
export type SimplifiedAllergen = (typeof SIMPLIFIED_ALLERGENS)[number];

export const SIMPLIFIED_ALLERGEN_LABELS: Record<SimplifiedAllergen, string> = {
  dairy: "Dairy",
  gluten: "Gluten",
  nuts: "Nuts",
  shellfish: "Shellfish",
  eggs: "Eggs",
};

export type HealthinessPreference = GenerateRequest["healthiness_preference"];

export const HEALTHINESS_OPTIONS: {
  value: HealthinessPreference;
  label: string;
  emoji: string;
}[] = [
  { value: "comfort", label: "Comfort Food", emoji: "🍔" },
  { value: "balanced", label: "Balanced", emoji: "⚖️" },
  { value: "lean", label: "Healthy", emoji: "🥗" },
];

export interface SimplifiedGeneratorFilters {
  crew_bucket: CrewSizeBucketUi;
  protein: SimplifiedProtein;
  appliances: SimplifiedApplianceId[];
  healthiness: HealthinessPreference;
  allergens: SimplifiedAllergen[];
}

export function createDefaultSimplifiedFilters(): SimplifiedGeneratorFilters {
  return {
    crew_bucket: "5-8",
    protein: "chicken",
    appliances: [],
    healthiness: "balanced",
    allergens: [],
  };
}

/** Map simplified appliance ids to legacy request.appliances strings */
export function simplifiedAppliancesToRequest(applianceIds: SimplifiedApplianceId[]): string[] {
  if (applianceIds.length === 0) {
    return ["stove", "oven", "grill", "slow cooker", "air fryer", "smoker", "instant pot"];
  }
  const out = new Set<string>();
  for (const id of applianceIds) {
    switch (id) {
      case "bbq":
        out.add("grill");
        break;
      case "smoker":
        out.add("grill");
        out.add("smoker");
        break;
      case "oven":
        out.add("oven");
        break;
      case "stovetop":
        out.add("stove");
        break;
      case "slow_cooker":
        out.add("slow cooker");
        break;
      case "air_fryer":
        out.add("air fryer");
        break;
      case "flat_top":
        out.add("grill");
        out.add("stove");
        break;
      default:
        break;
    }
  }
  return [...out];
}

export function simplifiedProteinToApi(protein: SimplifiedProtein): GenerateRequest["protein"] {
  return protein === "surprise" ? "any" : protein;
}

/** Convert simplified UI state to a schema-valid GenerateRequest partial */
export function simplifiedFiltersToGenerateRequest(
  filters: SimplifiedGeneratorFilters,
  extras: Partial<GenerateRequest> = {},
): Partial<GenerateRequest> {
  const crew_size = CREW_BUCKET_TO_SIZE[filters.crew_bucket];
  return {
    crew_size,
    busy_level: inferBusyLevelFromTime("45-60"),
    time_available: "45-60",
    appliances: simplifiedAppliancesToRequest(filters.appliances),
    protein: simplifiedProteinToApi(filters.protein),
    healthiness_preference: filters.healthiness,
    allergens_to_avoid: [...filters.allergens],
    firehall_category: undefined,
    budget_level: "standard",
    cuisine_style: "any",
    meal_format: "random",
    vegetarian_swap_needed: filters.protein === "vegetarian",
    use_what_we_have: false,
    ingredients_on_hand: [],
    ...extras,
  };
}

export function formatApplianceSummary(appliances: SimplifiedApplianceId[]): string {
  if (appliances.length === 0) return "All common";
  return appliances.map((a) => SIMPLIFIED_APPLIANCE_LABELS[a]).join(" + ");
}

export function formatAllergenSummary(allergens: SimplifiedAllergen[]): string {
  if (allergens.length === 0) return "None";
  return allergens.map((a) => SIMPLIFIED_ALLERGEN_LABELS[a]).join(", ");
}

export function formatGeneratorSummary(filters: SimplifiedGeneratorFilters): string {
  const health = HEALTHINESS_OPTIONS.find((h) => h.value === filters.healthiness)?.label ?? "Balanced";
  const protein =
    filters.protein === "surprise"
      ? "Surprise Me"
      : SIMPLIFIED_PROTEIN_LABELS[filters.protein];
  return [
    `Crew: ${CREW_BUCKET_LABELS[filters.crew_bucket]}`,
    `Protein: ${protein}`,
    `Appliances: ${formatApplianceSummary(filters.appliances)}`,
    `Healthy: ${health}`,
    `Avoid: ${formatAllergenSummary(filters.allergens)}`,
  ].join("\n");
}

export function healthinessRelaxationMessage(
  requested: HealthinessPreference,
  served: HealthinessPreference,
  proteinLabel: string,
): string | null {
  if (requested === served) return null;
  const label = (h: HealthinessPreference) =>
    HEALTHINESS_OPTIONS.find((o) => o.value === h)?.label.toLowerCase() ?? h;
  return `We couldn't find a ${label(requested)} version, so here are the best ${label(served)} ${proteinLabel.toLowerCase()} meals.`;
}

/** Migrate legacy firehall_filters localStorage shape */
export function migrateLegacyFilterState(legacy: Record<string, unknown>): SimplifiedGeneratorFilters {
  const defaults = createDefaultSimplifiedFilters();
  const crew = typeof legacy.crew_size === "number" ? legacy.crew_size : 6;
  let crew_bucket: CrewSizeBucketUi = "5-8";
  if (crew <= 4) crew_bucket = "2-4";
  else if (crew <= 8) crew_bucket = "5-8";
  else if (crew <= 12) crew_bucket = "9-12";
  else crew_bucket = "12+";

  const rawProtein = String(legacy.protein || "chicken");
  const protein: SimplifiedProtein =
    rawProtein === "any" ? "surprise" : (SIMPLIFIED_PROTEINS.includes(rawProtein as SimplifiedProtein) ? rawProtein as SimplifiedProtein : "chicken");

  const legacyAppliances = Array.isArray(legacy.appliances) ? legacy.appliances.map(String) : [];
  const appliances: SimplifiedApplianceId[] = [];
  for (const a of legacyAppliances) {
    const lower = a.toLowerCase();
    if (lower.includes("grill")) appliances.push("bbq");
    else if (lower.includes("smoker")) appliances.push("smoker");
    else if (lower.includes("oven")) appliances.push("oven");
    else if (lower.includes("stove")) appliances.push("stovetop");
    else if (lower.includes("slow")) appliances.push("slow_cooker");
    else if (lower.includes("air")) appliances.push("air_fryer");
  }

  const healthRaw = String(legacy.healthiness_preference || "balanced");
  const healthiness: HealthinessPreference =
    healthRaw === "lean" || healthRaw === "comfort" || healthRaw === "balanced"
      ? healthRaw
      : "balanced";

  const allergens = Array.isArray(legacy.allergens_to_avoid)
    ? legacy.allergens_to_avoid.filter((a): a is SimplifiedAllergen =>
        SIMPLIFIED_ALLERGENS.includes(a as SimplifiedAllergen),
      )
    : [];

  return {
    crew_bucket,
    protein,
    appliances: [...new Set(appliances)],
    healthiness,
    allergens,
  };
}
