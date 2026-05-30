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

/** Homepage title — primary keyword first; brand for CTR recognition. */
export const SEO_DEFAULT_TITLE = "Firefighter Meals & Firehall Recipes | Firehall Meals";

export const SEO_DEFAULT_DESCRIPTION =
  `Discover ${formatMarketingRecipeCount(APPROVED_CATALOG_TOTAL)} firefighter meals, firehall recipes, crew dinners, BBQ ideas, healthy station meals, and firefighter cooking classics. Built by firefighters. Tested in the firehall.`;

/** Visible homepage H1 (matches title intent). */
export const SEO_HOME_H1 = "Firefighter Meals & Firehall Recipes";

export const SEO_HOME_HERO_EYEBROW =
  "Firefighter meals · Firehall recipes · Crew-tested";

export const SEO_DEFAULT_OG_IMAGE_PATH = "/images/golden-100/chicken-parm.jpg";

export const SEO_TWITTER_HANDLE = "@firehallmeals";
