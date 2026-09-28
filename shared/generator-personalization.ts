/**
 * Generator personalization — map hall/profile strings to simplified generator fields.
 */

import type { UserPreferences } from "./auth/types.js";
import type { HallRecord } from "./hall-membership/types.js";
import {
  CREW_SIZE_BUCKETS,
  SIMPLIFIED_ALLERGENS,
  SIMPLIFIED_APPLIANCE_IDS,
  SIMPLIFIED_DIETS,
  SIMPLIFIED_PROTEINS,
  NUTRITION_GOAL_OPTIONS,
  createDefaultSimplifiedFilters,
  nutritionGoalToHealthiness,
  type CrewSizeBucketUi,
  type HealthinessPreference,
  type NutritionGoal,
  type SimplifiedAllergen,
  type SimplifiedApplianceId,
  type SimplifiedDiet,
  type SimplifiedGeneratorFilters,
  type SimplifiedProtein,
} from "./generator-simplified.js";
import { sanitizeFoodPreferenceKeys } from "./ingredient-preferences/definitions.js";

export const GENERATOR_PERSONAL_PREFS_SCHEMA = 1 as const;

export interface GeneratorPersonalPrefs {
  schemaVersion: typeof GENERATOR_PERSONAL_PREFS_SCHEMA;
  protein: SimplifiedProtein;
  healthiness: HealthinessPreference;
  /** Device-level "remember my last pick" — never written back to the saved profile. */
  nutrition_goal?: NutritionGoal;
  allergens: SimplifiedAllergen[];
  diets: SimplifiedDiet[];
  /** Firehall Meals Pro — "Foods to Avoid" (canonical keys). Session-overridable. */
  foodsToAvoid: SimplifiedGeneratorFilters["foodsToAvoid"];
  /** Device-level crew override when not using linked hall crew */
  crew_bucket?: CrewSizeBucketUi;
  updatedAt: string;
}

const PROFILE_APPLIANCE_MAP: Record<string, SimplifiedApplianceId> = {
  stove: "stovetop",
  stovetop: "stovetop",
  oven: "oven",
  grill: "bbq",
  bbq: "bbq",
  smoker: "smoker",
  air_fryer: "air_fryer",
  "air fryer": "air_fryer",
  slow_cooker: "slow_cooker",
  "slow cooker": "slow_cooker",
  instant_pot: "slow_cooker",
  "instant pot": "slow_cooker",
  flat_top: "flat_top",
  "flat top": "flat_top",
  blackstone: "flat_top",
};

export function crewSizeToBucket(size: number): CrewSizeBucketUi {
  if (size <= 4) return "2-4";
  if (size <= 8) return "5-8";
  if (size <= 12) return "9-12";
  return "12+";
}

export function mapProfileAppliancesToSimplified(raw: string[]): SimplifiedApplianceId[] {
  const out = new Set<SimplifiedApplianceId>();
  for (const item of raw) {
    const key = item.toLowerCase().trim().replace(/\s+/g, "_");
    const mapped =
      PROFILE_APPLIANCE_MAP[key] ??
      PROFILE_APPLIANCE_MAP[key.replace(/_/g, " ")] ??
      (SIMPLIFIED_APPLIANCE_IDS.includes(key as SimplifiedApplianceId)
        ? (key as SimplifiedApplianceId)
        : null);
    if (mapped) out.add(mapped);
  }
  return [...out];
}

export function mapDietaryToAllergens(restrictions: string[]): SimplifiedAllergen[] {
  const out = new Set<SimplifiedAllergen>();
  for (const r of restrictions) {
    const key = r.toLowerCase().trim();
    if (key === "vegetarian" || key === "vegan" || key === "soy") continue;
    if (SIMPLIFIED_ALLERGENS.includes(key as SimplifiedAllergen)) {
      out.add(key as SimplifiedAllergen);
    }
  }
  return [...out];
}

/**
 * Previously "vegan"/"vegetarian"/"pork-free" account preferences were silently DROPPED
 * by `mapDietaryToAllergens` (explicitly skipped, never routed anywhere else) — a user
 * who set vegan as an account-level dietary restriction would see it vanish the moment
 * the generator resolved their session filters. This maps those specific values onto the
 * new `diets` toggle set instead of discarding them.
 */
