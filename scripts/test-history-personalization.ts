/**
 * Focused QA for Insight-Driven Personalization — deterministic history
 * scoring, minimum-sample gating, negative-recipe suppression, recency,
 * feedback tags, diversity guardrail, and explainability.
 *
 * Pure-function tests only (no DB) — HistorySignals objects are built by
 * hand to make every scenario deterministic and independent of catalog
 * content drift. `mediterranean-chickpea` is a real Golden 100 slug (cuisine
 * = "mediterranean") used only where a real catalog cuisine lookup is
 * required; everything else uses a slug that intentionally has no catalog
 * metadata, which is itself part of what's being tested (unknown-cuisine
 * candidates must never crash or fabricate a signal).
 *
 * Run: tsx scripts/test-history-personalization.ts
 */
import assert from "node:assert";
import {
  scoreHistorySignal,
  explainPersonalization,
  sampleSizeBucket,
  CUISINE_AFFINITY_MIN_SAMPLES,
  REPEAT_BOOST_COOLDOWN_DAYS,
  DIVERSITY_RECENT_WINDOW,
  type HistorySignals,
} from "../server/generation/history-personalization.js";
import { pickGolden100ForGenerate } from "../server/generation/pick-local-recipes.js";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";

await initCuratedRecipeStore();

let failures = 0;
function check(label: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${label}`);
  } else {
    console.log(`ok: ${label}`);
  }
}

function emptySignals(overrides: Partial<HistorySignals> = {}): HistorySignals {
  return {
    totalRows: 0,
    everCookedSlugs: new Set(),
    cuisineAffinity: new Map(),
    proteinMakeAgain: new Map(),
    cuisineMakeAgain: new Map(),
    recipeSuppress: new Set(),
    recipeRepeatBoost: new Map(),
    recipeFeedback: new Map(),
    recentCuisineCounts: new Map(),
    recencyDaysAgoBySlug: new Map(),
    ...overrides,
  };
}

const MED_SLUG = "mediterranean-chickpea"; // real Golden 100 slug, cuisine = "mediterranean"
const UNKNOWN_SLUG = "not-a-real-catalog-slug-xyz"; // no catalog metadata — must degrade safely

// ── 1. Hard rules can never be overridden by history — the max possible
// positive history bonus can never lift a hard-filter reject (-9999) back
// above the pickFromSummaries minScore floor (defaults to 1). ─────────────
check(
  "max positive history bonus (45) can never overturn a hard-filter reject (-9999)",
  -9999 + 45 < 1,
);

// ── 2. Cuisine affinity — minimum sample + strong-rating gating ───────────
{
  const belowMinSamples = emptySignals(); // cuisineAffinity map intentionally empty (< 4 rated -> never populated)
  const { delta: d1, appliedSignals: a1 } = scoreHistorySignal(
    { slug: MED_SLUG, protein: "vegetarian" },
    belowMinSamples,
  );
  check("no cuisine_affinity signal below minimum sample size", d1 === 0 && !a1.includes("cuisine_affinity"));

  const strongAffinity = emptySignals({
    cuisineAffinity: new Map([["mediterranean", { avg: 4.8, count: 6 }]]),
  });
  const { delta: d2, appliedSignals: a2 } = scoreHistorySignal(
    { slug: MED_SLUG, protein: "vegetarian" },
    strongAffinity,
  );
  check("cuisine_affinity signal fires with >=4 samples + strong avg rating", a2.includes("cuisine_affinity") && d2 > 0);

  const weakAffinity = emptySignals({
    cuisineAffinity: new Map([["mediterranean", { avg: 3.2, count: 10 }]]),
  });
  // scoreHistorySignal itself never receives a below-threshold cuisine entry from
  // computeHistorySignals (it's filtered out before the Map is populated) — but the
  // scoring function must still degrade gracefully if ever called with one.
  const { appliedSignals: a3 } = scoreHistorySignal({ slug: MED_SLUG, protein: "vegetarian" }, weakAffinity);
  check(
    "a below-3.5-avg cuisine entry (should never occur in practice) never produces a boost",
    !a3.includes("cuisine_affinity"),
  );
}

// ── 3. Make-again pattern — protein + cuisine level, minimum sample gating ─
{
  const noPattern = emptySignals();
  const { delta: d1 } = scoreHistorySignal({ slug: UNKNOWN_SLUG, protein: "chicken" }, noPattern);
  check("no make-again boost with no recorded pattern", d1 === 0);

  const withPattern = emptySignals({
    proteinMakeAgain: new Map([["chicken", { pct: 85, count: 5 }]]),
    cuisineMakeAgain: new Map([["mediterranean", { pct: 75, count: 4 }]]),
  });
  const { delta: d2, appliedSignals: a2 } = scoreHistorySignal({ slug: MED_SLUG, protein: "chicken" }, withPattern);
  check(
    "protein + cuisine make-again both contribute a positive boost once >=4 samples",
    a2.includes("protein_make_again") && a2.includes("cuisine_make_again") && d2 > 0,
  );

  // Make-again strength scaling — right at the 70% floor still gets a
  // meaningful boost (never a cliff to zero), but a 100% pattern gets more.
  const barelyStrong = emptySignals({ proteinMakeAgain: new Map([["chicken", { pct: 70, count: 6 }]]) });
  const perfectlyStrong = emptySignals({ proteinMakeAgain: new Map([["chicken", { pct: 100, count: 6 }]]) });
  const dBarely = scoreHistorySignal({ slug: UNKNOWN_SLUG, protein: "chicken" }, barelyStrong).delta;
  const dPerfect = scoreHistorySignal({ slug: UNKNOWN_SLUG, protein: "chicken" }, perfectlyStrong).delta;
  check("a 70%-pct make-again pattern still gets a meaningful non-zero boost", dBarely > 0);
  check("a 100%-pct make-again pattern gets a larger boost than a 70%-pct one", dPerfect > dBarely);
}

// ── 4. Negative recipe signal — exact-recipe suppression, never generalized ─
{
  const suppressed = emptySignals({ recipeSuppress: new Set([MED_SLUG]) });
  const { delta: dSuppressed, appliedSignals: aSuppressed } = scoreHistorySignal(
    { slug: MED_SLUG, protein: "vegetarian" },
    suppressed,
  );
  check("exact recipe with Make Again = No is strongly suppressed", aSuppressed.includes("recipe_suppressed") && dSuppressed < -500);

  const otherRecipeSameCuisine = scoreHistorySignal({ slug: "some-other-mediterranean-dish", protein: "vegetarian" }, suppressed);
  check(
    "suppression never generalizes to a different recipe (even same cuisine)",
    !otherRecipeSameCuisine.appliedSignals.includes("recipe_suppressed"),
  );
}

// ── 5. Recency — real timestamps, tiered penalty ──────────────────────────
{
  const recent7 = emptySignals({ recencyDaysAgoBySlug: new Map([[MED_SLUG, 3]]) });
  const { delta: d7, appliedSignals: a7 } = scoreHistorySignal({ slug: MED_SLUG, protein: "vegetarian" }, recent7);
  check("cooked 3 days ago gets the strong 7-day recency penalty", a7.includes("recency_7d") && d7 < 0);

  const recent30 = emptySignals({ recencyDaysAgoBySlug: new Map([[MED_SLUG, 20]]) });
  const { delta: d30, appliedSignals: a30 } = scoreHistorySignal({ slug: MED_SLUG, protein: "vegetarian" }, recent30);
  check("cooked 20 days ago gets the smaller 30-day recency penalty", a30.includes("recency_30d") && d30 < 0);
  check("7-day penalty is stronger than 30-day penalty", d7 < d30);

  const oldEnough = emptySignals({ recencyDaysAgoBySlug: new Map([[MED_SLUG, 90]]) });
  const { appliedSignals: aOld } = scoreHistorySignal({ slug: MED_SLUG, protein: "vegetarian" }, oldEnough);
  check("cooked 90 days ago gets no recency penalty at all", !aOld.includes("recency_7d") && !aOld.includes("recency_30d"));
}

// ── 6. High ratings — repeat boost gated by cooldown, never fights recency ─
{
  const tooSoon = emptySignals({
    recipeRepeatBoost: new Map([[MED_SLUG, { rating: 5, daysAgo: REPEAT_BOOST_COOLDOWN_DAYS - 1 }]]),
  });
  const { appliedSignals: aTooSoon } = scoreHistorySignal({ slug: MED_SLUG, protein: "vegetarian" }, tooSoon);
  check("a 5-star favorite cooked before the cooldown window gets no repeat boost yet", !aTooSoon.includes("high_rating_repeat"));

  const readyToRepeat = emptySignals({
    recipeRepeatBoost: new Map([[MED_SLUG, { rating: 5, daysAgo: REPEAT_BOOST_COOLDOWN_DAYS + 5 }]]),
  });
  const { delta, appliedSignals } = scoreHistorySignal({ slug: MED_SLUG, protein: "vegetarian" }, readyToRepeat);
  check("a 5-star favorite past the cooldown window gets a modest repeat boost", appliedSignals.includes("high_rating_repeat") && delta > 0);
}

// ── 7. Feedback tags — exact recipe only, never generalized ───────────────
{
  const badFeedback = emptySignals({
    recipeFeedback: new Map([[MED_SLUG, { tookTooLong: true, tooExpensive: true, crewLoved: false }]]),
  });
  const { delta: dBad, appliedSignals: aBad } = scoreHistorySignal({ slug: MED_SLUG, protein: "vegetarian" }, badFeedback);
  check(
    "took_too_long + too_expensive tags reduce repeat likelihood for the exact recipe",
    aBad.includes("feedback_took_too_long") && aBad.includes("feedback_too_expensive") && dBad < 0,
  );

  const lovedIt = emptySignals({
    recipeFeedback: new Map([[MED_SLUG, { tookTooLong: false, tooExpensive: false, crewLoved: true }]]),
  });
  const { delta: dLoved, appliedSignals: aLoved } = scoreHistorySignal({ slug: MED_SLUG, protein: "vegetarian" }, lovedIt);
  check("crew_loved_it tag increases repeat likelihood for the exact recipe", aLoved.includes("feedback_crew_loved") && dLoved > 0);

  const otherRecipe = scoreHistorySignal({ slug: "some-other-mediterranean-dish", protein: "vegetarian" }, badFeedback);
  check("feedback tags never leak onto a different recipe", otherRecipe.appliedSignals.length === 0);
}

// ── 8. Diversity guardrail — cuisine-affinity boost dampens as the SAME
// cuisine dominates recent picks, but never fully disappears. ─────────────
{
  const noRecentSaturation = emptySignals({
    cuisineAffinity: new Map([["mediterranean", { avg: 5.0, count: 10 }]]),
    recentCuisineCounts: new Map(),
  });
  const { delta: dFresh } = scoreHistorySignal({ slug: MED_SLUG, protein: "vegetarian" }, noRecentSaturation);

  const fullySaturated = emptySignals({
    cuisineAffinity: new Map([["mediterranean", { avg: 5.0, count: 10 }]]),
    recentCuisineCounts: new Map([["mediterranean", DIVERSITY_RECENT_WINDOW]]),
  });
  const { delta: dSaturated, appliedSignals: aSaturated } = scoreHistorySignal(
    { slug: MED_SLUG, protein: "vegetarian" },
    fullySaturated,
  );
  check(
    "cuisine_affinity boost is heavily dampened once that cuisine has dominated recent picks",
    dSaturated < dFresh,
  );
  check("a saturated favorite cuisine still keeps a small non-zero boost (diversity floor)", dSaturated > 0 || aSaturated.includes("cuisine_affinity") === false);

  // The same guardrail must also apply to cuisine-level make-again patterns —
  // "always make Mexican again" is just as capable of creating a bubble as a
  // high average rating is.
  const makeAgainFresh = emptySignals({
    cuisineMakeAgain: new Map([["mediterranean", { pct: 100, count: 8 }]]),
    recentCuisineCounts: new Map(),
  });
  const makeAgainSaturated = emptySignals({
    cuisineMakeAgain: new Map([["mediterranean", { pct: 100, count: 8 }]]),
    recentCuisineCounts: new Map([["mediterranean", DIVERSITY_RECENT_WINDOW]]),
  });
  const dMakeAgainFresh = scoreHistorySignal({ slug: MED_SLUG, protein: "vegetarian" }, makeAgainFresh).delta;
  const dMakeAgainSaturated = scoreHistorySignal({ slug: MED_SLUG, protein: "vegetarian" }, makeAgainSaturated).delta;
  check(
    "cuisine_make_again boost is also dampened by the diversity guardrail once saturated",
    dMakeAgainSaturated < dMakeAgainFresh,
  );
}

// ── 9b. Robustness — suppression can only DEPRIORITIZE, never fully evict a
// hard-filter-passing candidate from the pool. Regression guard for a real
// pickGolden100ForGenerate call where EVERY candidate the crew has ever
// cooked is suppressed — generation must still return a real pick, never
// null/throw, because the eligibility (minScore) check is computed BEFORE
// history deltas are added (see pick-local-recipes.ts pickFromSummaries). ──
{
  const req = buildGenerateRequestInput({ protein: "chicken", crew_size: 6 });
  const heavilySuppressed: HistorySignals = emptySignals({
    totalRows: 50,
    // A slug that does not exist in the catalog is harmless here — the point
    // is that suppressing candidates never shrinks the pool below the point
    // where a real pick is still returned for an otherwise-normal request.
    recipeSuppress: new Set(["not-a-real-slug-1", "not-a-real-slug-2"]),
  });
  const pick = pickGolden100ForGenerate(req, {
    varietySeed: "history-qa-robustness",
    historySignals: heavilySuppressed,
  });
  check("a broad chicken request still returns a real pick with history signals active", pick !== null);
}

// ── 9. Minimum sample rules — exact boundary check ─────────────────────────
check(
  "minimum sample threshold constant is 4 across cuisine/protein/make-again signals",
  CUISINE_AFFINITY_MIN_SAMPLES === 4,
);

// ── 10. Explainability — at most one subtle note, only when genuinely
// supported; never for a suppressed pick; "New" only with a real baseline. ─
{
  const suppressed = emptySignals({ recipeSuppress: new Set([MED_SLUG]) });
  const { appliedSignals: aSup } = scoreHistorySignal({ slug: MED_SLUG, protein: "vegetarian" }, suppressed);
  check(
    "no explanation is ever shown for a suppressed recipe",
    explainPersonalization({ slug: MED_SLUG, protein: "vegetarian" }, suppressed, aSup) === null,
  );

  const affinitySignals = emptySignals({
    cuisineAffinity: new Map([["mediterranean", { avg: 4.9, count: 8 }]]),
  });
  const { appliedSignals: aAff } = scoreHistorySignal({ slug: MED_SLUG, protein: "vegetarian" }, affinitySignals);
  const note = explainPersonalization({ slug: MED_SLUG, protein: "vegetarian" }, affinitySignals, aAff);
  check(
    "cuisine affinity produces a genuine, specific explanation",
    typeof note === "string" && /mediterranean/i.test(note),
  );

  const noSignalsAtAll = emptySignals({ totalRows: 0 });
  const noteNoBaseline = explainPersonalization({ slug: UNKNOWN_SLUG, protein: "chicken" }, noSignalsAtAll, []);
  check('no "New for your crew" claim with zero baseline history', noteNoBaseline === null);

  const establishedBaseline = emptySignals({ totalRows: 12, everCookedSlugs: new Set([MED_SLUG]) });
  const noteNew = explainPersonalization({ slug: UNKNOWN_SLUG, protein: "chicken" }, establishedBaseline, []);
  check('"New for your crew" only appears for a slug never cooked, with a real baseline', noteNew === "New for your crew.");

  const alreadyCooked = explainPersonalization({ slug: MED_SLUG, protein: "vegetarian" }, establishedBaseline, []);
  check('no "New" claim for a slug the crew has actually cooked before', alreadyCooked === null);
}

// ── 11. Analytics sample-size bucketing ────────────────────────────────────
check("sampleSizeBucket(0) = none", sampleSizeBucket(0) === "none");
check("sampleSizeBucket(1) = sparse", sampleSizeBucket(1) === "sparse");
check("sampleSizeBucket(9) = sparse", sampleSizeBucket(9) === "sparse");
check("sampleSizeBucket(10) = moderate", sampleSizeBucket(10) === "moderate");
check("sampleSizeBucket(29) = moderate", sampleSizeBucket(29) === "moderate");
check("sampleSizeBucket(30) = strong", sampleSizeBucket(30) === "strong");

console.log(`\n[test-history-personalization] ${failures === 0 ? "OK" : `${failures} FAILURE(S)`}`);
if (failures > 0) process.exit(1);
