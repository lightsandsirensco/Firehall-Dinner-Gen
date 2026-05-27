/**
 * Stage 4 — recommendation engine smoke tests.
 */

import assert from "node:assert/strict";
import { MASTER_CATEGORY_IDS } from "../shared/categories/constants.js";
import { getMasterCategoryRailSections } from "../server/recommendation/rails/master-rails.js";
import {
  buildRecommendationContext,
  contextHintsForDisplay,
} from "../server/recommendation/context/build-context.js";
import { buildContextualSuggestions } from "../server/recommendation/context/suggestions.js";
import { scoreExploreCardForRecommendation } from "../server/recommendation/scoring/recipe-scorer.js";
import { FeedRotationMemory } from "../server/recommendation/rotation/memory.js";
import { rankExploreCardsForRail } from "../server/recommendation/ranking/rank-cards.js";
import { computeTrendingBoost } from "../server/recommendation/trending/score.js";
import {
  recordRecipeView,
  recordRecipeSave,
} from "../server/recommendation/trending/engagement.js";
import { RECOMMENDATION_ENGINE_VERSION, MIN_EXPLORE_COMPOSITE } from "../shared/recommendation/weights.js";
import type { ExploreRecipeCard } from "../shared/explore-recipe.js";

function sampleCard(overrides: Partial<ExploreRecipeCard> = {}): ExploreRecipeCard {
  return {
    id: 9001,
    title: "Smoky BBQ Chicken Thighs",
    image: "https://cdn.example.com/bbq-chicken.jpg",
    imageAlt: "BBQ chicken",
    readyInMinutes: 35,
    servings: 8,
    summary: "Crispy grilled chicken with char marks — feeds the hall.",
    sourceUrl: "https://example.com/recipe",
    cuisines: ["american"],
    diets: [],
    primaryProtein: "chicken",
    publisherMedia: true,
    fromCuratedDb: true,
    qualityScore: 82,
    ...overrides,
  };
}

function testMasterRails() {
  const rails = getMasterCategoryRailSections();
  assert.equal(rails.length, MASTER_CATEGORY_IDS.length, "one rail per master category");
  const ids = new Set(rails.map((r) => r.id));
  for (const id of MASTER_CATEGORY_IDS) {
    assert.ok(ids.has(id), `missing rail for ${id}`);
  }
  console.log("  ✓ master category rails");
}

function testScoring() {
  const ctx = buildRecommendationContext({ crewSize: 12, maxReadyMinutes: 30 });
  const section = getMasterCategoryRailSections().find((s) => s.id === "bbq_grill_nights")!;
  const scored = scoreExploreCardForRecommendation(sampleCard(), "bbq_grill_nights", ctx, 8);
  assert.ok(scored.compositeScore >= MIN_EXPLORE_COMPOSITE, "strong card passes composite floor");
  assert.ok(scored.dimensions.categoryAffinity >= 40, "category affinity computed");

  recordRecipeView(9001);
  recordRecipeSave(9001);
  const trending = computeTrendingBoost({ recipeId: 9001 });
  assert.ok(trending > 0, "engagement boosts trending");

  const weak = scoreExploreCardForRecommendation(
    sampleCard({ title: "Keto dessert foam only", image: "", qualityScore: 10 }),
    "healthy_performance",
    ctx,
  );
  assert.ok(weak.compositeScore < scored.compositeScore, "weak card ranks lower");

  console.log("  ✓ recipe scoring + trending");
}

function testRotationAndRank() {
  const ctx = buildRecommendationContext({ seenRecipeIds: [9001] });
  const rotation = new FeedRotationMemory(ctx.seenRecipeIds);
  const section = getMasterCategoryRailSections().find((s) => s.id === "quick_shift_meals")!;
  const cards = [
    sampleCard({ id: 9001, title: "Quick Skillet Chicken" }),
    sampleCard({ id: 9002, title: "One Pot Beef Chili", primaryProtein: "beef" }),
    sampleCard({ id: 9003, title: "Sheet Pan Sausage Dinner", primaryProtein: "pork" }),
  ];
  const ranked = rankExploreCardsForRail(cards, section, ctx, rotation);
  assert.ok(!ranked.some((c) => c.id === 9001), "seen recipe rotated out");
  assert.ok(ranked.length >= 1, "rail returns publishable cards");
  console.log("  ✓ rotation + rail ranking");
}

function testContext() {
  const friday = buildRecommendationContext({
    now: new Date("2026-05-22T19:00:00"),
  });
  assert.ok(friday.preferredCategories.includes("bbq_grill_nights") || friday.dayOfWeek === 5);
  const hints = contextHintsForDisplay(friday);
  assert.ok(hints.length > 0, "context hints generated");

  const suggestions = buildContextualSuggestions({ crewSize: 14, maxReadyMinutes: 25 });
  assert.equal(suggestions.engineVersion, RECOMMENDATION_ENGINE_VERSION);
  assert.ok(suggestions.suggestions.length > 0);
  console.log("  ✓ contextual recommendations");
}

console.log("[test-recommendation-engine] Stage 4 recommendation engine");
testMasterRails();
testScoring();
testRotationAndRank();
testContext();
console.log("[test-recommendation-engine] All checks passed.");
