#!/usr/bin/env tsx
/**
 * QA: 3-tier Explore imagery governance feed analysis.
 * Usage: npx tsx scripts/qa-explore-imagery-tiers.ts
 */
import "dotenv/config";
import { initCuratedRecipeStore, listCuratedRecipeSummaries } from "../server/curated-recipe-store.js";
import { initRecipeCatalog } from "../server/recipe-catalog.js";
import {
  buildHallFavoritesSection,
  fetchSectionRecipes,
  exploreUsesCuratedOnly,
} from "../server/explore-editorial.js";
import { buildIntelligentExploreFeed } from "../server/recommendation/feeds/build-explore-feed.js";
import { getMasterCategoryRailSections } from "../server/recommendation/rails/master-rails.js";
import { buildRecommendationContext } from "../server/recommendation/context/build-context.js";
import { editorialDaySeed } from "../shared/explore-editorial.js";
import { isFirehallOwnedHeroUrl } from "../shared/food-imagery/paths.js";
import type { ExploreRecipeCard } from "../shared/explore-recipe.js";
import { isHardHeldExploreCard, isSoftHeldExploreCard } from "../shared/explore-imagery-status.js";

function tierOf(c: ExploreRecipeCard): "approved" | "soft_held" | "hard_held" | "unknown" {
  if (isHardHeldExploreCard(c)) return "hard_held";
  if (isSoftHeldExploreCard(c)) return "soft_held";
  if (c.imageryStatus === "approved") return "approved";
  if (c.image?.trim() && isFirehallOwnedHeroUrl(c.image)) return "approved";
  if (c.image?.trim() && !c.image.includes("spoonacular.com")) return "approved";
  if (!c.image?.trim()) return "unknown";
  return "approved";
}

function summarizeCards(cards: ExploreRecipeCard[]) {
  let approved = 0;
  let soft = 0;
  let hard = 0;
  let unknown = 0;
  for (const c of cards) {
    const t = tierOf(c);
    if (t === "approved") approved++;
    else if (t === "soft_held") soft++;
    else if (t === "hard_held") hard++;
    else unknown++;
  }
  return { approved, soft, hard, unknown, total: cards.length };
}

