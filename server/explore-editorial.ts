import { searchRecipes, type SearchOptions } from "./spoonacular";
import { listCatalogForExplorePool } from "./recipe-catalog.js";
import {
  countPublishedCuratedRecipes,
  getCuratedStoreStats,
  listCuratedForExplorePool,
} from "./curated-recipe-store.js";
import type { CuratedRecipeSummary } from "../shared/curated-recipe/types.js";
import { buildSeededExploreCards } from "../shared/explore-section-seeds.js";
import type { CanonicalRecipe } from "../shared/canonical-recipe.js";
import { log } from "./logger";
import {
  EXPLORE_EDITORIAL_SECTIONS,
  type ExploreEditorialSection,
  type ExploreSectionDef,
  editorialDaySeed,
  pickSectionQuery,
  dedupeExploreCards,
} from "../shared/explore-editorial.js";
import {
  sortExploreCardsByRank,
  sequenceExploreCardsForDisplay,
} from "../shared/recipe-ranking.js";
import { getClassicHallMeal, resolveClassicHeroImage } from "../shared/classic-hall-meals.js";
import {
  filterDisplayableExploreCards,
  normalizeExploreRecipeCard,
  type ExploreRecipeCard,
} from "../shared/explore-recipe.js";
import { computeCardPresentation } from "../shared/explore-card-presentation.js";
import { exploreIdFromRecipeId } from "../shared/explore-curated-id.js";
import { buildPublisherAttribution } from "../shared/editorial-quality.js";

export interface ExploreFeedSafetyFilters {
  diet?: string;
  intolerances?: string;
  excludeIngredients?: string;
}

function enrichCard(card: ExploreRecipeCard, section: ExploreSectionDef): ExploreRecipeCard {
  const isCurated = Boolean(card._curatedSlug);
  const presentation = computeCardPresentation(card, { isCurated });
  const keepPublisherHook =
    Boolean(card.publisherMedia || card.sourceKind === "publisher") &&
    Boolean(card.hookLine?.trim());
  return {
    ...card,
    _pool: section.poolTag,
    primaryProtein: presentation.primaryProtein,
    comfortLabel: presentation.comfortLabel,
    hookLine: keepPublisherHook ? card.hookLine : presentation.hookLine,
    badges: presentation.badges,
    quickPills: presentation.quickPills,
  };
}

function sectionSearchOffset(section: ExploreSectionDef, daySeed: number): number {
  const hash = section.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return ((daySeed * 5 + hash) % 30) * 2;
}

function catalogToExploreCard(recipe: CanonicalRecipe, section: ExploreSectionDef): ExploreRecipeCard | null {
  const id = recipe.spoonacularId;
  if (!id || id <= 0) return null;
  const card = normalizeExploreRecipeCard(
    {
      id,
      title: recipe.title,
      image: recipe.heroImage,
      imageAlt: recipe.imageAlt || recipe.title,
      readyInMinutes: recipe.totalMinutes || 45,
      servings: recipe.servingsBase || 6,
      summary: recipe.generateResponse?.why_it_fits_tonight || recipe.title,
      sourceUrl: recipe.source?.url || "",
      cuisines: recipe.cuisine ? [recipe.cuisine] : [],
      diets: [],
      _pool: section.poolTag,
      qualityScore: recipe.qualityScore,
    },
    `catalog-${section.id}`,
  );
  return card ? enrichCard(card, section) : null;
}

function exploreUsesCuratedOnly(): boolean {
  if (process.env.EXPLORE_CURATED_ONLY === "false") return false;
  return countPublishedCuratedRecipes() >= 15;
}

function curatedSummaryToExploreCard(
  row: CuratedRecipeSummary,
  section: ExploreSectionDef,
): ExploreRecipeCard | null {
  const publisherMedia =
    Boolean(row.heroImage?.trim()) && !row.heroImage.includes("spoonacular.com");
  const cardId =
    row.spoonacularId && row.spoonacularId > 0
      ? row.spoonacularId
      : exploreIdFromRecipeId(row.recipeId);

  const attribution = buildPublisherAttribution(row.sourceName, row.sourceKind);

  const card = normalizeExploreRecipeCard(
    {
      id: cardId,
      title: row.title,
      image: row.heroImage,
      imageAlt: row.title,
      readyInMinutes: row.totalMinutes || 45,
      servings: 6,
      summary: row.summary || `${attribution} — built for the hall.`,
      sourceUrl: row.sourceUrl || "",
      cuisines: row.cuisine ? [row.cuisine] : [],
      diets: [],
      _pool: section.poolTag,
      _curatedSlug: publisherMedia ? row.slug : row.slug,
      qualityScore: row.scores.quality,
      primaryProtein: row.protein,
      publisherName: row.sourceName,
      fromCuratedDb: true,
      curatedRecipeId: row.recipeId,
      publisherMedia,
      sourceKind: row.sourceKind,
      hookLine: attribution,
    },
    `curated-${section.id}`,
  );
  return card ? enrichCard(card, section) : null;
}

