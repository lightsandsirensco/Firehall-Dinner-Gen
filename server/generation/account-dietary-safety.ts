/**
 * Saved allergies and dietary restrictions are enforced server-side for every
 * signed-in generation (Pick Tonight, emergency fallbacks, Shift Planner).
 *
 * They are unioned into the request, never replaced by it: a device that still
 * has old generator chips, or a client that sends nothing, cannot drop them.
 * Free for everyone — this is safety, not a Pro preference (Foods to Avoid is
 * the separate, Pro-gated taste preference).
 */
import { pgOne } from "../db/pg-sql.js";
import { DIETARY_FILTER_KEYS, type DietaryFilterKey } from "../../shared/dietary/schema.js";

export interface AccountSafetyRestrictions {
  /** Keys understood by server/allergens.ts scanRecipeForAllergens. */
  allergens: string[];
  /** Canonical classifier flags (shared/dietary/classify-recipe.ts). */
  dietary: DietaryFilterKey[];
}

/** PROFILE_ALLERGY_OPTIONS → scanner key + canonical classifier flag (none for sesame). */
const ALLERGY_MAP: Record<string, { allergen: string; dietary: DietaryFilterKey | null }> = {
  peanuts: { allergen: "peanut", dietary: "peanutFree" },
  tree_nuts: { allergen: "tree_nuts", dietary: "nutFree" },
  shellfish: { allergen: "shellfish", dietary: "shellfishFree" },
  dairy: { allergen: "dairy", dietary: "dairyFree" },
  eggs: { allergen: "eggs", dietary: "eggFree" },
  soy: { allergen: "soy", dietary: "soyFree" },
  gluten: { allergen: "gluten", dietary: "glutenFree" },
  sesame: { allergen: "sesame", dietary: null },
};

/** PROFILE_DIETARY_OPTIONS → scanner keys + classifier flags. "nuts" covers peanuts and tree nuts. */
const DIETARY_MAP: Record<string, { allergens: string[]; dietary: DietaryFilterKey[] }> = {
  gluten: { allergens: ["gluten"], dietary: ["glutenFree"] },
  dairy: { allergens: ["dairy"], dietary: ["dairyFree"] },
  nuts: { allergens: ["nuts"], dietary: ["nutFree", "peanutFree"] },
  shellfish: { allergens: ["shellfish"], dietary: ["shellfishFree"] },
  eggs: { allergens: ["eggs"], dietary: ["eggFree"] },
  soy: { allergens: ["soy"], dietary: ["soyFree"] },
  vegetarian: { allergens: [], dietary: ["vegetarian"] },
  vegan: { allergens: [], dietary: ["vegan"] },
};

const MAX_ALLERGENS = 12;

function parseList(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function accountSafetyFromPreferences(allergies: string[], dietaryRestrictions: string[]): AccountSafetyRestrictions {
  const allergens = new Set<string>();
  const dietary = new Set<DietaryFilterKey>();
  for (const raw of allergies) {
    const m = ALLERGY_MAP[raw.toLowerCase().trim()];
    if (!m) continue;
    allergens.add(m.allergen);
    if (m.dietary) dietary.add(m.dietary);
  }
  for (const raw of dietaryRestrictions) {
    const m = DIETARY_MAP[raw.toLowerCase().trim()];
    if (!m) continue;
    m.allergens.forEach((a) => allergens.add(a));
    m.dietary.forEach((d) => dietary.add(d));
  }
  return { allergens: [...allergens], dietary: [...dietary] };
}

export async function loadAccountSafetyRestrictions(userId: string): Promise<AccountSafetyRestrictions> {
  const row = await pgOne<{ allergies_json: string | null; dietary_restrictions_json: string | null }>(
    `SELECT allergies_json, dietary_restrictions_json FROM user_preferences WHERE user_id = $1`,
    [userId],
  );
  return accountSafetyFromPreferences(parseList(row?.allergies_json), parseList(row?.dietary_restrictions_json));
}

/**
 * Returns a copy of a raw /api/generate-style body with account restrictions
 * unioned in. Account entries come first so a client-sent list can never push
 * them past the schema's length cap.
 */
export function mergeAccountSafetyIntoBody<T>(body: T, safety: AccountSafetyRestrictions): T {
  if (safety.allergens.length === 0 && safety.dietary.length === 0) return body;
  const src = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const clientAllergens = Array.isArray(src.allergens_to_avoid)
    ? src.allergens_to_avoid.filter((a): a is string => typeof a === "string")
    : [];
  const clientDietary = Array.isArray(src.dietary_restrictions)
    ? src.dietary_restrictions.filter((d): d is DietaryFilterKey => (DIETARY_FILTER_KEYS as readonly string[]).includes(d as string))
    : [];
  return {
    ...src,
    allergens_to_avoid: [...new Set([...safety.allergens, ...clientAllergens])].slice(0, MAX_ALLERGENS),
    dietary_restrictions: [...new Set([...safety.dietary, ...clientDietary])],
  } as T;
}
