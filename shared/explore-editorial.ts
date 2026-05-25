import type { ExploreRecipeCard } from "./explore-recipe.js";
import { isExploreFeedBlocked } from "./explore-feed-blocklist.js";
import { EXPLORE_DISCOVERY_SECTIONS } from "./explore-discovery-catalog.js";

/** Visual accent for section headers (maps to CSS in explore-discovery-section) */
export type ExploreSectionTheme =
  | "ember"
  | "smoke"
  | "gold"
  | "steel"
  | "copper"
  | "ocean";

/** Editorial collection — stable identity, not random pool noise */
export interface ExploreSectionDef {
  id: string;
  title: string;
  subtitle: string;
  layout: "rail" | "grid";
  /** Lower = higher on page */
  priority: number;
  poolTag: string;
  theme?: ExploreSectionTheme;
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
  theme?: ExploreSectionTheme;
  recipes: ExploreRecipeCard[];
}

/** Spoonacular-backed discovery rails — see explore-discovery-catalog.ts */
export const EXPLORE_EDITORIAL_SECTIONS: ExploreSectionDef[] = EXPLORE_DISCOVERY_SECTIONS;

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
    if (isExploreFeedBlocked(card.title)) continue;
    if (seenIds.has(card.id)) continue;
    const titleKey = card.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);
    if (seenTitleKeys.has(titleKey)) continue;
    seenIds.add(card.id);
    seenTitleKeys.add(titleKey);
    out.push(card);
  }
  return out;
}
