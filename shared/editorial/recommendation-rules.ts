/**
 * Validate guide meal picks against article intent (no brisket on "30 minute" guides).
 */

import type { EditorialArticle } from "./content-schema.js";
import { isFastShiftSlug, isSlowCookSlug } from "./meal-pools.js";

export interface RecommendationIssue {
  slug: string;
  mealSlug: string;
  message: string;
}

type Rule = {
  /** Article slug patterns or exact slugs */
  match: (articleSlug: string) => boolean;
  forbidSlow?: boolean;
  requireFast?: boolean;
  forbidSlugs?: string[];
};

const RULES: Rule[] = [
  {
    match: (s) =>
      /fast|under-30|quick|busy-night|between-calls|after-busy-shift/.test(s),
    forbidSlow: true,
    requireFast: false, // warn only if slow present; fast not mandatory for all
  },
  {
    match: (s) => s === "fast-firehall-meals-under-30-minutes",
    forbidSlow: true,
    requireFast: true,
  },
  {
    match: (s) => s === "best-meals-after-busy-shift" || s === "best-firehall-meals-busy-nights",
    forbidSlow: true,
  },
  {
    match: (s) => /crockpot|slow-cooker/.test(s),
    forbidSlugs: ["smoked-brisket", "texas-beef-ribs"],
  },
];

function ruleMatches(articleSlug: string): Rule[] {
  return RULES.filter((r) => r.match(articleSlug));
}

export function validateArticleMealRecommendations(
  article: EditorialArticle,
): RecommendationIssue[] {
  const issues: RecommendationIssue[] = [];
  const rules = ruleMatches(article.slug);

  for (const pick of article.mealRecommendations) {
    for (const rule of rules) {
      if (rule.forbidSlow && isSlowCookSlug(pick.slug)) {
        issues.push({
          slug: article.slug,
          mealSlug: pick.slug,
          message: `"${pick.slug}" is a long cook — poor fit for "${article.title}"`,
        });
      }
      if (rule.requireFast && !isFastShiftSlug(pick.slug) && isSlowCookSlug(pick.slug)) {
        issues.push({
          slug: article.slug,
          mealSlug: pick.slug,
          message: `"${pick.slug}" is not a fast-shift pick for "${article.slug}"`,
        });
      }
      if (rule.forbidSlugs?.includes(pick.slug)) {
        issues.push({
          slug: article.slug,
          mealSlug: pick.slug,
          message: `"${pick.slug}" should not appear on "${article.slug}"`,
        });
      }
    }
  }

  return issues;
}
