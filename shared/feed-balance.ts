/**
 * Catalog balance — avoid Explore flooding with one protein/cuisine/archetype.
 */

export interface CatalogBalanceSnapshot {
  totalPublished: number;
  byProtein: Record<string, number>;
  byCuisine: Record<string, number>;
  byArchetypeFamily: Record<string, number>;
  byExplorePool: Record<string, number>;
  spoonacularImageCount: number;
}

export interface BalanceCandidate {
  protein: string;
  cuisine: string;
  archetypeFamily: string;
  explorePools: string[];
  heroImage?: string;
  qualityScore: number;
}

export interface BalanceDecision {
  accept: boolean;
  reason?: string;
  /** Penalty applied to effective quality (0 = none) */
  penalty: number;
}

const PROTEIN_CAP_RATIO = 0.28;
const CUISINE_CAP_RATIO = 0.32;
const ARCHETYPE_CAP_RATIO = 0.22;
const POOL_CAP_RATIO = 0.45;

function capForTotal(total: number, ratio: number): number {
  return Math.max(3, Math.ceil(total * ratio));
}

export function computeBalanceDecision(
  snapshot: CatalogBalanceSnapshot,
  candidate: BalanceCandidate,
): BalanceDecision {
  if (snapshot.totalPublished < 8) {
    return { accept: true, penalty: 0 };
  }

  let penalty = 0;
  const protein = (candidate.protein || "mixed").toLowerCase();
  const cuisine = (candidate.cuisine || "american").toLowerCase();
  const archetype = candidate.archetypeFamily || "station_plated";

  const proteinCap = capForTotal(snapshot.totalPublished, PROTEIN_CAP_RATIO);
  const cuisineCap = capForTotal(snapshot.totalPublished, CUISINE_CAP_RATIO);
  const archetypeCap = capForTotal(snapshot.totalPublished, ARCHETYPE_CAP_RATIO);

  const proteinCount = snapshot.byProtein[protein] || 0;
  if (proteinCount >= proteinCap) {
    penalty += 18;
    if (proteinCount >= proteinCap + 5) {
      return { accept: false, reason: `protein_cap:${protein}`, penalty };
    }
  }

  const cuisineCount = snapshot.byCuisine[cuisine] || 0;
  if (cuisineCount >= cuisineCap) penalty += 12;

  const archetypeCount = snapshot.byArchetypeFamily[archetype] || 0;
  if (archetypeCount >= archetypeCap) penalty += 14;

  for (const pool of candidate.explorePools) {
    const poolCount = snapshot.byExplorePool[pool] || 0;
    const poolCap = capForTotal(snapshot.totalPublished, POOL_CAP_RATIO);
    if (poolCount >= poolCap) penalty += 8;
  }

  const spoonRatio = snapshot.spoonacularImageCount / Math.max(1, snapshot.totalPublished);
  if (
    candidate.heroImage?.includes("spoonacular.com") &&
    spoonRatio > 0.65 &&
    snapshot.totalPublished > 20
  ) {
    penalty += 10;
  }

  const effective = candidate.qualityScore - penalty;
  if (effective < 48) {
    return { accept: false, reason: "balance_effective_quality_low", penalty };
  }

  return { accept: true, penalty };
}

export function rankWithBalancePenalty(
  qualityScore: number,
  balance: BalanceDecision,
): number {
  return qualityScore - balance.penalty;
}
