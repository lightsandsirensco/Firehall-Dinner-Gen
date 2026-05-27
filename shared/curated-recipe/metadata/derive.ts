import type { CuratedRecipeInsert } from "../types.js";
import type { GenerateResponse } from "../../schema.js";
import type { CuratedRecipeMetadata, CuratedRecipeMetadataOverrides } from "./types.js";
import {
  type CookTimeBucket,
  type CrewSizeBucket,
  type DifficultyLevel,
  type EquipmentKind,
  type HallTestedStatus,
  type LeftoversQuality,
  type MealStyle,
  METADATA_SCHEMA_VERSION,
  type NutritionCategory,
} from "./taxonomy.js";
import { normalizeCuisineKind, normalizeProteinKind } from "./normalize.js";
import { curatedRecipeMetadataSchema } from "./schema.js";

export interface MetadataDeriveInput {
  protein: string;
  cuisine: string;
  totalMinutes: number;
  prepMinutes?: number;
  cookMinutes?: number;
  servingsBase: number;
  cleanupDifficulty: 1 | 2 | 3 | 4 | 5;
  featured?: boolean;
  tags?: string[];
  categories?: string[];
  mealFormat?: string;
  mealArchetype?: string;
  sourceKind?: string;
  steps?: Array<{ heading?: string; body: string }>;
  generateResponse?: GenerateResponse | null;
  /** Existing overrides from DB */
  overrides?: CuratedRecipeMetadataOverrides;
}

export function cookTimeBucketFromMinutes(totalMinutes: number): CookTimeBucket {
  const m = Math.max(0, totalMinutes);
  if (m <= 30) return "under_30";
  if (m <= 45) return "thirty_to_45";
  if (m <= 60) return "fortyfive_to_60";
  return "over_60";
}

export function crewSizeBucketFromServings(servings: number): CrewSizeBucket {
  const s = Math.max(1, servings);
  if (s <= 6) return "small_4_6";
  if (s <= 8) return "standard_6_8";
  if (s <= 12) return "large_8_12";
  return "banquet_12_plus";
}

export function crewRangeFromBucket(bucket: CrewSizeBucket): { minCrew: number; maxCrew: number } {
  switch (bucket) {
    case "small_4_6":
      return { minCrew: 4, maxCrew: 6 };
    case "standard_6_8":
      return { minCrew: 6, maxCrew: 8 };
    case "large_8_12":
      return { minCrew: 8, maxCrew: 12 };
    case "banquet_12_plus":
      return { minCrew: 12, maxCrew: 24 };
  }
}

export function difficultyFromRecipe(input: {
  totalMinutes: number;
  cleanupDifficulty: number;
  stepCount: number;
}): DifficultyLevel {
  if (input.cleanupDifficulty >= 4 || input.totalMinutes > 75 || input.stepCount >= 10) return "hard";
  if (input.cleanupDifficulty <= 2 && input.totalMinutes <= 35 && input.stepCount <= 6) return "easy";
  return "medium";
}

const EQUIPMENT_PATTERNS: Array<{ kind: EquipmentKind; re: RegExp }> = [
  { kind: "grill", re: /\bgrill(ed|ing)?\b/i },
  { kind: "smoker", re: /\bsmok(e|ed|er)\b/i },
  { kind: "slow_cooker", re: /\bslow\s*cook|crock\s*pot\b/i },
  { kind: "instant_pot", re: /\binstant\s*pot|pressure\s*cook/i },
  { kind: "air_fryer", re: /\bair\s*fry/i },
  { kind: "sheet_pan", re: /\bsheet\s*pan\b/i },
  { kind: "dutch_oven", re: /\bdutch\s*oven\b/i },
  { kind: "one_pot", re: /\bone\s*pot|single\s*pot\b/i },
  { kind: "skillet", re: /\bskillet|cast\s*iron\s*pan\b/i },
  { kind: "oven", re: /\boven\b|\b400°|\b425°|\bbake\b/i },
  { kind: "stockpot", re: /\bstock\s*pot|large\s*pot\b/i },
];

export function inferEquipmentFromText(text: string): EquipmentKind[] {
  const found = new Set<EquipmentKind>();
  for (const { kind, re } of EQUIPMENT_PATTERNS) {
    if (re.test(text)) found.add(kind);
  }
  if (found.size === 0) found.add("none");
  return [...found];
}

export function inferMealStyle(input: MetadataDeriveInput): MealStyle {
  const o = input.overrides?.mealStyle;
  if (o) return o;
  const grStyle = input.generateResponse?.meal_style?.toLowerCase();
  if (grStyle?.includes("comfort")) return "comfort";
  if (grStyle?.includes("performance") || grStyle?.includes("protein")) return "performance";
  const hay = `${input.mealFormat} ${input.mealArchetype} ${(input.tags || []).join(" ")}`.toLowerCase();
  if (/game\s*day|tailgate|wings|slider/.test(hay)) return "game_day";
  if (/shift|night|late/.test(hay)) return "shift_night";
  if (/healthy|lean|salmon|grilled/.test(hay)) return "healthy";
  if (/budget|cheap|feeds/.test(hay)) return "budget";
  if (/hearty|chili|stew|casserole/.test(hay)) return "hearty";
  if (/comfort|mac|cheese|meatloaf/.test(hay)) return "comfort";
  return "classic";
}

