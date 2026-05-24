import type { ClientRecipeResponse } from "@shared/schema";

const STORAGE_KEY = "firehall_saved_meals";

export interface SavedMeal {
  id: string;
  savedAt: string;
  recipe: ClientRecipeResponse;
}

function generateId(recipe: ClientRecipeResponse): string {
  const ingredientKey = recipe.ingredients
    .slice(0, 5)
    .map((i) => i.name.toLowerCase().trim())
    .sort()
    .join("|");
  return `${recipe.title.toLowerCase().trim()}::${ingredientKey}`;
}

export function getSavedMeals(): SavedMeal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function getSavedCount(): number {
  return getSavedMeals().length;
}

export function isMealSaved(recipe: ClientRecipeResponse): boolean {
  const id = generateId(recipe);
  return getSavedMeals().some((m) => m.id === id);
}

export function saveMeal(recipe: ClientRecipeResponse): { saved: boolean; duplicate: boolean } {
  const id = generateId(recipe);
  const existing = getSavedMeals();

  if (existing.some((m) => m.id === id)) {
    return { saved: false, duplicate: true };
  }

  const entry: SavedMeal = {
    id,
    savedAt: new Date().toISOString(),
    recipe,
  };

  const updated = [entry, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("favorites-changed"));
  window.dispatchEvent(new CustomEvent("firehall-meal-saved", { detail: { id } }));
  return { saved: true, duplicate: false };
}

export function removeMeal(id: string): void {
  const existing = getSavedMeals();
  const updated = existing.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("favorites-changed"));
}
