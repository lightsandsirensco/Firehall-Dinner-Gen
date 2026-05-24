import type { ExploreRecipeCard } from "./explore-recipe.js";

/** Editorial collection — stable identity, not random pool noise */
export interface ExploreSectionDef {
  id: string;
  title: string;
  subtitle: string;
  layout: "rail" | "grid";
  /** Lower = higher on page */
  priority: number;
  poolTag: string;
  queries: ExploreSectionQuery[];
  limit: number;
  sort?: "popularity" | "time";
  appetiteBoost?: number;
}

export interface ExploreSectionQuery {
  q: string;
  cuisine?: string;
  maxReadyTime?: number;
  equipment?: string;
  type?: string;
}

export interface ExploreEditorialSection {
  id: string;
  title: string;
  subtitle: string;
  layout: "rail" | "grid";
  recipes: ExploreRecipeCard[];
}

/** Spoonacular-backed editorial rails — deterministic query rotation by day */
export const EXPLORE_EDITORIAL_SECTIONS: ExploreSectionDef[] = [
  {
    id: "comfort_hall",
    title: "Comfort Food for the Hall",
    subtitle: "Stick-to-your-ribs meals crews actually want tonight",
    layout: "rail",
    priority: 10,
    poolTag: "comfort",
    appetiteBoost: 8,
    queries: [
      { q: "mac and cheese dinner" },
      { q: "beef stew hearty" },
      { q: "chicken pot pie" },
      { q: "loaded baked potato dinner" },
      { q: "meatloaf dinner" },
    ],
    limit: 8,
  },
  {
    id: "high_protein",
    title: "High Protein · Feed the Crew",
    subtitle: "Big portions, lean grills, and satisfying protein",
    layout: "rail",
    priority: 20,
    poolTag: "healthy",
    appetiteBoost: 6,
    queries: [
      { q: "high protein dinner" },
      { q: "grilled chicken breast dinner" },
      { q: "steak dinner" },
      { q: "salmon dinner" },
      { q: "turkey bowl healthy" },
    ],
    limit: 8,
  },
  {
    id: "bbq_grill",
    title: "BBQ & Grill Marks",
    subtitle: "Smoky, charred, and built for the station grill",
    layout: "rail",
    priority: 30,
    poolTag: "bbq",
    appetiteBoost: 10,
    queries: [
      { q: "bbq chicken dinner" },
      { q: "grilled ribs" },
      { q: "pulled pork dinner" },
      { q: "grilled steak" },
      { equipment: "grill", q: "dinner" },
    ],
    limit: 8,
  },
  {
    id: "under_30",
    title: "Under 30 · Shift Night",
    subtitle: "Fast turns when the hall is hungry now",
    layout: "rail",
    priority: 40,
    poolTag: "quick",
    queries: [
      { q: "quick dinner", maxReadyTime: 30 },
      { q: "30 minute chicken dinner", maxReadyTime: 30 },
      { q: "easy pasta dinner", maxReadyTime: 30 },
      { q: "stir fry dinner", maxReadyTime: 30 },
    ],
    limit: 8,
    sort: "time",
  },
  {
    id: "one_pot",
    title: "One Pot · Fast Cleanup",
    subtitle: "Less dishes, more time with the crew",
    layout: "rail",
    priority: 50,
    poolTag: "one_pot",
    queries: [
      { q: "one pot dinner" },
      { q: "sheet pan dinner" },
      { q: "skillet dinner" },
      { q: "dutch oven dinner" },
    ],
    limit: 8,
  },
  {
    id: "trending_plates",
    title: "Trending Tonight",
    subtitle: "What halls are firing up this week",
    layout: "grid",
    priority: 5,
    poolTag: "trending",
    sort: "popularity",
    queries: [
      { q: "popular dinner" },
      { q: "best chicken dinner" },
      { q: "easy crowd pleasing dinner" },
    ],
    limit: 6,
    appetiteBoost: 4,
  },
];

const APPETITE_SIGNALS: [RegExp, number][] = [
  [/crispy|crunchy|golden brown|crusted/i, 14],
  [/grilled|grill marks|charred|smoked|bbq|barbecue/i, 12],
  [/cheesy|cheese|melted|mac and cheese/i, 11],
  [/bacon|butter|garlic butter|glazed/i, 9],
  [/juicy|tender|slow cooked|braised/i, 8],
  [/comfort|hearty|loaded|sticky/i, 8],
  [/steak|burger|tacos|wings|ribs/i, 7],
  [/sauce|glaze|marinated/i, 5],
];

const APPETITE_ANTI: [RegExp, number][] = [
  [/diet|low[- ]?cal|skinny|detox|cleanse/i, -12],
  [/salad only|broth only/i, -8],
];

/** Higher = more craveable — used for within-section ordering */
export function scoreAppetiteAppeal(card: ExploreRecipeCard, sectionBoost = 0): number {
  const text = `${card.title} ${card.summary || ""}`.toLowerCase();
  let score = sectionBoost;

  for (const [re, pts] of APPETITE_SIGNALS) {
    if (re.test(text)) score += pts;
  }
  for (const [re, pts] of APPETITE_ANTI) {
    if (re.test(text)) score += pts;
  }

  if (card.readyInMinutes > 0 && card.readyInMinutes <= 25) score += 5;
  else if (card.readyInMinutes > 0 && card.readyInMinutes <= 35) score += 2;

  if (card.image?.includes("spoonacular.com")) score += 4;

  const pool = card._pool || "";
  if (pool === "comfort" || pool === "bbq") score += 4;
  if (pool === "healthy") score += 2;

  return score;
}

export function sortByAppetiteAppeal(
  cards: ExploreRecipeCard[],
  sectionBoost = 0,
): ExploreRecipeCard[] {
  return [...cards].sort(
    (a, b) => scoreAppetiteAppeal(b, sectionBoost) - scoreAppetiteAppeal(a, sectionBoost),
  );
}

/** Deterministic index from calendar day + section id (no Math.random) */
export function editorialDaySeed(): number {
  return Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
}

export function pickSectionQuery(
  section: ExploreSectionDef,
  daySeed: number,
): ExploreSectionQuery {
  const hash = section.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const idx = (daySeed + hash) % section.queries.length;
  return section.queries[idx]!;
}

export function dedupeExploreCards(
  cards: ExploreRecipeCard[],
  seenIds: Set<number>,
  seenTitleKeys: Set<string>,
): ExploreRecipeCard[] {
  const out: ExploreRecipeCard[] = [];
  for (const card of cards) {
    if (seenIds.has(card.id)) continue;
    const titleKey = card.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);
    if (seenTitleKeys.has(titleKey)) continue;
    seenIds.add(card.id);
    seenTitleKeys.add(titleKey);
    out.push(card);
  }
  return out;
}