export function mapDietaryToDiets(restrictions: string[]): SimplifiedDiet[] {
  const out = new Set<SimplifiedDiet>();
  for (const r of restrictions) {
    const key = r.toLowerCase().trim().replace(/[\s-]/g, "");
    if (key === "vegan") out.add("vegan");
    if (key === "porkfree" || key === "pork") out.add("porkFree");
  }
  return [...out];
}

/** Map the saved profile `nutrition_goal` (loose string in the DB) to a valid session value. */
export function mapProfileNutritionGoal(raw: string | null | undefined): NutritionGoal | null {
  if (!raw) return null;
  return (NUTRITION_GOAL_OPTIONS as readonly string[]).includes(raw) ? (raw as NutritionGoal) : null;
}

export function mapPreferredProtein(raw: string | undefined): SimplifiedProtein | null {
  if (!raw?.trim()) return null;
  const key = raw.toLowerCase().trim();
  if (key === "any" || key === "fish") return key === "fish" ? "seafood" : "surprise";
  return SIMPLIFIED_PROTEINS.includes(key as SimplifiedProtein)
    ? (key as SimplifiedProtein)
    : null;
}

export function parsePersonalPrefs(raw: unknown): GeneratorPersonalPrefs | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<GeneratorPersonalPrefs>;
  if (p.schemaVersion !== GENERATOR_PERSONAL_PREFS_SCHEMA) return null;
  const proteinRaw = String(p.protein ?? "");
  const protein =
    proteinRaw === "surprise"
      ? "surprise"
      : mapPreferredProtein(proteinRaw);
  if (!protein) return null;
  const healthiness = p.healthiness;
  if (healthiness !== "lean" && healthiness !== "balanced" && healthiness !== "comfort") return null;
  const allergens = Array.isArray(p.allergens)
    ? p.allergens.filter((a): a is SimplifiedAllergen =>
        SIMPLIFIED_ALLERGENS.includes(a as SimplifiedAllergen),
      )
    : [];
  const diets = Array.isArray(p.diets)
    ? p.diets.filter((d): d is SimplifiedDiet => SIMPLIFIED_DIETS.includes(d as SimplifiedDiet))
    : [];
  const foodsToAvoid = sanitizeFoodPreferenceKeys(
    Array.isArray(p.foodsToAvoid) ? p.foodsToAvoid.map(String) : [],
  );
  const crew_bucket =
    p.crew_bucket && CREW_SIZE_BUCKETS.includes(p.crew_bucket) ? p.crew_bucket : undefined;
  const nutrition_goal = mapProfileNutritionGoal(p.nutrition_goal) ?? undefined;
  return {
    schemaVersion: GENERATOR_PERSONAL_PREFS_SCHEMA,
    protein,
    healthiness,
    nutrition_goal,
    allergens,
    diets,
    foodsToAvoid,
    crew_bucket,
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : new Date().toISOString(),
  };
}

export function personalPrefsFromFilters(filters: SimplifiedGeneratorFilters): GeneratorPersonalPrefs {
  return {
    schemaVersion: GENERATOR_PERSONAL_PREFS_SCHEMA,
    protein: filters.protein,
    healthiness: filters.healthiness,
    nutrition_goal: filters.nutrition_goal,
    allergens: [...filters.allergens],
    diets: [...filters.diets],
    foodsToAvoid: [...filters.foodsToAvoid],
    crew_bucket: filters.crew_bucket,
    updatedAt: new Date().toISOString(),
  };
}

export interface ResolveGeneratorFiltersInput {
  personal: GeneratorPersonalPrefs | null;
  session: SimplifiedGeneratorFilters | null;
  preferences: UserPreferences | null;
  hall: Pick<HallRecord, "crew_size" | "appliances"> | null;
  hallLinked: boolean;
  localCrewSize?: number;
  /**
   * Signed-in user's saved account-level crew size (`user_profiles.crew_size`,
   * edited on /account — distinct from a linked hall's crew_size). Used as a
   * default only, one tier below an explicit hall link and any existing
   * personal/session choice, so it never overwrites something the user
   * already picked.
   */
  accountCrewSize?: number | null;
}

