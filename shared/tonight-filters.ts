/**
 * Pick Tonight's Meal — time window + meal style filter vocabulary.
 * Shared by the generator UI, the request schema, and the server picker.
 */

export const TONIGHT_TIME_WINDOWS = ["any", "under_30", "30_60", "60_90", "90_plus"] as const;
export type TonightTimeWindow = (typeof TONIGHT_TIME_WINDOWS)[number];

export const TONIGHT_TIME_WINDOW_LABELS: Record<TonightTimeWindow, string> = {
  any: "Any time",
  under_30: "Under 30",
  "30_60": "30–60",
  "60_90": "60–90",
  "90_plus": "90+ min",
};

/** Preferred total-minute range per window (upper bound is hard-enforced via `time_available`). */
export const TONIGHT_TIME_WINDOW_RANGE: Record<TonightTimeWindow, { min: number; max: number }> = {
  any: { min: 0, max: Infinity },
  under_30: { min: 0, max: 30 },
  "30_60": { min: 30, max: 60 },
  "60_90": { min: 60, max: 90 },
  "90_plus": { min: 90, max: Infinity },
};

export const TONIGHT_MEAL_STYLES = [
  "any",
  "comfort",
  "healthy",
  "pasta",
  "bbq",
  "one_pot",
  "different",
] as const;
export type TonightMealStyle = (typeof TONIGHT_MEAL_STYLES)[number];

/** "Not feeling it" quick reasons — session-only nudges for the next picks. */
export const NOT_FEELING_IT_REASONS = [
  "too_much_work",
  "had_recently",
  "protein",
  "too_heavy",
  "too_expensive",
  "pick_another",
] as const;
export type NotFeelingItReason = (typeof NOT_FEELING_IT_REASONS)[number];

export const NOT_FEELING_IT_LABELS: Record<NotFeelingItReason, string> = {
  too_much_work: "Too much work",
  had_recently: "Had it recently",
  protein: "Don't want that protein",
  too_heavy: "Too heavy",
  too_expensive: "Too expensive",
  pick_another: "Just pick another",
};

export interface TonightSessionFeedback {
  /** Hard-excluded for the rest of the session ("Had it recently"). */
  avoid_slugs: string[];
  /** Slugs whose protein family is excluded ("Don't want that protein"). */
  avoid_protein_of: string[];
  /** Display-only labels for the excluded proteins. */
  avoid_protein_labels: string[];
  prefer_quick: boolean;
  prefer_light: boolean;
  prefer_budget: boolean;
}

export function emptySessionFeedback(): TonightSessionFeedback {
  return {
    avoid_slugs: [],
    avoid_protein_of: [],
    avoid_protein_labels: [],
    prefer_quick: false,
    prefer_light: false,
    prefer_budget: false,
  };
}

export function applyNotFeelingIt(
  feedback: TonightSessionFeedback,
  reason: NotFeelingItReason,
  meal: { slug?: string; proteinLabel?: string | null },
): TonightSessionFeedback {
  const next = { ...feedback };
  const add = (list: string[], value?: string | null) =>
    value && !list.includes(value) ? [...list, value].slice(-40) : list;
  switch (reason) {
    case "too_much_work":
      next.prefer_quick = true;
      break;
    case "had_recently":
      next.avoid_slugs = add(next.avoid_slugs, meal.slug);
      break;
    case "protein":
      next.avoid_protein_of = add(next.avoid_protein_of, meal.slug).slice(-6);
      next.avoid_protein_labels = add(next.avoid_protein_labels, meal.proteinLabel).slice(-6);
      break;
    case "too_heavy":
      next.prefer_light = true;
      break;
    case "too_expensive":
      next.prefer_budget = true;
      break;
    default:
      break;
  }
  return next;
}

export function hasSessionFeedback(feedback: TonightSessionFeedback): boolean {
  return (
    feedback.avoid_slugs.length > 0 ||
    feedback.avoid_protein_of.length > 0 ||
    feedback.prefer_quick ||
    feedback.prefer_light ||
    feedback.prefer_budget
  );
}

/** Short "Adjusting: quicker · lighter · no beef" summary. */
export function describeSessionFeedback(feedback: TonightSessionFeedback): string {
  const parts: string[] = [];
  if (feedback.prefer_quick) parts.push("quicker");
  if (feedback.prefer_light) parts.push("lighter");
  if (feedback.prefer_budget) parts.push("cheaper");
  for (const label of feedback.avoid_protein_labels) parts.push(`no ${label.toLowerCase()}`);
  if (feedback.avoid_slugs.length) {
    parts.push(`skipping ${feedback.avoid_slugs.length} meal${feedback.avoid_slugs.length > 1 ? "s" : ""}`);
  }
  return parts.join(" · ");
}

export const TONIGHT_MEAL_STYLE_LABELS: Record<TonightMealStyle, string> = {
  any: "Any",
  comfort: "Comfort",
  healthy: "Healthy-ish",
  pasta: "Pasta",
  bbq: "BBQ",
  one_pot: "One-pot",
  different: "Something different",
};
