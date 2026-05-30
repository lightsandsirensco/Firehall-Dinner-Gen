import type { RecipeCrewRatingBadgeId } from "./types.js";

export interface BadgeEvaluationInput {
  slug: string;
  category: string;
  totalVotes: number;
  approvalScore: number | null;
  votesLast30Days: number;
  votesLast7Days: number;
  votesPrior23Days: number;
}

export interface BadgeLibraryContext {
  /** Slugs in top 10% approval among recipes with >= 50 votes */
  topRatedSlugs: Set<string>;
  /** Slugs with trending activity */
  trendingSlugs: Set<string>;
}

const ROOKIE_CATEGORY = "rookie_friendly";
const CLASSIC_CATEGORY = "firehall_classics";

export function evaluateRecipeBadges(
  input: BadgeEvaluationInput,
  ctx: BadgeLibraryContext,
): RecipeCrewRatingBadgeId[] {
  const badges: RecipeCrewRatingBadgeId[] = [];
  const score = input.approvalScore;
  if (score == null || input.totalVotes <= 0) return badges;

  if (input.totalVotes >= 250 && score >= 0.92) {
    badges.push("hall_favourite");
  } else if (input.totalVotes >= 100 && score >= 0.9) {
    badges.push("crew_favourite");
  }

  if (input.category === ROOKIE_CATEGORY && input.totalVotes >= 25 && score >= 0.85) {
    badges.push("rookie_approved");
  }

  if (input.category === CLASSIC_CATEGORY && input.totalVotes >= 50 && score >= 0.9) {
    badges.push("firehall_classic");
  }

  if (input.totalVotes >= 50 && ctx.topRatedSlugs.has(input.slug)) {
    badges.push("top_rated");
  }

  if (ctx.trendingSlugs.has(input.slug)) {
    badges.push("trending");
  }

  return [...new Set(badges)];
}

/** Trending: meaningful recent activity without gaming empty recipes. */
export function isTrendingActivity(
  votesLast30Days: number,
  votesLast7Days: number,
  votesPrior23Days: number,
): boolean {
  if (votesLast30Days < 10) return false;
  if (votesLast7Days >= 5) return true;
  const prior = Math.max(1, votesPrior23Days);
  return votesLast7Days >= 3 && votesLast7Days / prior >= 0.5;
}

/** Compute library-wide badge context from rating rows. */
export function buildBadgeLibraryContext(
  rows: Array<{
    slug: string;
    totalVotes: number;
    approvalScore: number | null;
    votesLast30Days: number;
    votesLast7Days: number;
    votesPrior23Days: number;
  }>,
): BadgeLibraryContext {
  const eligibleTop = rows
    .filter((r) => r.totalVotes >= 50 && r.approvalScore != null)
    .sort((a, b) => (b.approvalScore ?? 0) - (a.approvalScore ?? 0));

  const topCount = Math.max(1, Math.ceil(eligibleTop.length * 0.1));
  const topRatedSlugs = new Set(eligibleTop.slice(0, topCount).map((r) => r.slug));

  const trendingSlugs = new Set<string>();
  for (const row of rows) {
    if (
      isTrendingActivity(row.votesLast30Days, row.votesLast7Days, row.votesPrior23Days)
    ) {
      trendingSlugs.add(row.slug);
    }
  }

  return { topRatedSlugs, trendingSlugs };
}