/** Merge hall, account, and personal defaults into tonight's generator state. */
export function resolveGeneratorFilters(input: ResolveGeneratorFiltersInput): SimplifiedGeneratorFilters {
  const base = createDefaultSimplifiedFilters();
  const session = input.session;
  const personal = input.personal;

  let filters: SimplifiedGeneratorFilters = {
    crew_bucket:
      personal?.crew_bucket ??
      (session?.crew_bucket && CREW_SIZE_BUCKETS.includes(session.crew_bucket)
        ? session.crew_bucket
        : input.accountCrewSize != null && input.accountCrewSize >= 2
          ? crewSizeToBucket(input.accountCrewSize)
          : input.localCrewSize
            ? crewSizeToBucket(input.localCrewSize)
            : base.crew_bucket),
    protein: personal?.protein ?? session?.protein ?? base.protein,
    appliances: session?.appliances?.length ? [...session.appliances] : base.appliances,
    // Precedence: this-device "remember my last pick" > current session > signed-in
    // saved profile default > generator default ("no preference"). Never mutates the
    // saved profile value itself — see PROFILE_NUTRITION_GOAL_OPTIONS. `healthiness`
    // mirrors whichever tier resolved `nutrition_goal` so the legacy 3-way scoring/
    // relaxation-message machinery (see generator-match.ts) always stays in sync with it.
    healthiness:
      personal?.healthiness ??
      session?.healthiness ??
      (mapProfileNutritionGoal(input.preferences?.nutrition_goal)
        ? nutritionGoalToHealthiness(mapProfileNutritionGoal(input.preferences?.nutrition_goal)!)
        : base.healthiness),
    nutrition_goal:
      personal?.nutrition_goal ??
      session?.nutrition_goal ??
      mapProfileNutritionGoal(input.preferences?.nutrition_goal) ??
      base.nutrition_goal,
    allergens:
      personal?.allergens?.length
        ? [...personal.allergens]
        : session?.allergens?.length
          ? [...session.allergens]
          : mapDietaryToAllergens(input.preferences?.dietary_restrictions ?? []),
    diets:
      personal?.diets?.length
        ? [...personal.diets]
        : session?.diets?.length
          ? [...session.diets]
          : mapDietaryToDiets(input.preferences?.dietary_restrictions ?? []),
    foodsToAvoid:
      personal?.foodsToAvoid?.length
        ? [...personal.foodsToAvoid]
        : session?.foodsToAvoid?.length
          ? [...session.foodsToAvoid]
          : sanitizeFoodPreferenceKeys(input.preferences?.excluded_ingredients ?? []),
    // Per-generation only — never saved to the account/device personal prefs above.
    personalizeWithHistory: session?.personalizeWithHistory ?? base.personalizeWithHistory,
  };

  const prefProtein = input.preferences?.preferred_proteins?.[0];
  const mappedPref = mapPreferredProtein(prefProtein);
  if (!personal && !session && mappedPref) {
    filters.protein = mappedPref;
  }

  if (!personal?.allergens?.length && !session?.allergens?.length) {
    const fromAccount = mapDietaryToAllergens(input.preferences?.dietary_restrictions ?? []);
    if (fromAccount.length) filters.allergens = fromAccount;
  }

  if (!personal?.diets?.length && !session?.diets?.length) {
    const fromAccount = mapDietaryToDiets(input.preferences?.dietary_restrictions ?? []);
    if (fromAccount.length) filters.diets = fromAccount;
  }

  if (!input.hallLinked && !session?.appliances?.length) {
    const fromProfile = mapProfileAppliancesToSimplified(
      input.preferences?.appliance_preferences ?? [],
    );
    if (fromProfile.length) filters.appliances = fromProfile;
  }

  if (input.hallLinked && input.hall) {
    if (input.hall.crew_size != null && input.hall.crew_size >= 2) {
      filters.crew_bucket = crewSizeToBucket(input.hall.crew_size);
    }
    filters.appliances = mapProfileAppliancesToSimplified(input.hall.appliances ?? []);
  }

  return filters;
}

export function isCompletePersonalPrefs(personal: GeneratorPersonalPrefs | null): boolean {
  return Boolean(personal?.protein && personal?.healthiness != null);
}
