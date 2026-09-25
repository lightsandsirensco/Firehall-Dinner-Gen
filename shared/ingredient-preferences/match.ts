/**
 * Deterministic "Foods to Avoid" ingredient matcher.
 *
 * Independent from shared/dietary/ingredient-database.ts (never imports or
 * modifies it) but follows the same longest-keyword-wins, exception-aware
 * matching pattern already proven there. No AI/LLM/external API — pure
 * substring/word-boundary matching over the recipe's own ingredient text.
 */
import { FOOD_PREFERENCE_DEFINITIONS, type FoodPreferenceDefinition } from "./definitions.js";

export interface AvoidIngredientInput {
  name: string;
  notes?: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalize(value: string): string {
  return stripDiacritics(value.toLowerCase())
    .replace(/[^a-z0-9\s,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface KeywordCandidate {
  keyword: string;
  isException: boolean;
}

/**
 * Does a single ingredient line (name + notes) match this preference?
 * Uses the same masking longest-match algorithm as the dietary system: at
 * each step, the single longest remaining keyword (from either `matches` or
 * `exceptions`) wins and is masked out. A preference only counts as matched
 * if at least one non-exception keyword wins at some position — an
 * exception keyword winning at the only position that keyword could occupy
 * (e.g. "onion powder" swallowing the "onion" substring) correctly
 * suppresses the match, while a real separate mention elsewhere in the same
 * text still matches (see scripts/test-ingredient-preferences.ts).
 */
export function textMatchesFoodPreference(text: string, def: FoodPreferenceDefinition): boolean {
  const normalized = normalize(text);
  if (!normalized) return false;

  const pool: KeywordCandidate[] = [
    ...def.matches.map((keyword) => ({ keyword, isException: false })),
    ...(def.exceptions ?? []).map((keyword) => ({ keyword, isException: true })),
  ];

  let working = normalized;
  let matchedNonException = false;

  // Bounded — a well-formed ingredient line has only a handful of distinct phrases.
  for (let iteration = 0; iteration < 8; iteration++) {
    let best: { keyword: string; isException: boolean; index: number; span: number } | null = null;

    for (const candidate of pool) {
      const kwNormalized = normalize(candidate.keyword);
      if (!kwNormalized) continue;
      const re = new RegExp(`\\b${escapeRegex(kwNormalized)}(?:es|s)?\\b`, "i");
      const match = re.exec(working);
      if (match && (!best || candidate.keyword.length > best.keyword.length)) {
        best = {
          keyword: candidate.keyword,
          isException: candidate.isException,
          index: match.index,
          span: match[0].length,
        };
      }
    }

    if (!best) break;
    if (!best.isException) matchedNonException = true;
    working = working.slice(0, best.index) + " ".repeat(best.span) + working.slice(best.index + best.span);
  }

  return matchedNonException;
}

/** Does this recipe's ingredient list match the given preference (any ingredient line)? */
export function recipeMatchesFoodPreference(
  ingredients: AvoidIngredientInput[],
  def: FoodPreferenceDefinition,
): boolean {
  return ingredients.some((ing) => textMatchesFoodPreference(`${ing.name} ${ing.notes ?? ""}`.trim(), def));
}

/** Computes the full set of matched "Foods to Avoid" keys for a recipe's ingredient list. */
export function computeAvoidTags(
  ingredients: AvoidIngredientInput[],
  definitions: readonly FoodPreferenceDefinition[] = FOOD_PREFERENCE_DEFINITIONS,
): string[] {
  const tags: string[] = [];
  for (const def of definitions) {
    if (recipeMatchesFoodPreference(ingredients, def)) tags.push(def.key);
  }
  return tags;
}

/** True if this recipe's precomputed avoidTags intersect any of the user's avoided preference keys. */
export function recipeHasAnyAvoidedTag(avoidTags: readonly string[] | undefined, avoided: readonly string[]): boolean {
  if (!avoidTags || avoidTags.length === 0 || avoided.length === 0) return false;
  const tagSet = new Set(avoidTags);
  return avoided.some((key) => tagSet.has(key));
}
