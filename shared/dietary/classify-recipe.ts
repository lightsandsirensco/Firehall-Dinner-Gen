/**
 * Recipe dietary/allergen classification engine.
 *
 * Food-safety rule: if any ingredient cannot be confidently matched to a known
 * dietary profile, NO restrictive "free of X" or "vegetarian/vegan" claim is
 * made for the recipe — confidence drops to "low" and every filter flag comes
 * back false until a human reviews the unknown ingredient(s). A recipe is only
 * ever surfaced under a strict filter when confidence is "high".
 */
import { findDietaryProfile, TEXT_OVERRIDES, type IngredientDietaryProfile } from "./ingredient-database.js";

export interface DietaryIngredientInput {
  name: string;
  notes?: string;
}

export type AllergenKey = "gluten" | "dairy" | "egg" | "soy" | "treeNuts" | "peanuts" | "shellfish" | "fish" | "sesame" | "pork" | "alcohol";

const ALLERGEN_KEYS: AllergenKey[] = ["gluten", "dairy", "egg", "soy", "treeNuts", "peanuts", "shellfish", "fish", "sesame", "pork", "alcohol"];

export interface DietaryFlagResult {
  value: boolean;
  /** "high" only when every ingredient resolved to a known profile. */
  confidence: "high" | "low";
}

export interface AdaptableSuggestion {
  flag: "gluten" | "dairy" | "egg" | "soy" | "treeNuts" | "peanuts" | "pork" | "alcohol";
  label: string;
  note: string;
}

export interface UncertainIngredient {
  name: string;
  reason: string;
}

export interface FlaggedIngredient {
  name: string;
  allergens: AllergenKey[];
}

export interface RecipeDietaryProfile {
  confidence: "high" | "low";
  matchedCount: number;
  totalCount: number;
  uncertainIngredients: UncertainIngredient[];
  flaggedIngredients: FlaggedIngredient[];
  flags: {
    glutenFree: boolean;
    dairyFree: boolean;
    eggFree: boolean;
    nutFree: boolean;
    peanutFree: boolean;
    soyFree: boolean;
    shellfishFree: boolean;
    fishFree: boolean;
    porkFree: boolean;
    vegetarian: boolean;
    vegan: boolean;
  };
  /** Shown as "X Adaptable" badges — recipe is NOT flagged for that diet, but a known substitution would clear it. */
  adaptable: AdaptableSuggestion[];
}

const FLAG_TO_ALLERGEN: Record<keyof RecipeDietaryProfile["flags"], AllergenKey | null> = {
  glutenFree: "gluten",
  dairyFree: "dairy",
  eggFree: "egg",
  nutFree: "treeNuts",
  peanutFree: "peanuts",
  soyFree: "soy",
  shellfishFree: "shellfish",
  fishFree: "fish",
  porkFree: "pork",
  vegetarian: null,
  vegan: null,
};

const ADAPTABLE_LABELS: Record<string, string> = {
  gluten: "Gluten-Free Adaptable",
  dairy: "Dairy-Free Adaptable",
  egg: "Egg-Free Adaptable",
  soy: "Soy-Free Adaptable",
  treeNuts: "Nut-Free Adaptable",
  peanuts: "Peanut-Free Adaptable",
  pork: "Pork-Free Adaptable",
  alcohol: "Alcohol-Free Adaptable",
};

function applyOverrides(text: string, profile: IngredientDietaryProfile): Record<AllergenKey, boolean> {
  const flags: Record<AllergenKey, boolean> = {
    gluten: profile.gluten,
    dairy: profile.dairy,
    egg: profile.egg,
    soy: profile.soy,
    treeNuts: profile.treeNuts,
    peanuts: profile.peanuts,
    shellfish: profile.shellfish,
    fish: profile.fish,
    sesame: profile.sesame,
    pork: profile.pork,
    alcohol: profile.alcohol,
  };
  for (const override of TEXT_OVERRIDES) {
    if (override.pattern.test(text)) {
      flags[override.flag] = override.value;
    }
  }
  return flags;
}

/**
 * Honey is excluded from vegan diets by the common vegan definition even
 * though it doesn't trip any allergen flag — handled as a targeted text
 * check rather than folding it into the shared "sweetener" profile (which
 * also covers maple syrup / molasses, both vegan-safe).
 */
