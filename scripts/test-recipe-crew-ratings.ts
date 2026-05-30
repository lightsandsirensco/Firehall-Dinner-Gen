#!/usr/bin/env tsx
/**
 * Unit tests for crew rating display + badge rules.
 */
import assert from "node:assert/strict";
import {
  formatApprovalLabel,
  formatRatingsCountLabel,
  toPublicRatingLines,
} from "../shared/recipe-crew-ratings/display.js";
import {
  buildBadgeLibraryContext,
  evaluateRecipeBadges,
  isTrendingActivity,
} from "../shared/recipe-crew-ratings/badges.js";

assert.equal(formatRatingsCountLabel(24), null);
assert.equal(formatRatingsCountLabel(25), "25 Firefighter Ratings");
assert.equal(formatRatingsCountLabel(100), "100 Firefighter Ratings");

const lines = toPublicRatingLines({ approvalScore: 0.92, totalVotes: 37 });
assert.equal(lines.approvalLabel, "92% Would Cook Again");
assert.equal(lines.ratingsLabel, "37 Firefighter Ratings");

const low = toPublicRatingLines({ approvalScore: 0.88, totalVotes: 12 });
assert.equal(low.ratingsLabel, null);

assert.equal(isTrendingActivity(10, 5, 2), true);
assert.equal(isTrendingActivity(5, 2, 1), false);

const ctx = buildBadgeLibraryContext([
  { slug: "a", totalVotes: 120, approvalScore: 0.91, votesLast30Days: 20, votesLast7Days: 8, votesPrior23Days: 5 },
  { slug: "b", totalVotes: 60, approvalScore: 0.95, votesLast30Days: 5, votesLast7Days: 1, votesPrior23Days: 2 },
  { slug: "c", totalVotes: 55, approvalScore: 0.94, votesLast30Days: 4, votesLast7Days: 1, votesPrior23Days: 1 },
]);

const crewFav = evaluateRecipeBadges(
  { slug: "a", category: "comfort_food", totalVotes: 120, approvalScore: 0.91, votesLast30Days: 20, votesLast7Days: 8, votesPrior23Days: 5 },
  ctx,
);
assert.ok(crewFav.includes("crew_favourite"));

const rookie = evaluateRecipeBadges(
  { slug: "r", category: "rookie_friendly", totalVotes: 30, approvalScore: 0.86, votesLast30Days: 5, votesLast7Days: 2, votesPrior23Days: 1 },
  ctx,
);
assert.ok(rookie.includes("rookie_approved"));

console.log("[test-recipe-crew-ratings] OK");
