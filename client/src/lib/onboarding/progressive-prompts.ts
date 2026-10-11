/**
 * Progressive onboarding — "learn later" prompts shown on /shift only after the
 * user has a planned meal. Each one is optional and dismissible; none of them
 * is asked during schedule setup.
 */

export type ProgressivePromptId = "nutrition_goals" | "food_preferences" | "staples" | "crew";

export interface ProgressivePrompt {
  id: ProgressivePromptId;
  title: string;
  body: string;
  /** null = not available yet (shown as "Coming soon"). */
  href: string | null;
  /** Pro feature the user doesn't have — tapping opens the paywall instead of navigating. */
  locked: boolean;
}

export interface ProgressivePromptInput {
  /** At least one meal on the shift plan is picked, skipped or BYO. */
  hasValue: boolean;
  nutritionGoals: readonly string[];
  dietaryRestrictions: readonly string[];
  allergies: readonly string[];
  excludedIngredients: readonly string[];
  pantryConfigured: boolean;
  hasNutritionGoalsFeature: boolean;
  dismissed: ReadonlySet<ProgressivePromptId>;
}

export const PROGRESSIVE_PROMPT_ORDER: readonly ProgressivePromptId[] = [
  "food_preferences",
  "nutrition_goals",
  "staples",
  "crew",
];

const STORAGE_PREFIX = "fh_progressive_prompts_dismissed_";

export function progressivePromptsFor(input: ProgressivePromptInput): ProgressivePrompt[] {
  if (!input.hasValue) return [];
  const out: ProgressivePrompt[] = [];
  for (const id of PROGRESSIVE_PROMPT_ORDER) {
    if (input.dismissed.has(id)) continue;
    switch (id) {
      case "food_preferences":
        if (input.dietaryRestrictions.length || input.allergies.length || input.excludedIngredients.length) break;
        out.push({
          id,
          title: "Dietary needs & foods to avoid",
          body: "Allergies, diets, and anything the crew won't eat — future picks skip them.",
          href: "/me/profile?edit=food",
          locked: false,
        });
        break;
      case "nutrition_goals":
        if (input.hasNutritionGoalsFeature && input.nutritionGoals.length) break;
        out.push({
          id,
          title: "Nutrition Goals",
          body: "High protein, lighter meals, or balanced — auto-fill leans your way.",
          href: "/me/profile?edit=food",
          locked: !input.hasNutritionGoalsFeature,
        });
        break;
      case "staples":
        if (input.pantryConfigured) break;
        out.push({
          id,
          title: "Hall staples",
          body: "Mark what's always in the kitchen so it stays off your shopping list.",
          href: "/me/pantry",
          locked: false,
        });
        break;
      case "crew":
        out.push({
          id,
          title: "Link your crew",
          body: "Share plans and lists with the people you cook for.",
          href: null,
          locked: false,
        });
        break;
    }
  }
  return out;
}

export function readDismissedPrompts(userId: string): Set<ProgressivePromptId> {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(
      Array.isArray(list)
        ? list.filter((v): v is ProgressivePromptId => PROGRESSIVE_PROMPT_ORDER.includes(v as ProgressivePromptId))
        : [],
    );
  } catch {
    return new Set();
  }
}

export function dismissPrompts(userId: string, ids: readonly ProgressivePromptId[]): Set<ProgressivePromptId> {
  const next = readDismissedPrompts(userId);
  for (const id of ids) next.add(id);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify([...next]));
  } catch {
    /* ignore */
  }
  return next;
}
