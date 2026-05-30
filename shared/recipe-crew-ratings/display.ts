import { CREW_RATING_MIN_VOTES_TO_SHOW_COUNT } from "./constants.js";
import type { RecipeCrewRatingStats } from "./types.js";

export function computeApprovalScore(thumbsUp: number, totalVotes: number): number | null {
  if (totalVotes <= 0) return null;
  return Math.round((thumbsUp / totalVotes) * 1000) / 1000;
}

export function formatApprovalPercent(approvalScore: number | null): string {
  if (approvalScore == null) return "—";
  return `${Math.round(approvalScore * 100)}%`;
}

/** Public-facing approval line — always shown when there are votes. */
export function formatApprovalLabel(approvalScore: number | null, totalVotes: number): string {
  if (totalVotes <= 0 || approvalScore == null) {
    return "Be the first crew to rate this meal";
  }
  return `${formatApprovalPercent(approvalScore)} Would Cook Again`;
}

/**
 * Hide raw counts below the public threshold to avoid weak social proof.
 */
export function formatRatingsCountLabel(totalVotes: number): string | null {
  if (totalVotes < CREW_RATING_MIN_VOTES_TO_SHOW_COUNT) return null;
  return `${totalVotes} Firefighter Rating${totalVotes === 1 ? "" : "s"}`;
}

export function toPublicRatingLines(stats: Pick<RecipeCrewRatingStats, "approvalScore" | "totalVotes">): {
  approvalLabel: string;
  ratingsLabel: string | null;
} {
  return {
    approvalLabel: formatApprovalLabel(stats.approvalScore, stats.totalVotes),
    ratingsLabel: formatRatingsCountLabel(stats.totalVotes),
  };
}
