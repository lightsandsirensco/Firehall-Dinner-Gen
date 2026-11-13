/**
 * Recipe review status — three independent kinds of evidence:
 *
 *   1. Automated validation (computed): required fields, ingredient/step
 *      consistency, quantities, servings, nutrition integrity, food-safety
 *      temperatures. Automation can raise a recipe to "technically_validated"
 *      and no further.
 *   2. Human culinary review (review log): a named person checked technique,
 *      seasoning, timing, realistic portions and appeal → "culinary_reviewed".
 *   3. Kitchen testing (review log, optional): the recipe was actually cooked
 *      and yield/timing confirmed. Reported separately as `kitchenTested`; it
 *      is never required for publishing.
 *
 * "approved_for_publishing" needs automated validation + culinary review +
 * an approval entry. A recipe that later fails automated checks drops back to
 * "needs_review" regardless of the log.
 */
import fs from "node:fs";

export const REVIEW_STATUSES = [
  "draft",
  "needs_review",
  "technically_validated",
  "culinary_reviewed",
  "approved_for_publishing",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

const LOGGED = ["culinary_reviewed", "kitchen_tested", "approved_for_publishing"] as const;
type LoggedStatus = (typeof LOGGED)[number];

export interface ReviewLogEntry {
  slug: string;
  status: LoggedStatus;
  /** Person who reviewed, cooked, or approved it. */
  by: string;
  date: string;
  /**
   * culinary_reviewed: what was checked and changed.
   * kitchen_tested: crew size cooked, actual times, changes made, verdict.
   */
  notes: string;
}

export function loadReviewLog(file: string): ReviewLogEntry[] {
  if (!fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { entries?: ReviewLogEntry[] };
  return (parsed.entries ?? []).filter(
    (e) => e.slug && e.by?.trim() && e.date && e.notes?.trim() && (LOGGED as readonly string[]).includes(e.status),
  );
}

export interface ReviewState {
  status: ReviewStatus;
  /** Optional badge: actually cooked and measured. Not a publishing requirement. */
  kitchenTested: boolean;
}

export function resolveReviewState(input: {
  slug: string;
  isPublic: boolean;
  technicallyValidated: boolean;
  log: ReviewLogEntry[];
}): ReviewState {
  const entries = input.log.filter((e) => e.slug === input.slug);
  const has = (s: LoggedStatus) => entries.some((e) => e.status === s);
  const kitchenTested = has("kitchen_tested");
  if (!input.isPublic) return { status: "draft", kitchenTested };
  if (!input.technicallyValidated) return { status: "needs_review", kitchenTested };
  if (!has("culinary_reviewed")) return { status: "technically_validated", kitchenTested };
  return { status: has("approved_for_publishing") ? "approved_for_publishing" : "culinary_reviewed", kitchenTested };
}

export function resolveReviewStatus(input: Parameters<typeof resolveReviewState>[0]): ReviewStatus {
  return resolveReviewState(input).status;
}