function fetchCuratedSectionRecipes(
  section: ExploreSectionDef,
  daySeed: number,
  limit: number,
): ExploreRecipeCard[] {
  try {
    const rows = listCuratedForExplorePool(section.poolTag, Math.max(limit * 2, 10));
    if (rows.length === 0) return [];

    const hash = section.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const start = (daySeed + hash) % Math.max(1, rows.length);
    const rotated = [...rows.slice(start), ...rows.slice(0, start)];

    const cards: ExploreRecipeCard[] = [];
    for (const row of rotated) {
      if (cards.length >= limit) break;
      const card = curatedSummaryToExploreCard(row, section);
      if (card && filterDisplayableExploreCards([card]).length > 0) {
        cards.push(card);
      }
    }
    return sortExploreCardsByRank(cards, { sectionBoost: section.appetiteBoost ?? 0 })
      .slice(0, limit);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    log(`[explore] Curated pool "${section.id}" failed: ${msg}`, "catalog");
    return [];
  }
}

function fetchCatalogSectionRecipes(
  section: ExploreSectionDef,
  daySeed: number,
  limit: number,
): ExploreRecipeCard[] {
  try {
    const candidates = listCatalogForExplorePool(section.poolTag, Math.max(limit * 2, 12));
    if (candidates.length === 0) return [];

    const hash = section.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const start = (daySeed + hash) % Math.max(1, candidates.length);
    const rotated = [...candidates.slice(start), ...candidates.slice(0, start)];

    const cards: ExploreRecipeCard[] = [];
    for (const row of rotated) {
      if (cards.length >= limit) break;
      const card = catalogToExploreCard(row, section);
      if (card && filterDisplayableExploreCards([card]).length > 0) {
        cards.push(card);
      }
    }
    return sortExploreCardsByRank(cards, { sectionBoost: section.appetiteBoost ?? 0 })
      .slice(0, limit);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[explore] Catalog fallback "${section.id}" failed: ${msg}`, "catalog");
    return [];
  }
}

export type ExploreSectionSourceCounts = {
  curated: number;
  spoonacular: number;
  catalog: number;
  seed: number;
};

async function fetchSectionRecipes(
  section: ExploreSectionDef,
  safety: ExploreFeedSafetyFilters,
  daySeed: number,
): Promise<{ cards: ExploreRecipeCard[]; sources: ExploreSectionSourceCounts }> {
  const sources: ExploreSectionSourceCounts = {
    curated: 0,
    spoonacular: 0,
    catalog: 0,
    seed: 0,
  };

  let cards: ExploreRecipeCard[] = fetchCuratedSectionRecipes(section, daySeed, section.limit);
  sources.curated = cards.length;
  if (cards.length > 0) {
    log(`[explore] Section "${section.id}" curated-db → ${cards.length} cards`, "catalog");
  }

  if (cards.length >= section.limit) {
    return { cards: cards.slice(0, section.limit), sources };
  }

  if (exploreUsesCuratedOnly()) {
    return { cards, sources };
  }

  const query = pickSectionQuery(section, daySeed);
  const searchOpts: SearchOptions = {
    number: Math.min(section.limit + 8, 16),
    offset: sectionSearchOffset(section, daySeed),
    sort: section.sort === "popularity" ? "popularity" : undefined,
    cuisine: query.cuisine,
    maxReadyTime: query.maxReadyTime,
    equipment: query.equipment,
    type: query.type,
    diet: safety.diet,
    intolerances: safety.intolerances,
    excludeIngredients: safety.excludeIngredients,
  };

  try {
    const result = await searchRecipes(query.q, searchOpts);
    const seenInSection = new Set(cards.map((c) => c.id));
    const spoonCards = filterDisplayableExploreCards(
      result.results
        .map((r) =>
          normalizeExploreRecipeCard(
            {
              id: r.id,
              title: r.title,
              image: r.image,
              readyInMinutes: r.readyInMinutes,
              servings: r.servings,
              sourceUrl: r.sourceUrl,
              summary: r.summary,
              cuisines: [],
              diets: [],
              _pool: section.poolTag,
            },
            `section-${section.id}`,
          ),
        )
        .filter((c): c is ExploreRecipeCard => c !== null),
    );

    for (const c of sortExploreCardsByRank(spoonCards, { sectionBoost: section.appetiteBoost ?? 0 })) {
      if (cards.length >= section.limit) break;
      if (seenInSection.has(c.id)) continue;
      cards.push(enrichCard(c, section));
      seenInSection.add(c.id);
      sources.spoonacular++;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[explore] Section "${section.id}" Spoonacular failed: ${msg}`, "spoonacular");
  }

  if (cards.length < section.limit) {
    const catalogCards = fetchCatalogSectionRecipes(section, daySeed, section.limit);
    const seenInSection = new Set(cards.map((c) => c.id));
    for (const c of catalogCards) {
      if (cards.length >= section.limit) break;
      if (seenInSection.has(c.id)) continue;
      cards.push(c);
      seenInSection.add(c.id);
      sources.catalog++;
    }
    if (catalogCards.length > 0) {
      log(`[explore] Section "${section.id}" catalog fill → ${cards.length} cards`, "catalog");
    }
  }

  if (cards.length < section.limit && process.env.EXPLORE_ALLOW_SEED_FALLBACK === "true") {
    const seeds = buildSeededExploreCards(section, daySeed, section.limit);
    const seenInSection = new Set(cards.map((c) => c.id));
    for (const c of seeds) {
      if (cards.length >= section.limit) break;
      if (seenInSection.has(c.id)) continue;
      cards.push(enrichCard(c, section));
      seenInSection.add(c.id);
      sources.seed++;
    }
    if (seeds.length > 0) {
      log(`[explore] Section "${section.id}" hall-seed fill → ${cards.length} cards`, "explore");
    }
  }

  return { cards, sources };
}

