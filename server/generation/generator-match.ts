/**
 * Simplified generator matching — hard filters (allergies, protein, appliances)
 * and soft scoring (crew size, healthiness, quality).
 */

import type { GenerateRequest } from "../../shared/schema.js";
import type { CuratedRecipe } from "../../shared/curated-recipe/types.js";
import type { EquipmentKind, NutritionCategory } from "../../shared/curated-recipe/metadata/taxonomy.js";
import { scanRecipeForAllergens } from "../allergens.js";
import { proteinMatchesFilter } from "../spoonacular-converter.js";
import { getCuratedRecipeBySlug } from "../curated-recipe-store.js";
import {
  SIMPLIFIED_APPLIANCE_IDS,
  healthinessRelaxationMessage,
  type HealthinessPreference,
} from "../../shared/generator-simplified.js";

/** Default equipment assumed when recipe metadata is missing */
const DEFAULT_RECIPE_EQUIPMENT: EquipmentKind[] = ["skillet", "oven"];

/** Equipment kinds considered available when user selects no appliances */
const ALL_COMMON_EQUIPMENT: EquipmentKind[] = [
  "skillet",
  "sheet_pan",
  "grill",
  "smoker",
  "slow_cooker",
  "instant_pot",
  "oven",
  "air_fryer",
  "one_pot",
  "dutch_oven",
  "stockpot",
];

/** Which UI / legacy appliance tokens satisfy each equipment kind */
const EQUIPMENT_SATISFIERS: Record<EquipmentKind, readonly string[]> = {
  grill: ["bbq", "smoker", "flat_top", "grill"],
  smoker: ["smoker", "grill"],
  oven: ["oven"],
  sheet_pan: ["oven"],
  skillet: ["stovetop", "flat_top", "stove", "skillet"],
  slow_cooker: ["slow_cooker", "slow cooker"],
  instant_pot: ["instant pot", "instant_pot"],
  air_fryer: ["air_fryer", "air fryer"],
  one_pot: ["stovetop", "stove", "slow_cooker", "slow cooker", "instant pot"],
  dutch_oven: ["oven", "stovetop", "stove"],
  stockpot: ["stovetop", "stove"],
  none: [],
};

const HEALTHINESS_MATCH: Record<HealthinessPreference, readonly NutritionCategory[]> = {
  comfort: ["comfort", "indulgent"],
  balanced: ["balanced", "high_protein"],
  lean: ["lighter", "vegetarian_friendly", "high_protein"],
};

export interface RecipeMetadataGap {
  slug: string;
  title: string;
  missing: string[];
}

export interface HardFilterResult {
  ok: boolean;
  reason?: "protein" | "allergen" | "appliance" | "hydrate";
  detail?: string;
}

function normalizeApplianceTokens(appliances: string[]): string[] {
  const tokens = new Set<string>();
  for (const a of appliances) {
    const lower = a.toLowerCase().trim().replace(/\s+/g, "_");
    tokens.add(lower);
    tokens.add(lower.replace(/_/g, " "));
    if (lower === "stove" || lower === "stovetop") {
      tokens.add("stovetop");
      tokens.add("stove");
    }
    if (lower === "grill") tokens.add("bbq");
    if (lower === "slow_cooker" || lower === "slow cooker") {
      tokens.add("slow_cooker");
      tokens.add("slow cooker");
    }
    if (lower === "air_fryer" || lower === "air fryer") {
      tokens.add("air_fryer");
      tokens.add("air fryer");
    }
  }
  for (const id of SIMPLIFIED_APPLIANCE_IDS) tokens.add(id);
  return [...tokens];
}

function userSelectedSpecificAppliances(appliances: string[]): boolean {
  const normalized = normalizeApplianceTokens(appliances);
  const allCommonRequest = [
    "stove",
    "oven",
    "grill",
    "slow cooker",
    "air fryer",
    "smoker",
    "instant pot",
  ];
  if (appliances.length === 0) return false;
  if (appliances.length >= 7) {
    const set = new Set(normalized);
    if (allCommonRequest.every((a) => set.has(a) || set.has(a.replace(" ", "_")))) {
      return false;
    }
  }
  return true;
}

export function getRecipeEquipment(recipe: CuratedRecipe): EquipmentKind[] {
  const eq = recipe.metadata?.equipment;
  if (!eq || eq.length === 0) return DEFAULT_RECIPE_EQUIPMENT;
  const filtered = eq.filter((e) => e !== "none");
  return filtered.length > 0 ? filtered : DEFAULT_RECIPE_EQUIPMENT;
}

export function recipeMatchesAppliances(recipe: CuratedRecipe, requestAppliances: string[]): boolean {
  if (!userSelectedSpecificAppliances(requestAppliances)) return true;

  const available = normalizeApplianceTokens(requestAppliances);
  const required = getRecipeEquipment(recipe);

  return required.every((kind) => {
    const satisfiers = EQUIPMENT_SATISFIERS[kind] ?? [kind];
    return satisfiers.some((s) => available.includes(s));
  });
}

