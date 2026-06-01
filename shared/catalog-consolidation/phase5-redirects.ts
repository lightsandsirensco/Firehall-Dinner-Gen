/**
 * Phase 5 catalog consolidation — loser slug → canonical slug.
 * Preserves SEO and inbound links via client redirects.
 */
export interface Phase5Consolidation {
  from: string;
  to: string;
  note: string;
}

/** Canonical slug wins; `from` slugs redirect and are removed from catalogs. */
export const PHASE5_CONSOLIDATIONS: Phase5Consolidation[] = [
  // EXACT — breakfast hash cluster → cast-iron-breakfast-skillet
  { from: "bacon-egg-hash", to: "cast-iron-breakfast-skillet", note: "exact: hash skillet crossover" },
  { from: "bacon-egg-hash-skillet", to: "cast-iron-breakfast-skillet", note: "exact: hash skillet" },
  { from: "ham-pepper-skillet", to: "cast-iron-breakfast-skillet", note: "exact: hash skillet" },
  // NEAR — breakfast hash cluster
  { from: "steakhouse-hash-skillet", to: "cast-iron-breakfast-skillet", note: "near: hash skillet" },
  { from: "german-potato-breakfast-skillet", to: "cast-iron-breakfast-skillet", note: "near: hash skillet" },
  { from: "cowboy-breakfast-skillet", to: "cast-iron-breakfast-skillet", note: "near: hash skillet" },
  { from: "red-lead-skillet", to: "cast-iron-breakfast-skillet", note: "near: hash skillet" },

  // EXACT — breakfast burrito cluster → hall-breakfast-burritos
  { from: "chorizo-breakfast-burritos", to: "hall-breakfast-burritos", note: "exact: breakfast burrito" },
  { from: "bacon-hash-burritos", to: "hall-breakfast-burritos", note: "exact: breakfast burrito" },
  { from: "green-chile-breakfast-burritos", to: "hall-breakfast-burritos", note: "near: breakfast burrito" },

  // EXACT — pulled pork cluster → pulled-pork (golden canonical)
  { from: "memphis-dry-rub-pulled-pork", to: "pulled-pork", note: "exact: pulled pork bbq" },
  { from: "alabama-white-sauce-pulled-pork", to: "pulled-pork", note: "exact: pulled pork bbq" },
  { from: "carolina-vinegar-pulled-pork", to: "pulled-pork", note: "exact: pulled pork bbq" },
  { from: "kansas-city-pulled-pork-sandwiches", to: "pulled-pork", note: "exact: pulled pork bbq" },
  { from: "texas-smoked-pulled-pork-shoulder", to: "pulled-pork", note: "exact: pulled pork bbq" },
  { from: "carolina-mustard-pork", to: "pulled-pork", note: "near: pulled pork bbq" },
  { from: "pulled-pork-mac", to: "pulled-pork", note: "exact: pulled pork derivative" },

  // EXACT — beef broccoli
  { from: "lean-beef-broccoli-rice", to: "beef-broccoli", note: "exact: beef broccoli crossover" },

  // EXACT — biscuits & gravy → stronger breakfast title
  { from: "biscuits-gravy", to: "hall-sausage-biscuits-gravy", note: "exact: biscuits gravy" },

  // EXACT — brisket cluster → texas-central-brisket-crew
  { from: "overnight-smoked-brisket-hold", to: "texas-central-brisket-crew", note: "exact: smoked brisket" },
  { from: "smoked-brisket", to: "texas-central-brisket-crew", note: "exact: smoked brisket" },
  { from: "pepper-smoked-brisket-flat", to: "texas-central-brisket-crew", note: "exact: smoked brisket" },

  // EXACT — smoked mac
  { from: "smoked-mac-and-cheese", to: "smoked-mac-and-cheese-crew", note: "exact: smoked mac" },

  // EXACT — burger cluster → smash-burgers
  { from: "firehall-double-smash-burgers-bbq", to: "smash-burgers", note: "exact: smash burger" },
  { from: "bbq-bacon-cheddar-burgers", to: "smash-burgers", note: "near: smash burger" },

  // EXACT — stuffed peppers
  { from: "turkey-quinoa-stuffed-peppers", to: "stuffed-peppers", note: "exact: stuffed peppers" },

  // EXACT — egg bake cluster → sausage-egg-bake
  { from: "turkey-sausage-egg-bake", to: "sausage-egg-bake", note: "exact: egg bake" },
  { from: "ham-cheddar-egg-bake", to: "sausage-egg-bake", note: "near: egg bake" },

  // NEAR — chili cluster → big-chili
  { from: "sunday-chili-batch", to: "big-chili", note: "near: hall chili" },
  { from: "chili-garlic-bread", to: "big-chili", note: "near: hall chili side" },
  { from: "lean-turkey-bean-chili", to: "turkey-sweet-potato-chili", note: "near: turkey chili" },

  // Protein realism — exotic seafood → grocery staples
  { from: "cajun-grilled-catfish-crew", to: "cajun-grilled-cod-crew", note: "protein realism: catfish → cod" },
  { from: "grilled-halibut-lemon-packets", to: "grilled-cod-lemon-packets", note: "protein realism: halibut → cod" },
  { from: "garlic-butter-scallop-skewers", to: "garlic-butter-shrimp-skewers", note: "protein realism: scallops → shrimp" },
];

export const PHASE5_REDIRECT_MAP: Record<string, string> = Object.fromEntries(
  PHASE5_CONSOLIDATIONS.map((c) => [c.from, c.to]),
);

export const PHASE5_REMOVED_SLUGS = new Set(PHASE5_CONSOLIDATIONS.map((c) => c.from));

export const PHASE5_CANONICAL_SLUGS = new Set(PHASE5_CONSOLIDATIONS.map((c) => c.to));
