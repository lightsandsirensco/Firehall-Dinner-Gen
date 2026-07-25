/** Core brand + target keyword phrases for metadata and copy. */

import {
  APPROVED_CATALOG_TOTAL,
  formatMarketingRecipeCount,
} from "../meal-catalog/curated-count.js";

export const SEO_SITE_NAME = "Firehall Meals";
export const SEO_BRAND = "FirehallMeals";
export const SEO_TAGLINE = "Built by Firefighters. Tested in the Firehall.";
export const SEO_MISSION =
  "Get rid of the \"What's for Dinner?\" debate every shift.";

/** Preferred canonical origin (www). */
export const SEO_CANONICAL_ORIGIN = "https://www.firehallmeals.com";

export const SEO_TARGET_KEYWORDS = [
  "firefighter meals",
  "firefighter recipes",
  "firehall meals",
  "fire station meals",
  "firehouse recipes",
  "meals for firefighters",
  "firefighter dinner ideas",
  "crew meals",
  "station meals",
  "firehouse cooking",
  "healthy firefighter meals",
  "firefighter breakfast recipes",
  "firehall recipes",
  "firehall dinner ideas",
] as const;

/**
 * Homepage title — keep in sync with `client/index.html` to avoid
 * pre-JS / post-hydration title drift for crawlers.
 */
export const SEO_DEFAULT_TITLE =
  "Firefighter Meals & Firehall Recipes | Firehall Meals";

/** Homepage meta description — keep in sync with `client/index.html`. */
export const SEO_DEFAULT_DESCRIPTION =
  "Crew-sized firefighter meals for the fire hall and fire station. Browse hundreds of shift-tested recipes, meal ideas, and tools built by firefighters.";

/** Marketing count still used in body copy / landings — not the homepage meta. */
export const SEO_DEFAULT_DESCRIPTION_WITH_COUNT =
  `Pick shift dinners in seconds, save meals you love, and cook with crew-sized recipes from ${formatMarketingRecipeCount(APPROVED_CATALOG_TOTAL)} firefighter-tested meals. Free for firefighters — connect your hall for shared planning when your crew is ready. Built by firefighters.`;

/** Visible homepage H1 (legacy; hero uses HOME.heroHeadline). */
export const SEO_HOME_H1 = "Pick dinner for your shift";

export const SEO_HOME_HERO_EYEBROW = "For firefighters · Your shift · Your meals";

export const SEO_DEFAULT_OG_IMAGE_PATH = "/images/golden-100/chicken-parm.jpg";

export const SEO_TWITTER_HANDLE = "@firehallmeals";
