import { BREAKFAST_GOVERNANCE_COPY } from "./governance-copy.js";
import {
  isPerformanceBreakfastSlug,
  PERFORMANCE_BREAKFAST_SLUGS,
  MISSING_FIREHALL_BREAKFASTS,
  type BreakfastCollectionTier,
  type BreakfastGovernanceDecision,
  type BreakfastGovernanceRecord,
  type BreakfastGovernanceScores,
} from "./governance-types.js";

export {
  isPerformanceBreakfastSlug,
  PERFORMANCE_BREAKFAST_SLUGS,
  MISSING_FIREHALL_BREAKFASTS,
  type BreakfastCollectionTier,
  type BreakfastGovernanceDecision,
  type BreakfastGovernanceRecord,
  type BreakfastGovernanceScores,
};

const HEALTHIER_HALL_SLUGS = new Set([
  "turkey-sausage-burritos",
  "turkey-sausage-egg-bake",
  "veggie-egg-burritos",
  "hall-breakfast-wraps",
  "fire-captain-omelette-bar",
  "bagel-lox-breakfast-board",
  "smoked-salmon-benedit",
  "overnight-french-toast-bake",
]);

const GENERIC_COPY =
  /Breakfast at the station has to survive|A practical station breakfast that scales from 4 to 12/i;

/** Score heuristics aligned with tier + hall recipe shape. */
function scoreSlug(slug: string, tier: BreakfastCollectionTier): BreakfastGovernanceScores {
  const perf = tier === "performance";
  const healthier = tier === "healthier_hall";

  const base: BreakfastGovernanceScores = {
    firehallAuthenticity: perf ? 6 : healthier ? 8 : 9,
    crewAppeal: perf ? 7 : 9,
    batchCooking: slug.includes("parfait") || slug.includes("bagel-lox") ? 7 : 9,
    beginnerFriendly: slug.includes("steakhouse") || slug.includes("benedict") ? 7 : 9,
    visualAppeal: 8,
    imageAccuracy: 7,
    cultureFit: perf ? 6 : healthier ? 8 : 9,
  };

  if (slug === "big-pot-savory-oats" || slug === "high-protein-parfaits") {
    base.firehallAuthenticity = 5;
    base.cultureFit = 5;
  }
  if (slug === "protein-pancake-tray" || slug === "protein-french-toast") {
    base.firehallAuthenticity = 6;
    base.cultureFit = 6;
  }
  if (slug === "apple-cinnamon-baked-oatmeal") {
    base.firehallAuthenticity = 6;
  }
  if (slug === "red-lead-skillet" || slug === "hall-sausage-biscuits-gravy") {
    base.firehallAuthenticity = 10;
    base.cultureFit = 10;
  }
  if (slug === "breakfast-poutine" || slug === "scrapple-and-eggs-skillet") {
    base.firehallAuthenticity = 9;
    base.cultureFit = 10;
  }

  return base;
}

function tierForSlug(slug: string): BreakfastCollectionTier {
  if (isPerformanceBreakfastSlug(slug)) return "performance";
  if (HEALTHIER_HALL_SLUGS.has(slug)) return "healthier_hall";
  return "firehall_classic";
}

function decisionForSlug(
  slug: string,
  tier: BreakfastCollectionTier,
  existingDescription: string,
  existingSubtitle: string,
): BreakfastGovernanceDecision {
  if (tier === "performance") return "MOVE_PERFORMANCE";
  if (GENERIC_COPY.test(existingDescription) || GENERIC_COPY.test(existingSubtitle)) return "REWRITE";
  return "KEEP";
}

export function buildBreakfastGovernanceRecord(
  slug: string,
  existingDescription = "",
  existingSubtitle = "",
): BreakfastGovernanceRecord | null {
  const copy = BREAKFAST_GOVERNANCE_COPY[slug];
  if (!copy) return null;
  const tier = tierForSlug(slug);
  return {
    slug,
    tier,
    decision: decisionForSlug(slug, tier, existingDescription, existingSubtitle),
    scores: scoreSlug(slug, tier),
    description: copy.description,
    subtitle: copy.subtitle,
    imageNotes:
      tier === "performance"
        ? "Use crew-sized batch presentation — avoid single-bowl fitness styling."
        : undefined,
  };
}

export function getAllBreakfastGovernanceRecords(
  slugs: string[],
  descriptions: Record<string, { description: string; subtitle: string }> = {},
): BreakfastGovernanceRecord[] {
  return slugs
    .map((slug) =>
      buildBreakfastGovernanceRecord(
        slug,
        descriptions[slug]?.description ?? "",
        descriptions[slug]?.subtitle ?? "",
      ),
    )
    .filter((r): r is BreakfastGovernanceRecord => r != null);
}

export function getBreakfastGovernanceMap(): Record<string, BreakfastGovernanceRecord> {
  return Object.fromEntries(
    Object.keys(BREAKFAST_GOVERNANCE_COPY).map((slug) => {
      const record = buildBreakfastGovernanceRecord(slug)!;
      return [slug, record];
    }),
  );
}

export const BREAKFAST_GOVERNANCE_BY_SLUG = getBreakfastGovernanceMap();

export function primaryBreakfastSlugs(allSlugs: string[]): string[] {
  return allSlugs.filter((s) => !isPerformanceBreakfastSlug(s));
}

export function performanceBreakfastSlugs(allSlugs: string[]): string[] {
  return allSlugs.filter((s) => isPerformanceBreakfastSlug(s));
}
