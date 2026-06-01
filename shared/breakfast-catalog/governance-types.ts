export type BreakfastCollectionTier = "firehall_classic" | "healthier_hall" | "performance";

export type BreakfastGovernanceDecision = "KEEP" | "REWRITE" | "MOVE_PERFORMANCE" | "DELETE";

export type BreakfastGovernanceScores = {
  firehallAuthenticity: number;
  crewAppeal: number;
  batchCooking: number;
  beginnerFriendly: number;
  visualAppeal: number;
  imageAccuracy: number;
  cultureFit: number;
};

export type BreakfastGovernanceRecord = {
  slug: string;
  tier: BreakfastCollectionTier;
  decision: BreakfastGovernanceDecision;
  scores: BreakfastGovernanceScores;
  /** Firefighter-voice description applied to page + index. */
  description: string;
  subtitle?: string;
  imageNotes?: string;
};

export const PERFORMANCE_BREAKFAST_SLUGS = [
  "apple-cinnamon-baked-oatmeal",
  "big-pot-savory-oats",
  "high-protein-parfaits",
  "protein-french-toast",
  "protein-pancake-tray",
] as const;

export type PerformanceBreakfastSlug = (typeof PERFORMANCE_BREAKFAST_SLUGS)[number];

export function isPerformanceBreakfastSlug(slug: string): slug is PerformanceBreakfastSlug {
  return (PERFORMANCE_BREAKFAST_SLUGS as readonly string[]).includes(slug.trim().toLowerCase());
}

export const MISSING_FIREHALL_BREAKFASTS = [
  {
    title: "Full Firehall Breakfast",
    rationale: "Classic bacon, eggs, potatoes, and toast plate — the baseline crew vote winner missing as its own recipe.",
  },
  {
    title: "Bacon & Eggs for the Crew",
    rationale: "Simple griddle breakfast every hall runs; deserves a dedicated batch-scaled page beyond skillets.",
  },
  {
    title: "Peameal Breakfast Sandwiches",
    rationale: "Canadian firehall staple — peameal on a kaiser with egg and cheese belongs in the classics tier.",
  },
  {
    title: "Western Omelette Bake",
    rationale: "Ham, peppers, and cheddar casserole format crews know from overnight shifts.",
  },
  {
    title: "Eggs Benedict Casserole",
    rationale: "Hall-style benedict in a 9x13 — easier than poaching for ten after a night run.",
  },
  {
    title: "Overnight Oats for the Line",
    rationale: "Crew-batch overnight oats distinct from performance savory oats — fridge-ready shift fuel.",
  },
  {
    title: "Greek Yogurt Protein Bowls",
    rationale: "Tier-2 healthier option with topping bar — realistic post-workout hall breakfast.",
  },
] as const;