/** Crew favorites — curated DB first, then hall packages */
async function buildHallFavoritesSection(
  seenIds: Set<number>,
  seenTitles: Set<string>,
): Promise<ExploreEditorialSection | null> {
  const crewRows = listCuratedForExplorePool("crew_favorite", 8);
  if (crewRows.length >= 4) {
    const def: ExploreSectionDef = {
      id: "firehouse_staples",
      title: "Crew Favorites",
      subtitle: "Hall-tested staples — the meals crews actually make",
      layout: "rail",
      priority: 0,
      poolTag: "crew_favorite",
      theme: "ember",
      queries: [{ q: "crew favorite dinner" }],
      limit: 8,
    };
    const cards = crewRows
      .map((row) => curatedSummaryToExploreCard(row, def))
      .filter((c): c is ExploreRecipeCard => c !== null);
    const deduped = dedupeExploreCards(cards, seenIds, seenTitles);
    if (deduped.length >= 3) {
      return {
        id: def.id,
        title: def.title,
        subtitle: def.subtitle,
        layout: def.layout,
        theme: def.theme,
        recipes: deduped,
      };
    }
  }

  const { CURATED_HALL_PACKAGES } = await import("../shared/curated-hall-packages.js");
  const daySeed = editorialDaySeed();
  const rotated = [...CURATED_HALL_PACKAGES];
  for (let i = rotated.length - 1; i > 0; i--) {
    const j = ((daySeed * (i + 7)) % (i + 1) + i + 1) % (i + 1);
    [rotated[i], rotated[j]] = [rotated[j], rotated[i]];
  }

  const recipes: ExploreRecipeCard[] = [];
  for (let i = 0; i < rotated.length && recipes.length < 6; i++) {
    const pkg = rotated[i]!;
    const recipeId = pkg.spoonacularRecipeId;
    if (!recipeId || recipeId <= 0) continue;
    if (seenIds.has(recipeId)) continue;
    if (!pkg.heroImage?.trim()) continue;

    const titleKey = pkg.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);
    if (seenTitles.has(titleKey)) continue;

    seenIds.add(recipeId);
    seenTitles.add(titleKey);

    const meta = getClassicHallMeal(pkg.slug);
    const heroImage = meta ? resolveClassicHeroImage(meta) : pkg.heroImage;

    const card: ExploreRecipeCard = {
      id: recipeId,
      title: pkg.title,
      image: heroImage,
      imageAlt: meta?.imageAlt || pkg.imageAlt || pkg.title,
      readyInMinutes: 45,
      servings: 8,
      summary: `Hall classic · ${pkg.protein} · ${pkg.cuisineLabel}`,
      sourceUrl: "",
      cuisines: [],
      diets: [],
      _curatedSlug: pkg.slug,
      _pool: "hall_classic",
      hookLine: "Firehouse staple · crew-approved",
      primaryProtein: pkg.protein,
      comfortLabel: "Comfort Food",
    };
    recipes.push(card);
  }

  if (recipes.length === 0) return null;

  return {
    id: "firehouse_staples",
    title: "Crew Favorites",
    subtitle: "Hall-tested staples — the meals crews actually make",
    layout: "rail",
    theme: "ember",
    recipes,
  };
}

const feedCache = new Map<string, { at: number; sections: ExploreEditorialSection[] }>();
const FEED_CACHE_TTL_MS = 10 * 60 * 1000;

