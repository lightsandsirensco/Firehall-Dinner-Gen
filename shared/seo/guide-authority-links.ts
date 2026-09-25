/**
 * Guide -> landing/hub page contextual links (Phase 3 "GUIDE → LANDING PAGE
 * LINKS"). The audit found zero of the 57 guides linked to any of the SEO
 * landing pages or catalog hubs — this is a deliberate, per-guide mapping
 * (not a single link repeated on every article) built by inspecting each
 * guide's own canonical `topic`, title, and keywords against every
 * candidate landing/hub page's own stated intent (see
 * `shared/seo/landing-pages-data.ts`).
 *
 * Guides with no genuinely-fitting destination intentionally get `null` —
 * see the Phase 3 report for the full list and reasoning. This mirrors the
 * existing recipe -> pillar/guide link system (`recipe-authority-links.ts`)
 * but runs the opposite direction and is a fixed lookup table rather than a
 * regex classifier, since each guide's landing-page fit was reviewed
 * individually rather than pattern-matched.
 */

export type GuideAuthorityLink = {
  href: string;
  /** Anchor text only (no surrounding sentence). */
  label: string;
  /** Natural sentence lead-in rendered before the link. */
  prefix: string;
  /** Natural sentence continuation rendered after the link. */
  suffix: string;
};

type LandingCopy = { label: string; prefix: string; suffix: string };

const LANDING_COPY: Record<string, LandingCopy> = {
  "/firefighter-breakfast-recipes": {
    label: "our firefighter breakfast recipes",
    prefix: "Cooking for the crew before shift change?",
    suffix: "cover batch-friendly plates for early mornings.",
  },
  "/firefighter-bbq-recipes": {
    label: "our firefighter BBQ recipes",
    prefix: "Planning the next grill night?",
    suffix: "are built for station-sized cookouts.",
  },
  "/healthy-firefighter-meals": {
    label: "our healthy firefighter meals",
    prefix: "Want more plates like this?",
    suffix: "collection is built around recovery and performance.",
  },
  "/crew-meals": {
    label: "our crew meals hub",
    prefix: "Feeding a bigger table tonight?",
    suffix: "has recipes built to scale past a normal household portion.",
  },
  "/firefighter-dinner-ideas": {
    label: "our firefighter dinner ideas hub",
    prefix: "Still deciding what's for dinner?",
    suffix: "is built for exactly that whiteboard debate.",
  },
  "/fire-station-meals": {
    label: "our fire station meals collection",
    prefix: "Need something that survives an interrupted shift?",
    suffix: "is built around that exact constraint.",
  },
  "/firefighter-meals": {
    label: "our firefighter meals hub",
    prefix: "Looking for more like this?",
    suffix: "rounds up the hall's most-cooked dinners.",
  },
  "/smoothies": {
    label: "our smoothies collection",
    prefix: "Want more recovery drinks like this one?",
    suffix: "has the full lineup.",
  },
};

/**
 * guide slug -> destination path. Only guides with a genuinely relevant
 * hub/landing page are listed — everything else deliberately gets no link
 * rather than a forced generic one (see Phase 3 report, "Ambiguous /
 * unassigned guides").
 */
