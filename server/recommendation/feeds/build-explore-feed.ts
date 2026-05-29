/**
 * Intelligent Explore feed — master-category rails + recommendation ranking.
 */

import { buildSeededExploreCards } from "../../../shared/explore-section-seeds.js";
import type { ExploreEditorialSection } from "../../../shared/explore-editorial.js";
import { RECOMMENDATION_ENGINE_VERSION } from "../../../shared/recommendation/weights.js";
import type { ExploreFeedRecommendationMeta } from "../../../shared/recommendation/types.js";
import { MASTER_CATEGORIES_BY_ID } from "../../../shared/categories/definitions.js";
import type { MasterCategoryId } from "../../../shared/categories/constants.js";
import { log } from "../../logger.js";
import {
  buildHallFavoritesSection,
  exploreUsesCuratedOnly,
  fetchSectionRecipes,
  enrichCard,
  type ExploreFeedSafetyFilters,
  type ExploreSectionSourceCounts,
} from "../../explore-editorial.js";
import { getCuratedStoreStats } from "../../curated-recipe-store.js";
import { buildRecommendationContext, contextHintsForDisplay } from "../context/build-context.js";
import type { BuildRecommendationContextInput } from "../context/build-context.js";
import { getMasterCategoryRailSections } from "../rails/master-rails.js";
import { FeedRotationMemory } from "../rotation/memory.js";
import { rankExploreCardsForRail } from "../ranking/rank-cards.js";
import { diversifyExploreRail } from "./diversify.js";
import {
  currentDaySeed,
  exploreFeedCacheKey,
  getCachedExploreFeed,
  setCachedExploreFeed,
} from "./cache.js";

export interface BuildIntelligentExploreFeedOptions extends BuildRecommendationContextInput {}

export interface IntelligentExploreFeedResult {
  sections: ExploreEditorialSection[];
  meta: ExploreFeedRecommendationMeta;
}

export async function buildIntelligentExploreFeed(
  safety: ExploreFeedSafetyFilters,
  options: BuildIntelligentExploreFeedOptions = {},
): Promise<IntelligentExploreFeedResult> {
  const ctx = buildRecommendationContext({ ...safety, ...options });
  const seenFingerprint =
    options.seenRecipeIds?.length ? `seen${options.seenRecipeIds.join("-")}` : "none";
  const cacheKey = exploreFeedCacheKey(safety, ctx.daySeed, seenFingerprint);

  const cached = getCachedExploreFeed(cacheKey);
  if (cached) {
    const stats = getCuratedStoreStats();
    return {
      sections: cached,
      meta: buildMeta(stats.published, exploreUsesCuratedOnly(), cached, {}, ctx),
    };
  }

  const rotation = new FeedRotationMemory(ctx.seenRecipeIds);
  const sections: ExploreEditorialSection[] = [];
  const sectionSources: Record<string, ExploreSectionSourceCounts> = {};
  const orderedDefs = getMasterCategoryRailSections();

  const BATCH = 4;
  for (let i = 0; i < orderedDefs.length; i += BATCH) {
    const batch = orderedDefs.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map((def) => fetchSectionRecipes(def, safety, ctx.daySeed)),
    );

    for (let j = 0; j < batch.length; j++) {
      const def = batch[j]!;
      const result = batchResults[j] || {
        cards: [],
        sources: { curated: 0, spoonacular: 0, catalog: 0, seed: 0 },
      };
      sectionSources[def.id] = result.sources;
      let raw = result.cards;

      if (
        raw.length === 0 &&
        !exploreUsesCuratedOnly() &&
        process.env.EXPLORE_ALLOW_SEED_FALLBACK === "true"
      ) {
        raw = buildSeededExploreCards(def, ctx.daySeed, def.limit).map((c) => enrichCard(c, def));
        sectionSources[def.id] = { ...result.sources, seed: raw.length };
      }

      const ranked = rankExploreCardsForRail(raw, def, ctx, rotation);
      if (ranked.length === 0) continue;
      const diversified = diversifyExploreRail(ranked, { window: 2 });

      const masterId = def.id as MasterCategoryId;
      const cat = MASTER_CATEGORIES_BY_ID[masterId];

      sections.push({
        id: def.id,
        title: def.title,
        subtitle: def.subtitle,
        layout: def.layout,
        theme: def.theme,
        recipes: diversified,
        masterCategoryId: masterId,
        firefighterHook: cat?.emotional.firefighterHook,
      });
    }

    if (i + BATCH < orderedDefs.length) {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  const staplesSeenIds = new Set(rotation.seenIds);
  const staplesSeenTitles = new Set(rotation.seenTitleKeys);
  const staplesSection = await buildHallFavoritesSection(staplesSeenIds, staplesSeenTitles);
  if (staplesSection) {
    sections.unshift({
      ...staplesSection,
      masterCategoryId: "firehall_classics",
      firefighterHook: MASTER_CATEGORIES_BY_ID.firehall_classics?.emotional.firefighterHook,
    });
  }

  const stats = getCuratedStoreStats();
  const totalRecipes = sections.reduce((n, s) => n + s.recipes.length, 0);
  log(
    `[recommendation] Explore feed v${RECOMMENDATION_ENGINE_VERSION}: ${sections.length} rails, ${totalRecipes} recipes, curated=${stats.published}`,
    "catalog",
  );

  setCachedExploreFeed(cacheKey, sections);

  return {
    sections,
    meta: buildMeta(stats.published, exploreUsesCuratedOnly(), sections, sectionSources, ctx),
  };
}

function buildMeta(
  curatedPublished: number,
  curatedOnly: boolean,
  sections: ExploreEditorialSection[],
  sectionSources: Record<string, ExploreSectionSourceCounts>,
  ctx: ReturnType<typeof buildRecommendationContext>,
): ExploreFeedRecommendationMeta {
  return {
    engineVersion: RECOMMENDATION_ENGINE_VERSION,
    daySeed: ctx.daySeed,
    contextHints: contextHintsForDisplay(ctx),
    curatedPublished,
    curatedOnly,
    totalRecipes: sections.reduce((n, s) => n + s.recipes.length, 0),
    sectionSources,
    railsBuilt: sections.length,
  };
}

export { currentDaySeed };