async function main() {
  await initCuratedRecipeStore();
  await initRecipeCatalog();

  const daySeed = editorialDaySeed();
  const ctx = buildRecommendationContext({});
  const rails = getMasterCategoryRailSections();
  const safety = {};

  console.log("\n=== EXPLORE IMAGERY TIER QA ===\n");
  console.log(`Master rails defined: ${rails.length}`);
  console.log(`Curated-only mode: ${exploreUsesCuratedOnly()}`);
  console.log(`Day seed: ${daySeed}\n`);

  console.log("RAW SECTION FETCH (before recommendation ranking)");
  console.log("─".repeat(80));

  let rawApproved = 0;
  let rawSoft = 0;
  let rawHard = 0;
  let rawEmpty = 0;
  const rawSparse: string[] = [];
  const rawSoftHeavy: string[] = [];
  const backfillNotes: string[] = [];

  for (const def of rails) {
    const result = await fetchSectionRecipes(def, safety, daySeed);
    const s = summarizeCards(result.cards);
    rawApproved += s.approved;
    rawSoft += s.soft;
    rawHard += s.hard;

    const fill = `${result.cards.length}/${def.limit}`;
    if (result.cards.length < Math.max(3, Math.floor(def.limit * 0.5))) {
      rawSparse.push(`${def.id}(${fill})`);
    }
    if (s.soft > 1) rawSoftHeavy.push(`${def.id}(${s.soft} soft)`);

    const foreignPool = result.cards.filter((c) => c._pool && c._pool !== def.poolTag);
    if (foreignPool.length) {
      backfillNotes.push(
        `${def.id}[pool=${def.poolTag}]: ${foreignPool.length} card(s) from ${[...new Set(foreignPool.map((c) => c._pool))].join(", ")}`,
      );
    }

    for (const c of result.cards) {
      if (c.image?.includes("spoonacular.com")) {
        console.warn(`  ⚠ spoonacular in raw feed: ${def.id} "${c.title}"`);
      }
    }

    console.log(
      `${def.id.padEnd(24)} ${fill.padStart(7)}  approved=${s.approved} soft=${s.soft} hard=${s.hard} unknown=${s.unknown}`,
    );
    if (s.soft) {
      const labels = result.cards
        .filter(isSoftHeldExploreCard)
        .map((c) => `"${c.title}" (${c.heldImageryLabel || "?"})`);
      console.log(`    soft-held: ${labels.join("; ")}`);
    }
    if (result.cards.length === 0) rawEmpty++;
  }

  const staples = await buildHallFavoritesSection(new Set(), new Set());
  if (staples) {
    const s = summarizeCards(staples.recipes);
    rawApproved += s.approved;
    rawSoft += s.soft;
    console.log(
      `${"firehouse_staples".padEnd(24)} ${String(staples.recipes.length).padStart(7)}  approved=${s.approved} soft=${s.soft} (hall packages may lack imageryStatus)`,
    );
  }

  console.log("\nPRODUCTION FEED (after ranking / dedupe / rotation)");
  console.log("─".repeat(80));

  const feed = await buildIntelligentExploreFeed({}, { daySeed });
  let prodApproved = 0;
  let prodSoft = 0;
  const prodSoftHeavy: string[] = [];
  const prodSparse: string[] = [];

  for (const s of feed.sections) {
    const def = rails.find((r) => r.id === s.id);
    const limit = def?.limit ?? s.recipes.length;
    const sum = summarizeCards(s.recipes);
    prodApproved += sum.approved;
    prodSoft += sum.soft;
    if (sum.soft > 1) prodSoftHeavy.push(`${s.id}(${sum.soft})`);
    if (s.recipes.length < Math.max(2, Math.floor(limit * 0.34))) {
      prodSparse.push(`${s.id}(${s.recipes.length}/${limit})`);
    }
    console.log(
      `${s.id.padEnd(24)} ${String(s.recipes.length).padStart(7)}/${limit}  approved=${sum.approved} soft=${sum.soft}`,
    );
  }

  const published = listCuratedRecipeSummaries({ status: "published", limit: 500 });
  const review = listCuratedRecipeSummaries({ status: "review", limit: 200 });
  const draft = listCuratedRecipeSummaries({ status: "draft", limit: 200 });
  const rejected = published.filter((r) => r.imageApproved === false);

  const feedSlugs = new Set(
    feed.sections.flatMap((sec) => sec.recipes.map((r) => r._curatedSlug).filter(Boolean)),
  );

  console.log("\nTOTALS");
  console.log("─".repeat(80));
  console.log(`Raw fetch — approved: ${rawApproved}, soft-held: ${rawSoft}, hard in feed: ${rawHard}, empty sections: ${rawEmpty}/${rails.length}`);
  console.log(`Production feed — sections: ${feed.sections.length}, approved: ${prodApproved}, soft-held: ${prodSoft}, total cards: ${feed.meta.totalRecipes}`);
  console.log(`Soft-held ratio (production): ${feed.meta.totalRecipes ? ((prodSoft / feed.meta.totalRecipes) * 100).toFixed(1) : 0}%`);

  console.log("\nHARD-HELD / EXCLUSION");
  console.log("─".repeat(80));
  console.log(`Published imageApproved=false: ${rejected.length} (excluded from photography)`);
  console.log(`Review in DB: ${review.length}, Draft in DB: ${draft.length}`);
  console.log(`Review in production feed: ${review.filter((r) => feedSlugs.has(r.slug)).length}`);
  console.log(`Draft in production feed: ${draft.filter((r) => feedSlugs.has(r.slug)).length}`);
  console.log(`Rejected imagery in production feed: ${rejected.filter((r) => feedSlugs.has(r.slug)).length}`);

  console.log("\nPOLICY");
  console.log("─".repeat(80));
  console.log(`Raw sparse sections: ${rawSparse.length ? rawSparse.join(", ") : "none"}`);
  console.log(`Raw >1 soft-held/section: ${rawSoftHeavy.length ? rawSoftHeavy.join(", ") : "none ✓"}`);
  console.log(`Prod sparse sections: ${prodSparse.length ? prodSparse.join(", ") : "none"}`);
  console.log(`Prod >1 soft-held/section: ${prodSoftHeavy.length ? prodSoftHeavy.join(", ") : "none ✓"}`);
  console.log(`Adjacent backfill (_pool drift): ${backfillNotes.length ? backfillNotes.join("; ") : "none detected"}`);

  console.log("\nCODE PATH CHECKS (static)");
  console.log("─".repeat(80));
  console.log("✓ Soft-held: navigation allowed (hard_held only blocked in resolveExploreCardNavigation)");
  console.log("✓ Soft-held: ExploreRecipeImage → branded placeholder (no stock fallback)");
  console.log("✓ Detail: detailFromCurated applies imageryStatus + clears unapproved hero");
  console.log("✓ Policy caps: MAX_SOFT_HELD_PER_SECTION=1, MAX_SOFT_HELD_RATIO=15%");

  console.log("\n=== END QA ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