export function inferNutritionCategory(input: MetadataDeriveInput): NutritionCategory {
  const o = input.overrides?.nutritionCategory;
  if (o) return o;
  const protein = normalizeProteinKind(input.protein);
  if (protein === "vegetarian" || protein === "vegan") return "vegetarian_friendly";
  const macros = input.generateResponse?.macros_per_serving;
  const tags = (input.tags || []).join(" ").toLowerCase();
  if (input.generateResponse?.tags?.high_protein || /high[\s-]?protein/.test(tags)) return "high_protein";
  if (macros && macros.protein_g >= 35) return "high_protein";
  if (/mac\s*and\s*cheese|fried|bacon|cheeseburger|pizza/.test(tags)) return "indulgent";
  if (input.generateResponse?.tags?.high_fiber || /salad|grilled|lean/.test(tags)) return "lighter";
  if (inferMealStyle(input) === "comfort") return "comfort";
  return "balanced";
}

export function inferLeftoversQuality(input: MetadataDeriveInput): LeftoversQuality {
  const o = input.overrides?.leftoversQuality;
  if (o) return o;
  const plating = (input.generateResponse as { plating?: { leftovers?: string } } | undefined)?.plating
    ?.leftovers;
  const hay = `${plating || ""} ${(input.tags || []).join(" ")}`.toLowerCase();
  if (/meal\s*prep|batch|freezer|reheat/.test(hay)) return "meal_prep";
  if (/excellent|great\s*next\s*day|better\s*next/.test(hay)) return "excellent";
  if (/good\s*leftover|holds\s*well/.test(hay)) return "good";
  if (/poor|doesn't\s*keep|eat\s*fresh/.test(hay)) return "poor";
  if (input.totalMinutes >= 50 && input.servingsBase >= 8) return "good";
  return "fair";
}

export function inferHallTested(input: MetadataDeriveInput): HallTestedStatus {
  const o = input.overrides?.hallTested;
  if (o) return o;
  const tags = (input.tags || []).map((t) => t.toLowerCase());
  if (tags.some((t) => t.includes("golden_100") || t === "golden100" || t === "golden")) {
    return "hall_approved";
  }
  if (input.sourceKind === "hall_classic" || input.sourceKind === "partner") return "hall_approved";
  if (input.generateResponse?.hall_curated) return "field_tested";
  return "not_tested";
}

export function inferBusyNightSuitable(input: MetadataDeriveInput): boolean {
  if (input.overrides?.busyNightSuitable != null) return input.overrides.busyNightSuitable;
  const stepCount = input.steps?.length ?? 0;
  return input.totalMinutes <= 45 && input.cleanupDifficulty <= 3 && stepCount <= 8;
}

export function deriveCuratedRecipeMetadata(input: MetadataDeriveInput): CuratedRecipeMetadata {
  const stepCount = input.steps?.length ?? 0;
  const stepText = (input.steps || []).map((s) => `${s.heading || ""} ${s.body}`).join(" ");

  const protein = input.overrides?.protein ?? normalizeProteinKind(input.protein);
  const cuisine = input.overrides?.cuisine ?? normalizeCuisineKind(input.cuisine);
  const cleanupDifficulty = (input.overrides?.cleanupDifficulty ??
    input.cleanupDifficulty) as CuratedRecipeMetadata["cleanupDifficulty"];
  const difficulty =
    input.overrides?.difficulty ??
    difficultyFromRecipe({ totalMinutes: input.totalMinutes, cleanupDifficulty, stepCount });
  const cookTimeBucket =
    input.overrides?.cookTimeBucket ?? cookTimeBucketFromMinutes(input.totalMinutes);
  const crewBucket =
    input.overrides?.crewSizeBucket ?? crewSizeBucketFromServings(input.servingsBase);
  const crewRange = crewRangeFromBucket(crewBucket);
  const equipment =
    input.overrides?.equipment ??
    inferEquipmentFromText(`${stepText} ${input.mealFormat || ""} ${input.mealArchetype || ""}`);

  const meta: CuratedRecipeMetadata = {
    schemaVersion: METADATA_SCHEMA_VERSION,
    protein,
    cuisine,
    difficulty,
    cleanupDifficulty,
    cookTimeBucket,
    totalMinutes: input.totalMinutes,
    equipment,
    crewSize: {
      bucket: crewBucket,
      servingsBase: input.servingsBase,
      minCrew: crewRange.minCrew,
      maxCrew: crewRange.maxCrew,
    },
    leftoversQuality: inferLeftoversQuality(input),
    hallTested: inferHallTested(input),
    featured: input.overrides?.featured ?? Boolean(input.featured),
    busyNightSuitable: inferBusyNightSuitable(input),
    mealStyle: inferMealStyle(input),
    nutritionCategory: inferNutritionCategory(input),
    overrides: input.overrides,
    updatedAt: new Date().toISOString(),
  };

  curatedRecipeMetadataSchema.parse(meta);
  return meta;
}

/** Convenience wrapper from insert payload */
export function deriveMetadataFromCuratedInsert(
  insert: CuratedRecipeInsert,
  overrides?: CuratedRecipeMetadataOverrides,
): CuratedRecipeMetadata {
  return deriveCuratedRecipeMetadata({
    protein: insert.protein,
    cuisine: insert.cuisine,
    totalMinutes: insert.totalMinutes,
    prepMinutes: insert.prepMinutes,
    cookMinutes: insert.cookMinutes,
    servingsBase: insert.servingsBase,
    cleanupDifficulty: insert.cleanupDifficulty,
    featured: insert.featured,
    tags: insert.tags,
    categories: insert.categories,
    mealFormat: insert.mealFormat,
    mealArchetype: insert.mealArchetype,
    sourceKind: insert.source.kind,
    steps: insert.instructions?.map((s) => ({ heading: s.heading, body: s.body })),
    generateResponse: insert.generateResponse ?? null,
    overrides: overrides ?? insert.metadata?.overrides,
  });
}
