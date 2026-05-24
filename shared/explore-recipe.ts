/**
 * Single source of truth for Explore recipe cards.
 * Images are always derived from Spoonacular recipe id — never mixed across recipes.
 */

export type SpoonacularImageSize = "636x393" | "556x370" | "312x231";

import type { ExploreBadge } from "./explore-card-presentation.js";

/** Atomic Explore card — title, image, and id always travel together. */
export interface ExploreRecipeCard {
  id: number;
  title: string;
  image: string;
  imageAlt: string;
  readyInMinutes: number;
  servings: number;
  summary: string;
  sourceUrl: string;
  cuisines: string[];
  diets: string[];
  _firehallFallback?: boolean;
  _pool?: string;
  _curatedSlug?: string | null;
  /** Server or client presentation hints */
  primaryProtein?: string;
  comfortLabel?: string;
  badges?: ExploreBadge[];
  hookLine?: string;
  macros?: { calories?: number; protein_g?: number };
  imageVariants?: { w312: string; w556: string; w636: string };
  qualityScore?: number;
}

export function spoonacularImageUrl(
  recipeId: number,
  size: SpoonacularImageSize = "636x393",
): string {
  return `https://img.spoonacular.com/recipes/${recipeId}-${size}.jpg`;
}

export function extractRecipeIdFromSpoonacularImage(url: string): number | null {
  const m = url.match(/\/recipes\/(\d+)-/i);
  if (!m) return null;
  const id = parseInt(m[1], 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function upgradeSpoonacularImageSize(
  url: string,
  size: SpoonacularImageSize = "636x393",
): string {
  if (!url.includes("spoonacular.com")) return url;
  return url.replace(/-\d+x\d+\./i, `-${size}.`);
}

function logImageMismatch(title: string, recipeId: number, urlId: number | null, context: string): void {
  const isDev =
    (typeof process !== "undefined" && process.env.NODE_ENV !== "production") ||
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  if (!isDev) return;
  console.warn(
    `[explore:${context}] Image/recipe id mismatch for "${title}": card id=${recipeId}, image url id=${urlId ?? "none"}`,
  );
}

/**
 * Normalize API/search row into a trusted Explore card.
 * Returns null if id/title are invalid.
 */
export function normalizeExploreRecipeCard(
  raw: Partial<ExploreRecipeCard> & { id: unknown; title?: string },
  context = "normalize",
): ExploreRecipeCard | null {
  const title = (raw.title || "").trim();
  if (!title) return null;

  if (raw._firehallFallback) {
    return {
      id: -1,
      title,
      image: "",
      imageAlt: title,
      readyInMinutes: Number(raw.readyInMinutes) || 30,
      servings: Number(raw.servings) || 6,
      summary: (raw.summary || "").replace(/<[^>]*>/g, "").substring(0, 300),
      sourceUrl: "",
      cuisines: [],
      diets: [],
      _firehallFallback: true,
    };
  }

  const id = typeof raw.id === "number" ? raw.id : parseInt(String(raw.id), 10);
  if (!Number.isFinite(id) || id <= 0) return null;

  const fromApi = (raw.image || "").trim();
  const urlId = fromApi ? extractRecipeIdFromSpoonacularImage(fromApi) : null;
  const canonical = spoonacularImageUrl(id);

  let image = canonical;
  if (fromApi && urlId === id) {
    image = upgradeSpoonacularImageSize(fromApi, "636x393");
  } else if (fromApi && urlId !== null && urlId !== id) {
    logImageMismatch(title, id, urlId, context);
    image = canonical;
  } else if (fromApi && !fromApi.includes("spoonacular.com")) {
    image = fromApi;
  }

  const card: ExploreRecipeCard = {
    id,
    title,
    image,
    imageAlt: title,
    readyInMinutes: Number(raw.readyInMinutes) || 0,
    servings: Number(raw.servings) || 0,
    summary: (raw.summary || "").replace(/<[^>]*>/g, "").substring(0, 300),
    sourceUrl: raw.sourceUrl || "",
    cuisines: Array.isArray(raw.cuisines) ? raw.cuisines : [],
    diets: Array.isArray(raw.diets) ? raw.diets : [],
    _firehallFallback: raw._firehallFallback,
    _pool: raw._pool,
    _curatedSlug: raw._curatedSlug ?? null,
    primaryProtein: raw.primaryProtein,
    comfortLabel: raw.comfortLabel,
    badges: raw.badges,
    hookLine: raw.hookLine,
    macros: raw.macros,
    qualityScore: raw.qualityScore,
    imageVariants: {
      w312: spoonacularImageUrl(id, "312x231"),
      w556: spoonacularImageUrl(id, "556x370"),
      w636: spoonacularImageUrl(id, "636x393"),
    },
  };

  return card;
}

/** Omit cards without real photography from browse grids */
export function filterDisplayableExploreCards(cards: ExploreRecipeCard[]): ExploreRecipeCard[] {
  return cards.filter((c) => !c._firehallFallback && c.id > 0 && Boolean(c.image?.trim()));
}

export function normalizeExploreRecipeList(
  items: unknown[],
  context = "list",
): ExploreRecipeCard[] {
  const out: ExploreRecipeCard[] = [];
  for (const item of items) {
    const card = normalizeExploreRecipeCard(item as ExploreRecipeCard, context);
    if (card) out.push(card);
  }
  return out;
}

/** Detail payload — same image rules as cards. */
export function normalizeExploreRecipeDetail<T extends { id: number; title: string; image?: string }>(
  raw: T,
  context = "detail",
): T & { image: string; imageAlt: string } {
  const card = normalizeExploreRecipeCard(
    {
      id: raw.id,
      title: raw.title,
      image: raw.image,
      readyInMinutes: 0,
      servings: 0,
      summary: "",
      sourceUrl: "",
    },
    context,
  );
  return {
    ...raw,
    image: card?.image || spoonacularImageUrl(raw.id),
    imageAlt: raw.title,
  };
}
