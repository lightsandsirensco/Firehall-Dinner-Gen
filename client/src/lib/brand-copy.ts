/**
 * Firehall Meals — public voice & CTAs.
 * Firefighter-built, kitchen-table practical. No catalog/startup speak.
 */

export const BRAND_NAME = "Firehall Meals";

export const BRAND_TAGLINE = "Firefighter Built. Firehall Tested.";

/** @deprecated Prefer `@/lib/lights-and-sirens` and brand components */
export const BRAND_CREDIT = {
  label: "Built by Lights & Sirens Co.",
  href: "https://www.lightsandsirensco.com",
} as const;

export const CTA = {
  findDinner: "Find a Meal",
  pickDinner: "Pick dinner",
  exploreMeals: "Explore Meals",
  viewRecipes: "All recipes",
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
    "Set crew size, protein, and time — we'll match you with a dinner that actually works on shift.",
  sublineFocus: "Shuffle or tweak your picks below.",
  loading: "Finding a plate…",
  loadingAlt: "Trying another…",
  emptyTitle: "Ready when you are",
  emptyBody: "Set the crew, hit Pick dinner, or browse Explore if you want to look around first.",
  emptyHint: "More controls below if you want to narrow it down.",
  wheelLink: "Can't decide? Try the Classics Wheel →",
} as const;

export const HOME = {
  eyebrow: "Station kitchen · Crew dinners",
  subline:
    "Real meals for shift life — built by a firefighter and his wife after years around the kitchen table.",
  trust: {
    built: "Firefighter built",
    crew: "Feeds the crew",
    shift: "Shift-tested",
    beginner: "Clear steps",
    cleanup: "Easy cleanup",
  },
  stats: {
    recipes: "Recipes",
    categories: "Categories",
    crew: "Crew size",
    time: "Time windows",
  },
  howTitle: "How it works",
  howLead: "Three steps. One dinner on the table.",
  featuredTitle: "Hall favorites",
  featuredLead: "Meals crews actually make — not influencer food.",
  whyTitle: "Why halls use it",
  whyLead: "Written for the station, not the recipe scroll.",
  seoTitle: "Recipes, guides, and hall know-how",
  ctaBandTitle: "Feed the crew.",
  ctaBandBody: "Dinners with realistic timing and portions that survive a busy night.",
  faqTitle: "Questions",
} as const;

export const NAV = {
  home: "Home",
  generator: "Find a Meal",
  explore: "Explore Meals",
  ideas: "Hall Ideas",
  wheel: "Classics Wheel",
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
  browseLink: "Rather browse? Explore all meals →",
  shareCta: "Share tonight's pick",
} as const;
