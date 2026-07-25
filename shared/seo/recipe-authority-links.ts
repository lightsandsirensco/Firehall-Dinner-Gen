/**
 * Natural recipe → pillar / guide links for topical authority.
 * Deterministic heuristics — no keyword stuffing.
 */

import { guidePath } from "../editorial/content-schema.js";

export type AuthorityLink = { href: string; label: string };

type RecipeLinkInput = {
  slug: string;
  category?: string;
  cuisine?: string;
  mealFormat?: string;
  tags?: string[];
  title?: string;
  displayTitle?: string;
};

function haystack(page: RecipeLinkInput): string {
  return [
    page.slug,
    page.category,
    page.cuisine,
    page.mealFormat,
    ...(page.tags ?? []),
    page.title,
    page.displayTitle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** One SEO pillar per recipe — prefers the tightest topical match. */
export function pickRecipePillarLink(page: RecipeLinkInput): AuthorityLink {
  const h = haystack(page);

  if (/breakfast|brunch|egg|oatmeal|red.?lead/.test(h) || page.mealFormat === "breakfast") {
    return { href: "/firefighter-breakfast-recipes", label: "Firefighter breakfast recipes" };
  }
  if (/bbq|smoker|grill|brisket|rib|pulled.?pork|burnt.?end/.test(h) || page.category === "bbq_grill_nights") {
    return { href: "/firefighter-bbq-recipes", label: "Firefighter BBQ recipes" };
  }
  if (/healthy|performance|high.?protein|lean|macro/.test(h) || page.category === "healthy_performance") {
    return { href: "/healthy-firefighter-meals", label: "Healthy firefighter meals" };
  }
  if (/bowl|burrito.?bowl|rice.?bowl/.test(h) || page.mealFormat === "bowl") {
    return { href: "/crew-meals", label: "Crew meals for the firehall" };
  }
  if (/firehouse|station|classic|comfort|chili|meatloaf|parm/.test(h)) {
    return { href: "/firehouse-meals", label: "Firehouse meals" };
  }
  if (/dinner|taco|burger|pasta|skillet/.test(h)) {
    return { href: "/firefighter-dinner-ideas", label: "Firefighter dinner ideas" };
  }
  return { href: "/firefighter-meals", label: "Firefighter meals" };
}

/** One related guide — operational or listicle, never the recipe itself. */
export function pickRecipeGuideLink(page: RecipeLinkInput): AuthorityLink {
  const h = haystack(page);

  if (/breakfast|brunch|egg/.test(h) || page.mealFormat === "breakfast") {
    return {
      href: guidePath("firefighter-breakfast-ideas"),
      label: "Firefighter breakfast ideas",
    };
  }
  if (/bbq|smoker|grill|brisket|rib/.test(h) || page.category === "bbq_grill_nights") {
    return {
      href: guidePath("bbq-night-at-the-station"),
      label: "BBQ night at the station",
    };
  }
  if (/healthy|performance|macro|lean/.test(h) || page.category === "healthy_performance") {
    return {
      href: guidePath("healthy-meals-for-active-crews"),
      label: "Healthy meals for active crews",
    };
  }
  if (/quick|skillet|sheet.?pan|under.?45|busy/.test(h) || page.category === "quick_shift_meals") {
    return {
      href: guidePath("quick-meals-between-calls"),
      label: "Quick meals between calls",
    };
  }
  if (/bowl|burrito|build.?your.?own/.test(h) || page.mealFormat === "bowl") {
    return {
      href: guidePath("25-firefighter-dinner-ideas"),
      label: "25 firefighter dinner ideas",
    };
  }
  if (/comfort|chili|casserole|stew|soup/.test(h)) {
    return {
      href: guidePath("comfort-food-after-a-long-shift"),
      label: "Comfort food after a long shift",
    };
  }
  if (/crew|large|feed|batch|scale/.test(h)) {
    return {
      href: guidePath("feeding-a-firehall-crew"),
      label: "Feeding a firehall crew",
    };
  }
  return {
    href: guidePath("planning-tonights-station-dinner"),
    label: "Planning tonight's station dinner",
  };
}

export function buildRecipeAuthorityLinks(page: RecipeLinkInput): {
  pillar: AuthorityLink;
  guide: AuthorityLink;
} {
  return {
    pillar: pickRecipePillarLink(page),
    guide: pickRecipeGuideLink(page),
  };
}
