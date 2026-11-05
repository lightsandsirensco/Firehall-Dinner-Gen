/**
 * Lights & Sirens Co. — parent firefighter lifestyle brand for Firehall Meals.
 *
 * Every on-site mention links to `website` via LightsAndSirensLink /
 * WithLightsAndSirensLinks (new tab, styled to blend into surrounding text).
 */

export const LIGHTS_AND_SIRENS = {
  name: "Lights & Sirens Co.",
  builtByLabel: "Built by Lights & Sirens Co.",
  firefighterOwned: "Firefighter-owned",
  website: "https://www.lightsandsirensco.com",
  instagram: "https://www.instagram.com/lightsandsirens_co/",
  facebook: "https://www.facebook.com/lightsandsirensco/",
} as const;

export const LIGHTS_COPY = {
  heroBuiltBy: "Built by Lights & Sirens Co.",
  /** Single body block — home About-style authenticity sections. */
  authenticityBody:
    "No more standing around the firehouse throwing out the same five ideas every shift. Just real meals crews actually want to make — from quick busy-night dinners to firehouse classics that always hit on shift.",
  recipeStrip: "Another firehouse-tested meal from Lights & Sirens Co.",
  wheelLine: "The classic kitchen-table gamble from Lights & Sirens Co.",
  emailNote: "From the crew at Lights & Sirens Co. — firefighter culture, gear, and meals that work on shift.",
  footerTagline: "Built by firefighters, for firefighters.",
  /** Followed by the linked brand name in the footer. */
  footerSub: "From the crew at",
  footerBlurb: "More than recipes — firefighter culture, gear, tools, and crew life.",
} as const;

export type LightsExternalLink = {
  label: string;
  href: string;
  description?: string;
};

export const LIGHTS_FOOTER_LINKS: LightsExternalLink[] = [
  { label: "Instagram", href: LIGHTS_AND_SIRENS.instagram, description: "Crew life & drops" },
  { label: "Facebook", href: LIGHTS_AND_SIRENS.facebook, description: "Community" },
];