export function recipeMatchesAllergens(
  recipe: CuratedRecipe,
  allergens: string[],
): boolean {
  if (!allergens.length) return true;
  const ingredients = (recipe.ingredients || []).map((i) => ({
    item: i.name || i.originalText,
    amount: String(i.amount ?? ""),
    notes: i.category,
  }));
  const steps = (recipe.instructions || []).map((s) => ({
    heading: s.heading,
    body: s.body,
  }));
  const scan = scanRecipeForAllergens(ingredients, steps, recipe.title, allergens);
  return !scan.found;
}

export function recipeMatchesCrew(recipe: CuratedRecipe, crewSize: number): boolean {
  const meta = recipe.metadata?.crewSize;
  if (!meta) return true;
  return crewSize >= meta.minCrew && crewSize <= meta.maxCrew;
}

export function recipeMatchesProtein(recipe: CuratedRecipe, request: GenerateRequest): boolean {
  const selected = request.protein || "any";
  if (selected === "any") return true;
  return proteinMatchesFilter(recipe.protein, selected);
}

export function recipePassesHardFilters(
  recipe: CuratedRecipe,
  request: GenerateRequest,
): HardFilterResult {
  if (!recipeMatchesProtein(recipe, request)) {
    return { ok: false, reason: "protein", detail: recipe.protein };
  }
  if (!recipeMatchesAppliances(recipe, request.appliances || [])) {
    return { ok: false, reason: "appliance", detail: getRecipeEquipment(recipe).join("+") };
  }
  const allergens = request.allergens_to_avoid || [];
  if (!recipeMatchesAllergens(recipe, allergens)) {
    return { ok: false, reason: "allergen" };
  }
  return { ok: true };
}

export function scoreHealthinessPreference(
  preference: HealthinessPreference,
  recipe: CuratedRecipe,
): number {
  const cat = recipe.metadata?.nutritionCategory;
  const comfort = recipe.scores?.comfort ?? 0;
  const healthy = recipe.scores?.healthy ?? 0;

  if (cat && HEALTHINESS_MATCH[preference].includes(cat)) return 25;

  if (preference === "comfort") return Math.round(comfort / 4);
  if (preference === "lean") return Math.round(healthy / 4);
  return Math.round((comfort + healthy) / 8);
}

export function scoreCrewFit(recipe: CuratedRecipe, crewSize: number): number {
  const meta = recipe.metadata?.crewSize;
  if (!meta) return 0;
  if (crewSize >= meta.minCrew && crewSize <= meta.maxCrew) return 20;
  if (crewSize >= meta.minCrew - 2 && crewSize <= meta.maxCrew + 4) return 6;
  return -15;
}

export function inferServedHealthiness(recipe: CuratedRecipe): HealthinessPreference {
  const cat = recipe.metadata?.nutritionCategory;
  if (cat && HEALTHINESS_MATCH.comfort.includes(cat)) return "comfort";
  if (cat && HEALTHINESS_MATCH.lean.includes(cat)) return "lean";
  if ((recipe.scores?.healthy ?? 0) > (recipe.scores?.comfort ?? 0) + 15) return "lean";
  if ((recipe.scores?.comfort ?? 0) > (recipe.scores?.healthy ?? 0) + 15) return "comfort";
  return "balanced";
}

const API_PROTEIN_LABELS: Record<string, string> = {
  chicken: "Chicken",
  beef: "Beef",
  pork: "Pork",
  turkey: "Turkey",
  seafood: "Seafood",
  fish: "Seafood",
  vegetarian: "Vegetarian",
  any: "meals",
};

export function buildRelaxationNote(
  request: GenerateRequest,
  servedRecipe: CuratedRecipe,
): string | null {
  const requested = request.healthiness_preference || "balanced";
  const served = inferServedHealthiness(servedRecipe);
  const proteinLabel =
    request.protein === "any"
      ? "meals"
      : (API_PROTEIN_LABELS[request.protein] ?? request.protein);
  return healthinessRelaxationMessage(requested, served, proteinLabel);
}

export function auditRecipeMetadata(slug: string): RecipeMetadataGap | null {
  const recipe = getCuratedRecipeBySlug(slug);
  if (!recipe) return null;
  const missing: string[] = [];
  if (!recipe.metadata?.equipment?.length) missing.push("equipment");
  if (!recipe.metadata?.nutritionCategory) missing.push("nutritionCategory");
  if (!recipe.metadata?.crewSize) missing.push("crewSize");
  if (!recipe.protein) missing.push("protein");
  if (missing.length === 0) return null;
  return { slug, title: recipe.title, missing };
}

export function listCatalogMetadataGaps(slugs: string[]): RecipeMetadataGap[] {
  const gaps: RecipeMetadataGap[] = [];
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const gap = auditRecipeMetadata(slug);
    if (gap) gaps.push(gap);
  }
  return gaps.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Exported for QA — all equipment kinds when no appliance constraint */
export { ALL_COMMON_EQUIPMENT };
