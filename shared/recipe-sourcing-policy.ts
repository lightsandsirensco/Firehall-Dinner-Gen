/**
 * Firehall Meals — recipe sourcing hierarchy and creation rules.
 * Single source of truth for publisher tiers, allowlists, and new-recipe policy.
 */

export type RecipeSourceTier = 1 | 2 | 3;

export interface RecipeSourcePublisher {
  /** Display name (attribution, inspiration field) */
  name: string;
  /** Allowed hosts (www stripped at match time) */
  hosts: string[];
  tier: RecipeSourceTier;
  /** Lower = prefer first within the same tier */
  rank: number;
}

/** Crew sizes every new catalog recipe must support via scaling (UI picker). */
export const FIREHALL_CREW_SCALE_SIZES = [4, 6, 8, 10, 14] as const;

export type FirehallCrewScaleSize = (typeof FIREHALL_CREW_SCALE_SIZES)[number];

/**
 * Publisher hierarchy for new Firehall Meals recipes.
 * When sourcing, walk Tier 1 → 2 → 3 in rank order; never skip to a lower tier if a Tier 1 version exists.
 */
export const RECIPE_SOURCE_PUBLISHERS: RecipeSourcePublisher[] = [
  // ── Tier 1 ──
  { name: "America's Test Kitchen", hosts: ["americastestkitchen.com", "cookscountry.com"], tier: 1, rank: 1 },
  { name: "Cook's Illustrated", hosts: ["cooksillustrated.com"], tier: 1, rank: 2 },
  { name: "Serious Eats", hosts: ["seriouseats.com"], tier: 1, rank: 3 },
  { name: "NYT Cooking", hosts: ["cooking.nytimes.com"], tier: 1, rank: 4 },
  { name: "Food & Wine", hosts: ["foodandwine.com"], tier: 1, rank: 5 },

  // ── Tier 2 ──
  { name: "Bon Appétit", hosts: ["bonappetit.com"], tier: 2, rank: 6 },
  { name: "Epicurious", hosts: ["epicurious.com"], tier: 2, rank: 7 },
  { name: "Food Network", hosts: ["foodnetwork.com"], tier: 2, rank: 8 },
  { name: "Allrecipes", hosts: ["allrecipes.com"], tier: 2, rank: 9 },
  { name: "Simply Recipes", hosts: ["simplyrecipes.com"], tier: 2, rank: 10 },

  // ── Tier 3 ──
  { name: "King Arthur Baking", hosts: ["kingarthurbaking.com", "kingarthurflour.com"], tier: 3, rank: 11 },
  { name: "Milk Street", hosts: ["177milkstreet.com", "christopherkimball.com"], tier: 3, rank: 12 },
  { name: "Southern Living", hosts: ["southernliving.com"], tier: 3, rank: 13 },
  { name: "AmazingRibs", hosts: ["amazingribs.com"], tier: 3, rank: 14 },
  { name: "BBQ Pit Boys", hosts: ["bbqpitboys.com"], tier: 3, rank: 15 },

  // ── Legacy allowlist (existing catalog / ingestion only — not preferred for new recipes) ──
  { name: "Half Baked Harvest", hosts: ["halfbakedharvest.com"], tier: 3, rank: 90 },
  { name: "Damn Delicious", hosts: ["damndelicious.net"], tier: 3, rank: 91 },
  { name: "Sip & Feast", hosts: ["sipandfeast.com"], tier: 3, rank: 92 },
  { name: "Budget Bytes", hosts: ["budgetbytes.com"], tier: 3, rank: 93 },
  { name: "Cafe Delites", hosts: ["cafedelites.com"], tier: 3, rank: 94 },
  { name: "Gimme Some Oven", hosts: ["gimmesomeoven.com"], tier: 3, rank: 95 },
  { name: "The Pioneer Woman", hosts: ["thepioneerwoman.com"], tier: 3, rank: 96 },
  { name: "Tastes Better From Scratch", hosts: ["tastesbetterfromscratch.com"], tier: 3, rank: 97 },
  { name: "Mob Kitchen", hosts: ["mob.co.uk", "mobkitchen.co.uk"], tier: 3, rank: 98 },
  { name: "EatingWell", hosts: ["eatingwell.com"], tier: 3, rank: 99 },
  { name: "Delish", hosts: ["delish.com"], tier: 3, rank: 100 },
  { name: "Tasty", hosts: ["tasty.co"], tier: 3, rank: 101 },
];

/** Ordered list for human / prompt reference (Tier 1 names first). */
export const RECIPE_SOURCE_TIER_LABELS: Record<RecipeSourceTier, string[]> = {
  1: RECIPE_SOURCE_PUBLISHERS.filter((p) => p.tier === 1 && p.rank <= 15).map((p) => p.name),
  2: RECIPE_SOURCE_PUBLISHERS.filter((p) => p.tier === 2).map((p) => p.name),
  3: RECIPE_SOURCE_PUBLISHERS.filter((p) => p.tier === 3 && p.rank <= 15).map((p) => p.name),
};

export const RECIPE_CREATION_RULES = `
RECIPE SOURCING (mandatory for new Firehall Meals recipes):
- Start with the highest-quality version from Tier 1: ${RECIPE_SOURCE_TIER_LABELS[1].join(", ")}.
- If unavailable, use Tier 2: ${RECIPE_SOURCE_TIER_LABELS[2].join(", ")}.
- If unavailable, use Tier 3: ${RECIPE_SOURCE_TIER_LABELS[3].join(", ")}.
- Never invent recipes. Never create AI-generated ingredient lists without a real publisher source.
- Use the source recipe as the foundation (ingredients, ratios, technique).
- Rewrite instructions in Firehall Meals voice (see FIREHALL_VOICE_RULES).
- Scale for crews of ${FIREHALL_CREW_SCALE_SIZES.join(", ")} firefighters from canonical base servings.
- Add station-friendly serving suggestions and realistic prep/cook times.
- Attribute source_name and source_url on every published meal.
`.trim();

/** Publishers approved for new recipe development (excludes legacy-only hosts). */
export function preferredPublishersForNewRecipes(): RecipeSourcePublisher[] {
  return RECIPE_SOURCE_PUBLISHERS.filter((p) => p.rank <= 15).sort((a, b) => a.rank - b.rank);
}

export function publishersByTier(tier: RecipeSourceTier): RecipeSourcePublisher[] {
  return RECIPE_SOURCE_PUBLISHERS.filter((p) => p.tier === tier && p.rank <= 15).sort(
    (a, b) => a.rank - b.rank,
  );
}