function feedCacheKey(safety: ExploreFeedSafetyFilters, daySeed: number): string {
  const published = countPublishedCuratedRecipes();
  return `${daySeed}:pub${published}:${safety.diet || ""}:${safety.intolerances || ""}:${safety.excludeIngredients || ""}`;
}

function imageHostKey(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export interface ExploreEditorialFeedResult {
  sections: ExploreEditorialSection[];
  meta: {
    curatedPublished: number;
    curatedOnly: boolean;
    sectionSources: Record<string, ExploreSectionSourceCounts>;
    totalRecipes: number;
  };
}

export async function buildExploreEditorialFeed(
  safety: ExploreFeedSafetyFilters,
): Promise<ExploreEditorialFeedResult> {
  const daySeed = editorialDaySeed();
  const cacheKey = feedCacheKey(safety, daySeed);
  const cached = feedCache.get(cacheKey);
  if (cached && Date.now() - cached.at < FEED_CACHE_TTL_MS) {
    const stats = getCuratedStoreStats();
    return {
      sections: cached.sections,
      meta: {
        curatedPublished: stats.published,
        curatedOnly: exploreUsesCuratedOnly(),
        sectionSources: {},
        totalRecipes: cached.sections.reduce((n, s) => n + s.recipes.length, 0),
      },
    };
  }

  const sections: ExploreEditorialSection[] = [];
  const sectionSources: Record<string, ExploreSectionSourceCounts> = {};
  const globalSeenIds = new Set<number>();
  const globalSeenTitles = new Set<string>();
  const feedProteins = new Set<string>();
  const feedImageHosts = new Set<string>();

  const orderedDefs = [...EXPLORE_EDITORIAL_SECTIONS].sort((a, b) => a.priority - b.priority);

  const BATCH = 4;
  for (let i = 0; i < orderedDefs.length; i += BATCH) {
    const batch = orderedDefs.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map((def) => fetchSectionRecipes(def, safety, daySeed)),
    );

    for (let j = 0; j < batch.length; j++) {
      const def = batch[j]!;
      const result = batchResults[j] || { cards: [], sources: { curated: 0, spoonacular: 0, catalog: 0, seed: 0 } };
      sectionSources[def.id] = result.sources;
      let raw = result.cards;

      if (
        raw.length === 0 &&
        !exploreUsesCuratedOnly() &&
        process.env.EXPLORE_ALLOW_SEED_FALLBACK === "true"
      ) {
        raw = buildSeededExploreCards(def, daySeed, def.limit).map((c) => enrichCard(c, def));
        sectionSources[def.id] = { ...result.sources, seed: raw.length };
      }

      raw = sortExploreCardsByRank(raw, {
        sectionBoost: def.appetiteBoost ?? 0,
        feedProteins,
        feedImageHosts,
        daySeed,
      });

      const deduped = dedupeExploreCards(raw, globalSeenIds, globalSeenTitles);
      if (deduped.length === 0) continue;

      const sequenced = sequenceExploreCardsForDisplay(deduped, daySeed + def.priority);
      for (const card of sequenced) {
        const pk = (card.primaryProtein || card.title).toLowerCase().slice(0, 20);
        feedProteins.add(pk);
        const host = imageHostKey(card.image);
        if (host) feedImageHosts.add(host);
      }

      sections.push({
        id: def.id,
        title: def.title,
        subtitle: def.subtitle,
        layout: def.layout,
        theme: def.theme,
        recipes: sequenced,
      });
    }

    if (i + BATCH < orderedDefs.length) {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  const staplesSeenIds = new Set(globalSeenIds);
  const staplesSeenTitles = new Set(globalSeenTitles);
  const staplesSection = await buildHallFavoritesSection(staplesSeenIds, staplesSeenTitles);
  if (staplesSection) {
    sections.unshift(staplesSection);
  }

  /** De-dupe trending rail if it duplicated Crew Favorites at top */
  const trendingIdx = sections.findIndex((s) => s.id === "trending_tonight");
  if (trendingIdx > 1 && sections[trendingIdx]!.recipes.length < 3) {
    sections.splice(trendingIdx, 1);
  }

  const stats = getCuratedStoreStats();
  const totalRecipes = sections.reduce((n, s) => n + s.recipes.length, 0);
  log(
    `[explore] Editorial feed: ${sections.length} sections, ${totalRecipes} recipes, curated_published=${stats.published} curated_only=${exploreUsesCuratedOnly()}`,
    "catalog",
  );

  feedCache.set(cacheKey, { at: Date.now(), sections });
  return {
    sections,
    meta: {
      curatedPublished: stats.published,
      curatedOnly: exploreUsesCuratedOnly(),
      sectionSources,
      totalRecipes,
    },
  };
}
