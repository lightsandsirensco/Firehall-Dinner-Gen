import { searchRecipes, type SearchOptions } from "./spoonacular";
import { log } from "./logger";
import {
  EXPLORE_EDITORIAL_SECTIONS,
  type ExploreEditorialSection,
  type ExploreSectionDef,
  editorialDaySeed,
  pickSectionQuery,
  sortByAppetiteAppeal,
  dedupeExploreCards,
} from "../shared/explore-editorial.js";
import {
  filterDisplayableExploreCards,
  normalizeExploreRecipeCard,
  type ExploreRecipeCard,
} from "../shared/explore-recipe.js";
import { computeCardPresentation } from "../shared/explore-card-presentation.js";

export interface ExploreFeedSafetyFilters {
  diet?: string;
  intolerances?: string;
  excludeIngredients?: string;
}

function enrichCard(card: ExploreRecipeCard, section: ExploreSectionDef): ExploreRecipeCard {
  const presentation = computeCardPresentation(card, { isCurated: false });
  return {
    ...card,
    _pool: section.poolTag,
    primaryProtein: presentation.primaryProtein,
    comfortLabel: presentation.comfortLabel,
    hookLine: presentation.hookLine,
    badges: presentation.badges,
  };
}

async function fetchSectionRecipes(
  section: ExploreSectionDef,
  safety: ExploreFeedSafetyFilters,
  seenIds: Set<number>,
  daySeed: number,
): Promise<ExploreRecipeCard[]> {
  const query = pickSectionQuery(section, daySeed);
  const searchOpts: SearchOptions = {
    number: Math.min(section.limit + 4, 12),
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
    const cards = result.results
      .filter((r) => !seenIds.has(r.id))
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
      .filter((c): c is ExploreRecipeCard => c !== null);

    const displayable = filterDisplayableExploreCards(cards);
    const sorted = sortByAppetiteAppeal(displayable, section.appetiteBoost ?? 0);
    return sorted.slice(0, section.limit).map((c) => enrichCard(c, section));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[explore] Section "${section.id}" failed: ${msg}`, "spoonacular");
    return [];
  }
}

/** Curated hall picks — editorial, not Spoonacular random */
async function buildHallFavoritesSection(
  seenIds: Set<number>,
  seenTitles: Set<string>,
): Promise<ExploreEditorialSection | null> {
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
    const syntheticId = 900_000 + i;
    if (seenIds.has(syntheticId)) continue;
    if (!pkg.heroImage?.trim()) continue;

    const titleKey = pkg.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);
    if (seenTitles.has(titleKey)) continue;

    seenIds.add(syntheticId);
    seenTitles.add(titleKey);

    const card: ExploreRecipeCard = {
      id: syntheticId,
      title: pkg.title,
      image: pkg.heroImage,
      imageAlt: pkg.imageAlt || pkg.title,
      readyInMinutes: 45,
      servings: 8,
      summary: `Hall classic · ${pkg.protein} · ${pkg.style}`,
      sourceUrl: "",
      cuisines: [],
      diets: [],
      _curatedSlug: pkg.slug,
      _pool: "hall_classic",
      hookLine: "Station classic · crew-approved",
      primaryProtein: pkg.protein,
      comfortLabel: "Comfort Food",
    };
    recipes.push(card);
  }

  if (recipes.length === 0) return null;

  return {
    id: "hall_favorites",
    title: "Station Classics",
    subtitle: "Crowd favourites built for the firehall kitchen",
    layout: "rail",
    recipes,
  };
}

export async function buildExploreEditorialFeed(
  safety: ExploreFeedSafetyFilters,
  clientSeenIds: number[] = [],
): Promise<ExploreEditorialSection[]> {
  const seenIds = new Set<number>(clientSeenIds.filter((id) => Number.isFinite(id) && id > 0));
  const seenTitles = new Set<string>();
  const daySeed = editorialDaySeed();
  const sections: ExploreEditorialSection[] = [];

  const hallSection = await buildHallFavoritesSection(seenIds, seenTitles);
  if (hallSection) sections.push(hallSection);

  const orderedDefs = [...EXPLORE_EDITORIAL_SECTIONS].sort((a, b) => a.priority - b.priority);

  const BATCH = 2;
  for (let i = 0; i < orderedDefs.length; i += BATCH) {
    const batch = orderedDefs.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map((def) => fetchSectionRecipes(def, safety, seenIds, daySeed)),
    );

    for (let j = 0; j < batch.length; j++) {
      const def = batch[j]!;
      const raw = batchResults[j] || [];
      const deduped = dedupeExploreCards(raw, seenIds, seenTitles);
      if (deduped.length === 0) continue;

      sections.push({
        id: def.id,
        title: def.title,
        subtitle: def.subtitle,
        layout: def.layout,
        recipes: deduped,
      });
    }

    if (i + BATCH < orderedDefs.length) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  log(
    `[explore] Editorial feed: ${sections.length} sections, ${sections.reduce((n, s) => n + s.recipes.length, 0)} recipes`,
    "spoonacular",
  );

  return sections;
}
