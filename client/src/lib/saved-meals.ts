/**
 * Canonical personal favourites store ("Saved meals").
 *
 * Device copy lives in `firehall_saved_meals`; signed-in users sync it to
 * Postgres `user_saved_recipes` via /api/auth/saves (see lib/sync/coordinator).
 * Every Save / Pin / Favourite button writes here. Catalog recipes are keyed
 * `catalog:<slug>`; generated / Explore recipes use a title+ingredient key.
 *
 * Hall Classics (lib/hall-favorites-store) is a read projection of the
 * catalog entries in this store — not a second favourites system.
 */
import type { ClientRecipeResponse } from "@shared/schema";

const STORAGE_KEY = "firehall_saved_meals";
const TOMBSTONE_KEY = "firehall_saved_meals_removed_v1";
const MAX_TOMBSTONES = 500;

export const SAVED_MEALS_CHANGED_EVENT = "favorites-changed";
/** Hall Classics surfaces listen for this; fired on every saved-meal change. */
export const HALL_FAVORITES_CHANGED_EVENT = "hall-favorites-changed";

export interface SavedMeal {
  id: string;
  savedAt: string;
  recipe: ClientRecipeResponse;
  /** Local-only hint for catalog saves; consumers fall back to the catalog path. */
  recipePath?: string;
  source?: string;
}

function generateId(recipe: ClientRecipeResponse): string {
  const ingredientKey = (recipe.ingredients ?? [])
    .slice(0, 5)
    .map((i) => i.name.toLowerCase().trim())
    .sort()
    .join("|");
  return `${recipe.title.toLowerCase().trim()}::${ingredientKey}`;
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function catalogSavedMealId(slug: string): string {
  return `catalog:${normalizeSlug(slug)}`;
}

/** The one id rule used by save, lookup, and remove. */
export function savedMealId(recipe: ClientRecipeResponse): string {
  return recipe._slug ? catalogSavedMealId(recipe._slug) : generateId(recipe);
}

function isSavedMeal(value: unknown): value is SavedMeal {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<SavedMeal>;
  return (
    typeof m.id === "string" &&
    m.id.length > 0 &&
    typeof m.savedAt === "string" &&
    !!m.recipe &&
    typeof m.recipe === "object" &&
    typeof (m.recipe as { title?: unknown }).title === "string"
  );
}

function dispatchChanged(): void {
  window.dispatchEvent(new Event(SAVED_MEALS_CHANGED_EVENT));
  window.dispatchEvent(new Event(HALL_FAVORITES_CHANGED_EVENT));
}

export function getSavedMeals(): SavedMeal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedMeal);
  } catch {
    return [];
  }
}

/** Replaces the whole device copy (cloud sync apply path). */
export function writeSavedMeals(meals: SavedMeal[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
    dispatchChanged();
  } catch {
    /* quota / private mode */
  }
}

/** id → ISO time the user removed it. Lets sync drop stale copies instead of resurrecting them. */
export function getSavedMealTombstones(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TOMBSTONE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function recordTombstone(id: string): void {
  try {
    const next = { ...getSavedMealTombstones(), [id]: new Date().toISOString() };
    const trimmed = Object.entries(next)
      .sort((a, b) => b[1].localeCompare(a[1]))
      .slice(0, MAX_TOMBSTONES);
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(Object.fromEntries(trimmed)));
  } catch {
    /* ignore */
  }
}

export function getSavedCount(): number {
  return getSavedMeals().length;
}

export function isMealSaved(recipe: ClientRecipeResponse): boolean {
  const id = savedMealId(recipe);
  return getSavedMeals().some((m) => m.id === id);
}

export function isCatalogMealSaved(slug: string): boolean {
  const id = catalogSavedMealId(slug);
  return getSavedMeals().some((m) => m.id === id);
}

export type SaveMealResult = { saved: boolean; duplicate: boolean };

function insertSavedMeal(entry: SavedMeal, notify = true): SaveMealResult {
  const existing = getSavedMeals();
  if (existing.some((m) => m.id === entry.id)) {
    return { saved: false, duplicate: true };
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...existing]));
  } catch {
    return { saved: false, duplicate: false };
  }
  if (notify) {
    dispatchChanged();
    window.dispatchEvent(new CustomEvent("firehall-meal-saved", { detail: { id: entry.id } }));
  }
  return { saved: true, duplicate: false };
}

export function saveMeal(recipe: ClientRecipeResponse): SaveMealResult {
  return insertSavedMeal({
    id: savedMealId(recipe),
    savedAt: new Date().toISOString(),
    recipe,
  });
}

/**
 * Minimal recipe payload for catalog saves made from surfaces that only know
 * slug + title (wheel, dashboards, recipe pages). The catalog page is always
 * the source of truth for content; this exists so the row is a valid
 * ClientRecipeResponse for sync and listing.
 */
export function catalogSavedMealStub(slug: string, title: string): ClientRecipeResponse {
  return {
    title: title.trim(),
    meal_format: "plated_main",
    servings: 0,
    tags: [],
    timing: { prep_min: 0, cook_min: 0, total_min: 0 },
    protein_safety: { protein: "", internal_temp_f: 0, rest_min: 0, notes: "" },
    ingredients: [],
    steps: [],
    plating: { serve_style: "", assembly_instructions: "", optional_toppings: [] },
    macros_per_serving: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    chosen_protein: "",
    primary_protein_source: "",
    why_it_fits_tonight: "",
    cleanup_tip: "",
    hall_curated: true,
    _slug: normalizeSlug(slug),
    _source: "catalog",
  };
}

export function saveCatalogMeal(
  input: {
    slug: string;
    title: string;
    recipePath?: string;
    source?: string;
    savedAt?: string;
    recipe?: ClientRecipeResponse;
  },
  options: { notify?: boolean } = {},
): SaveMealResult {
  const slug = normalizeSlug(input.slug);
  if (!slug) return { saved: false, duplicate: false };
  const recipe = input.recipe
    ? { ...input.recipe, _slug: slug }
    : catalogSavedMealStub(slug, input.title);
  return insertSavedMeal(
    {
      id: catalogSavedMealId(slug),
      savedAt: input.savedAt ?? new Date().toISOString(),
      recipe,
      recipePath: input.recipePath,
      source: input.source,
    },
    options.notify ?? true,
  );
}

export function removeMeal(id: string): boolean {
  const existing = getSavedMeals();
  const updated = existing.filter((m) => m.id !== id);
  if (updated.length === existing.length) return false;
  recordTombstone(id);
  writeSavedMeals(updated);
  return true;
}

export function removeCatalogMeal(slug: string): boolean {
  return removeMeal(catalogSavedMealId(slug));
}

/** Fires change events after a silent batch write (e.g. legacy import). */
export function notifySavedMealsChanged(): void {
  dispatchChanged();
}
