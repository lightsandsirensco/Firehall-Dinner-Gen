/** Core brand + target keyword phrases for metadata and copy. */

/** Public brand name: schema `name`, og:site_name, titles, visible labels. */
export const SEO_SITE_NAME = "Firehall Meals";
/** Domain-style spelling; only ever an `alternateName`, never the public name. */
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
  "Firehall Meals | Firefighter Recipes & Crew Meal Ideas";

/**
 * Homepage meta description. Also used for og/twitter description, the
 * Organization/WebSite schema, and the PWA manifest — keep in sync with
 * `client/index.html` and `vite.config.ts` (enforced by test-home-brand-seo).
 */
export const SEO_DEFAULT_DESCRIPTION =
  "Firefighter-tested recipes, easy crew meals, shift-friendly dinners and grocery planning built for the firehouse. Find meals your whole crew will eat.";

/** Homepage H1 — the hero renders HOME.heroHeadline, which must match this. */
export const SEO_HOME_H1 = "What’s for dinner at the firehall?";

/** Supporting copy directly under the homepage H1 (hero and server snapshot). */
export const SEO_HOME_H1_SUPPORT =
  "Easy firefighter recipes and crew meal ideas built for busy shifts, big appetites and unpredictable calls.";

export const SEO_HOME_HERO_EYEBROW = "For firefighters · Your shift · Your meals";

/** Recipe photo that stands in as the share image until the brand image ships. */
export const SEO_DEFAULT_OG_IMAGE_PATH = "/images/golden-100/chicken-parm.jpg";

/**
 * Dedicated brand social-share image: 1200×630, Firehall Meals branding.
 * Supply the file at `client/public${SEO_BRAND_SHARE_IMAGE_PATH}`, then set
 * SEO_BRAND_SHARE_IMAGE_READY to true and update og:image/twitter:image in
 * `client/index.html` (test-home-brand-seo checks both).
 */
export const SEO_BRAND_SHARE_IMAGE_PATH = "/images/brand/firehall-meals-share.png";
export const SEO_BRAND_SHARE_IMAGE_READY = true;
export const SEO_BRAND_SHARE_IMAGE_WIDTH = 1200;
export const SEO_BRAND_SHARE_IMAGE_HEIGHT = 630;

/** Share image for the homepage and any page without its own image. */
export const SEO_SITE_SHARE_IMAGE_PATH = SEO_BRAND_SHARE_IMAGE_READY
  ? SEO_BRAND_SHARE_IMAGE_PATH
  : SEO_DEFAULT_OG_IMAGE_PATH;

export const SEO_TWITTER_HANDLE = "@firehallmeals";
