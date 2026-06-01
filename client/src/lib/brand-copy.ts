/**
 * Firehall Meals — public voice & CTAs.
 * Firefighter-built, kitchen-table practical. No catalog/startup speak.
 */

export const BRAND_NAME = "Firehall Meals";

export const BRAND_TAGLINE = "Built by Firefighters. Tested in the Firehall.";

export const BRAND_MISSION =
  "Get rid of the \"What's for Dinner?\" debate every shift.";

/** @deprecated Prefer `@/lib/lights-and-sirens` and brand components */
export const BRAND_CREDIT = {
  label: "Built by Lights & Sirens Co.",
  href: "https://www.lightsandsirensco.com",
} as const;

export const CTA = {
  findDinner: "Find a Meal",
  pickDinner: "Pick dinner",
  exploreMeals: "Browse Recipes",
  viewRecipes: "All recipes",
  generateTonight: "Generate Tonight's Meal",
  spinMealWheel: "Spin The Meal Wheel",
  fullFaq: "All questions",
  spinAgain: "Spin again",
  tryAnother: "Try another",
  changePicks: "Change picks",
  cookThis: "Cook this one",
  viewPackage: "Hall package",
  classicsWheel: "Classics Wheel",
} as const;

export const GENERATOR = {
  headline: "Find a meal for the crew.",
  headlineWithMeal: "Tonight's pick",
  subline:
    "Set crew size, protein, and time — we'll match you with a firefighter meal that works on shift.",
  sublineFocus: "Shuffle or tweak your picks below.",
  loading: "Finding a plate…",
  loadingAlt: "Trying another…",
  emptyTitle: "Ready when you are",
  emptyBody: "Set the crew, hit Pick dinner, or browse firefighter recipes if you want to look around first.",
  emptyHint: "More controls below if you want to narrow it down.",
  wheelLink: "Can't decide? Try the Classics Wheel →",
} as const;

export const HOME = {
  /** Visible homepage hero headline (SEO title stays in metadata). */
  heroHeadline: 'End The "What\'s For Dinner?" Debate.',
  heroSubheadline: "Firehall-tested meals picked in under 30 seconds.",
  /** Plain-language value prop — visible under hero subhead. */
  heroActionLine: "300+ curated recipes — pick crew size and get a dinner plan.",
  heroTrustLine: "Built by firefighters. Hall-tested recipes your crew will actually eat.",
  /** Fixed marketing count for homepage trust strip and stats. */
  curatedRecipesLabel: "300+ curated recipes",
  curatedRecipesCount: "300+",
  h1: "Firefighter Meals & Firehall Recipes",
  heroEyebrow: "Firefighter meals · Firehall recipes · Crew-tested",
  eyebrow: "Station kitchen · Crew dinners",
  subline:
    "The largest collection of firefighter meals and firehall recipes — crew-sized portions, honest timing, and steps written for station kitchens.",
  trust: {
    built: "Firefighter built",
    crew: "Feeds the crew",
    shift: "Shift-tested",
    beginner: "Clear steps",
    cleanup: "Easy cleanup",
  },
  stats: {
    recipes: "Curated Recipes",
    categories: "Categories",
    crew: "Crew size",
    time: "Time windows",
  },
  howTitle: "How it works",
  howLead: "Three steps. One dinner on the table.",
  featuredTitle: "Popular firefighter meals",
  featuredLead: "Hall-tested firehouse meals crews actually cook — browse the full catalog anytime.",
  whyTitle: "Why halls use it",
  whyLead: "Written for the station, not the recipe scroll.",
  seoTitle: "Firefighter meals, firehall recipes & hall guides",
  introTitle: "Firefighter meals for every shift",
  ctaBandTitle: "Feed the crew.",
  ctaBandBody: "Firefighter meals with realistic timing and portions that survive a busy night.",
  faqTitle: "Hall questions",
} as const;

export const NAV = {
  home: "Home",
  generator: "Find a Meal",
  explore: "Browse Recipes",
  ideas: "Hall Ideas",
  wheel: "Classics Wheel",
  pizza: "Pizza Night",
  faq: "FAQ",
  saved: "Saved",
} as const;

export const CLASSICS_WHEEL = {
  title: "Classics Wheel",
  subtitles: [
    "The firehall kitchen-table gamble.",
    "When nobody can decide dinner.",
    "Every hall ends up making these eventually.",
  ],
  subtitle: "The firehall kitchen-table gamble.",
  eyebrow: "Crew tradition",
  hint: "Tap Spin or the center button. What lands is what you cook.",
  suspense: "Still spinning…",
  browseLink: "Rather browse? Explore firefighter recipes →",
  shareCta: "Share tonight's pick",
} as const;