const GUIDE_LANDING_MAP: Record<string, string> = {
  // Breakfast guides -> /firefighter-breakfast-recipes
  "firefighter-breakfast-ideas": "/firefighter-breakfast-recipes",
  "firefighter-breakfast-guide": "/firefighter-breakfast-recipes",
  "firehall-breakfast-and-brunch": "/firefighter-breakfast-recipes",

  // BBQ guide -> /firefighter-bbq-recipes
  "bbq-night-at-the-station": "/firefighter-bbq-recipes",

  // Healthy / nutrition guides (all of `nutrition_performance`, minus the
  // smoothies guide, which links its own more precise hub instead — see
  // below) -> /healthy-firefighter-meals
  "avoid-living-on-takeout": "/healthy-firefighter-meals",
  "best-foods-for-long-shifts": "/healthy-firefighter-meals",
  "eating-during-high-stress-shifts": "/healthy-firefighter-meals",
  "eating-well-on-24-hour-shifts": "/healthy-firefighter-meals",
  "firefighter-recovery-nutrition": "/healthy-firefighter-meals",
  "healthy-meals-for-active-crews": "/healthy-firefighter-meals",
  "healthy-meals-that-still-taste-good": "/healthy-firefighter-meals",
  "healthy-station-snacks": "/healthy-firefighter-meals",
  "high-protein-firehall-meals": "/healthy-firefighter-meals",
  "hydration-for-firefighters": "/healthy-firefighter-meals",
  "meals-wont-wreck-energy-levels": "/healthy-firefighter-meals",
  "nutrition-after-overnight-calls": "/healthy-firefighter-meals",
  "performance-nutrition-firefighters": "/healthy-firefighter-meals",
  "recovery-meals-after-hard-calls": "/healthy-firefighter-meals",
  // meal_planning guide that's explicitly healthy-themed by keyword too
  "healthy-firefighter-meals-fill-you-up": "/healthy-firefighter-meals",
  // The smoothies guide's most precise, primary hub is the smoothies
  // catalog itself (already reverse-linked from smoothies-index.tsx) —
  // a stronger, more specific match than the general nutrition hub.
  "healthy-smoothies-at-the-hall": "/smoothies",

  // Large-crew guides -> /crew-meals
  "best-firehouse-meals-large-crews": "/crew-meals",
  "meals-feeding-10-firefighters": "/crew-meals",
  "cooking-for-10-firefighters": "/crew-meals",
  "feeding-a-firehall-crew": "/crew-meals",
  "feeding-ten-firefighters": "/crew-meals",

  // Dinner-decision guides -> /firefighter-dinner-ideas
  "25-firefighter-dinner-ideas": "/firefighter-dinner-ideas",
  "planning-tonights-station-dinner": "/firefighter-dinner-ideas",
  "organize-firehall-dinners": "/firefighter-dinner-ideas",
  "busy-shift-dinner-strategies": "/firefighter-dinner-ideas",

  // Station-meal / shift-logistics guides -> /fire-station-meals
  "best-firefighter-crockpot-meals": "/fire-station-meals",
  "best-firehall-meals-busy-nights": "/fire-station-meals",
  "best-meals-24-hour-shift": "/fire-station-meals",
  "dutch-oven-meals-firefighters": "/fire-station-meals",
  "fast-firehall-meals-under-30-minutes": "/fire-station-meals",
  "firehall-grocery-planning": "/fire-station-meals",
  "firehall-meal-prep-ideas": "/fire-station-meals",
  "meal-prep-for-shift-workers": "/fire-station-meals",
  "one-pot-firehall-meals": "/fire-station-meals",
  "station-kitchen-essentials": "/fire-station-meals",
  "rookie-firefighter-meal-guide": "/fire-station-meals",
  "quick-meals-between-calls": "/fire-station-meals",
  "how-crews-split-groceries": "/fire-station-meals",

  // General "what the hall actually eats" guides -> /firefighter-meals
  "most-popular-firefighter-meals": "/firefighter-meals",
  "meals-firefighters-actually-cook": "/firefighter-meals",
  "legendary-firehall-meals": "/firefighter-meals",
  "meals-every-firefighter-knows": "/firefighter-meals",
  "10-classic-firehall-meals": "/firefighter-meals",
};

/**
 * Guides deliberately left WITHOUT a landing link (no genuinely-fitting
 * destination among the current hubs) — kept here only as a documented,
 * explicit "considered and skipped" list for the Phase 3 report; not used
 * by any code path.
 */
export const GUIDES_WITHOUT_LANDING_LINK: readonly string[] = [
  "best-meals-after-busy-shift",
  "best-station-chili-recipes",
  "cheap-firehall-meals",
  "easy-firehall-pasta-recipes",
  "firehall-taco-night-ideas",
  "firehouse-comfort-meals",
  "comfort-food-after-a-long-shift",
  "firehall-kitchen-culture",
  "rookie-cooking-mistakes",
  "better-station-food-culture",
];

export function getGuideLandingLink(slug: string): GuideAuthorityLink | null {
  const href = GUIDE_LANDING_MAP[slug];
  if (!href) return null;
  const copy = LANDING_COPY[href];
  if (!copy) return null;
  return { href, label: copy.label, prefix: copy.prefix, suffix: copy.suffix };
}
