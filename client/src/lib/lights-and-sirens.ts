/**
 * Lights & Sirens Co. — parent firefighter lifestyle brand for Firehall Meals.
 */

export const LIGHTS_AND_SIRENS = {
  name: "Lights & Sirens Co.",
  builtByLabel: "Built by Lights & Sirens Co.",
  firefighterOwned: "Firefighter-owned",
  home: "https://www.lightsandsirensco.com",
  shop: "https://www.lightsandsirensco.com/collections/all",
  apparel: "https://www.lightsandsirensco.com/collections/all",
  instagram: "https://www.instagram.com/lightsandsirens_co/",
  facebook: "https://www.facebook.com/lightsandsirensco/",
} as const;

export const LIGHTS_COPY = {
  heroBuiltBy: "Built by Lights & Sirens Co.",
  /** Single body block — home About-style authenticity sections. */
  authenticityBody:
    "No more standing around the hall throwing out the same five ideas every shift. Just real meals crews actually want to make — from quick busy-night dinners to firehall classics that always hit on shift.",
  recipeStrip: "Another firehall-tested meal from Lights & Sirens Co.",
  wheelLine: "The classic kitchen-table gamble from Lights & Sirens Co.",
  emailNote: "From the crew at Lights & Sirens Co. — firefighter culture, gear, and meals that work on shift.",
  footerTagline: "Built by firefighters, for firefighters.",
  footerSub: "From the crew at Lights & Sirens Co.",
  footerBlurb: "More than recipes — firefighter culture, gear, tools, and crew life.",
  visitCta: "Visit Lights & Sirens Co.",
  shopCta: "Shop the Brand",
  gearCta: "More Firefighter Gear",
} as const;

export type LightsExternalLink = {
  label: string;
  href: string;
  description?: string;
};

export const LIGHTS_FOOTER_LINKS: LightsExternalLink[] = [
  { label: "Lights & Sirens Co.", href: LIGHTS_AND_SIRENS.home, description: "Main site" },
  { label: "Shop apparel & gear", href: LIGHTS_AND_SIRENS.shop, description: "Firefighter-owned brand" },
  { label: "Instagram", href: LIGHTS_AND_SIRENS.instagram, description: "Crew life & drops" },
  { label: "Facebook", href: LIGHTS_AND_SIRENS.facebook, description: "Community" },
];