function mentionsHoney(text: string): boolean {
  return /\bhoney\b/i.test(text) && !/honeydew/i.test(text);
}

export function classifyRecipeDietary(ingredients: DietaryIngredientInput[]): RecipeDietaryProfile {
  const uncertainIngredients: UncertainIngredient[] = [];
  const flaggedIngredients: FlaggedIngredient[] = [];

  let hasUnknown = false;
  let hasMeat = false;
  let hasHoney = false;
  const anyAllergen: Record<AllergenKey, boolean> = {
    gluten: false, dairy: false, egg: false, soy: false, treeNuts: false,
    peanuts: false, shellfish: false, fish: false, sesame: false, pork: false, alcohol: false,
  };
  // Tracks, per allergen, whether every ingredient that trips it has a known substitution.
  const allViolationsSubstitutable: Record<AllergenKey, boolean> = {
    gluten: true, dairy: true, egg: true, soy: true, treeNuts: true,
    peanuts: true, shellfish: true, fish: true, sesame: true, pork: true, alcohol: true,
  };
  const substitutionNotes: Partial<Record<AllergenKey, Set<string>>> = {};

  const total = ingredients.length;
  let matched = 0;

  for (const ing of ingredients) {
    const text = `${ing.name} ${ing.notes ?? ""}`.trim();
    const profile = findDietaryProfile(text);
    if (!profile) {
      hasUnknown = true;
      uncertainIngredients.push({ name: ing.name, reason: "Not found in the canonical ingredient dietary database — cannot confirm allergen/diet status." });
      continue;
    }
    matched++;
    const flags = applyOverrides(text, profile);
    if (profile.meat) hasMeat = true;
    if (mentionsHoney(text)) hasHoney = true;

    const tripped: AllergenKey[] = [];
    for (const key of ALLERGEN_KEYS) {
      if (flags[key]) {
        tripped.push(key);
        anyAllergen[key] = true;
        const hasSub = Boolean(profile.substitutions && (profile.substitutions as Record<string, string>)[key]);
        if (!hasSub) {
          allViolationsSubstitutable[key] = false;
        } else {
          if (!substitutionNotes[key]) substitutionNotes[key] = new Set();
          substitutionNotes[key]!.add((profile.substitutions as Record<string, string>)[key]);
        }
      }
    }
    if (tripped.length > 0) {
      flaggedIngredients.push({ name: ing.name, allergens: tripped });
    }
  }

  const confidence: "high" | "low" = !hasUnknown && total > 0 ? "high" : "low";

  const flags: RecipeDietaryProfile["flags"] = {
    glutenFree: confidence === "high" && !anyAllergen.gluten,
    dairyFree: confidence === "high" && !anyAllergen.dairy,
    eggFree: confidence === "high" && !anyAllergen.egg,
    nutFree: confidence === "high" && !anyAllergen.treeNuts,
    peanutFree: confidence === "high" && !anyAllergen.peanuts,
    soyFree: confidence === "high" && !anyAllergen.soy,
    shellfishFree: confidence === "high" && !anyAllergen.shellfish,
    fishFree: confidence === "high" && !anyAllergen.fish,
    porkFree: confidence === "high" && !anyAllergen.pork,
    vegetarian: confidence === "high" && !hasMeat,
    vegan: confidence === "high" && !hasMeat && !anyAllergen.dairy && !anyAllergen.egg && !hasHoney,
  };

  const adaptable: AdaptableSuggestion[] = [];
  if (confidence === "high") {
    for (const key of ["gluten", "dairy", "egg", "soy", "treeNuts", "peanuts", "pork", "alcohol"] as const) {
      const flagName = (Object.keys(FLAG_TO_ALLERGEN) as Array<keyof RecipeDietaryProfile["flags"]>).find((f) => FLAG_TO_ALLERGEN[f] === key);
      const isFreeAlready = flagName ? flags[flagName] : false;
      if (anyAllergen[key] && allViolationsSubstitutable[key] && !isFreeAlready) {
        const notes = substitutionNotes[key];
        adaptable.push({
          flag: key,
          label: ADAPTABLE_LABELS[key],
          note: notes ? [...notes].join(" ") : "A substitution can remove this allergen.",
        });
      }
    }
  }

  return {
    confidence,
    matchedCount: matched,
    totalCount: total,
    uncertainIngredients,
    flaggedIngredients,
    flags,
    adaptable,
  };
}
