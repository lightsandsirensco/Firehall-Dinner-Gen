/**
 * Single source of truth for Explore recipe cards.
 * Spoonacular search cards use recipe id for CDN URLs; hall classics may use heroImagePath overrides.
 */

export type SpoonacularImageSize = "636x393" | "556x370" | "312x231";

import type { ExploreBadge } from "./explore-card-presentation.js";
import { getClassicHallMeal, resolveClassicHeroImage } from "./classic-hall-meals.js";
import { isExploreFeedBlocked } from "./explore-feed-blocklist.js";
import { isFirehallOwnedHeroUrl, normalizeOwnedMediaPath } from "./food-imagery/paths.js";
import { isDevRuntime } from "./runtime-env.js";
import {
  buildCuratedMealImageProfile,
  validateCuratedImageGovernance,
} from "./curated-image-governance/index.js";
import { heroPathConflictsTitle } from "./meal-image-title-match.js";
import type { ExploreHeldImageryLabel, ExploreImageryStatus } from "./explore-imagery-status.js";
import {
  applyImageryGovernanceToCard,
  isHardHeldExploreCard,
  isSoftHeldExploreCard,
  migrateImageryStatus,
} from "./explore-imagery-status.js";

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
  _catalogFallback?: boolean;
  _pool?: string;
  _curatedSlug?: string | null;
  /** Server or client presentation hints */
  primaryProtein?: string;
  comfortLabel?: string;
  badges?: ExploreBadge[];
  /** Server-computed quick pills (30 Min, High Protein, etc.) */
  quickPills?: string[];
  hookLine?: string;
  macros?: { calories?: number; protein_g?: number };
  imageVariants?: { w312: string; w556: string; w636: string };
  qualityScore?: number;
  /** Publisher / partner name from curated_recipes.source_name */
  publisherName?: string;
  /** True when card row came from curated_recipes (not live Spoonacular search) */
  fromCuratedDb?: boolean;
  curatedRecipeId?: string;
  /** Hero image is original publisher/editorial photography (not Spoonacular CDN) */
  publisherMedia?: boolean;
  sourceKind?: string;
  /** Tiered imagery: approved | soft_held (placeholder, clickable) | hard_held (hidden from Explore) */
  imageryStatus?: ExploreImageryStatus;
  /** Anticipation label on soft-held cards */
  heldImageryLabel?: ExploreHeldImageryLabel;
  /** Customer-facing catalog lineage badge */
  catalogBadge?:
    | "Firehall Meals Catalog"
    | "Performance Meal"
    | "Hall Classic"
    | "Crew Favorite"
    | "High Protein"
    | "Quick Shift Meal";
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
  if (!isDevRuntime()) return;
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
  if (isExploreFeedBlocked(title)) return null;

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
    // Curated hall cards: hero URL carries the real Spoonacular id — never rewrite to card.id
    image = raw._curatedSlug
      ? upgradeSpoonacularImageSize(fromApi, "636x393")
      : canonical;
  } else if (fromApi && (!fromApi.includes("spoonacular.com") || isFirehallOwnedHeroUrl(fromApi))) {
    image = normalizeOwnedMediaPath(fromApi);
  }

  // Curated governance: never show owned heroes that conflict with title/protein/format.
  if (image && isFirehallOwnedHeroUrl(image)) {
    if (heroPathConflictsTitle(image, title, raw.primaryProtein)) {
      image = "";
    } else {
      const profile = buildCuratedMealImageProfile({
        slug: String(raw._curatedSlug || id),
        title,
        protein: raw.primaryProtein,
        mealFormat: undefined,
      });
      const gov = validateCuratedImageGovernance({ profile, heroImage: image });
      if (!gov.pass && gov.mismatchConfidence >= 72) {
        image = "";
      }
    }
  }

  let imageAlt = (raw.imageAlt || title).trim() || title;
  const publisherMedia = Boolean(raw.publisherMedia);
  if (raw._curatedSlug && !publisherMedia && !image) {
    const meta = getClassicHallMeal(String(raw._curatedSlug));
    if (meta) {
      const candidate = resolveClassicHeroImage(meta);
      const profile = buildCuratedMealImageProfile({
        slug: meta.slug,
        title,
        protein: raw.primaryProtein || meta.protein,
        mealFormat: meta.mealFormat,
      });
      const gov = validateCuratedImageGovernance({ profile, heroImage: candidate });
      if (gov.pass) {
        image = candidate;
        imageAlt = meta.imageAlt || imageAlt;
      }
    }
  }

  const card: ExploreRecipeCard = {
    id,
    title,
    image,
    imageAlt,
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
    publisherMedia: publisherMedia || isFirehallOwnedHeroUrl(image),
    sourceKind: raw.sourceKind,
    publisherName: raw.publisherName,
    fromCuratedDb: raw.fromCuratedDb,
    curatedRecipeId: raw.curatedRecipeId,
    imageryStatus: migrateImageryStatus(raw.imageryStatus as string | undefined) ?? raw.imageryStatus,
    heldImageryLabel: raw.heldImageryLabel,
    imageVariants: image.includes("spoonacular.com")
      ? {
          w312: spoonacularImageUrl(id, "312x231"),
          w556: spoonacularImageUrl(id, "556x370"),
          w636: spoonacularImageUrl(id, "636x393"),
        }
      : {
          w312: image,
          w556: image,
          w636: image,
        },
  };

  const tier = migrateImageryStatus(raw.imageryStatus as string | undefined) ?? raw.imageryStatus;
  if (!image && tier && tier !== "approved") {
    return applyImageryGovernanceToCard(card, {
      status: undefined,
      imageApproved: tier === "hard_held" ? false : undefined,
      hasApprovedHero: false,
      slug: raw._curatedSlug,
    });
  }

  return card;
}

/** Omit invalid / hard-held cards; keep approved + capped soft-held */
export function filterDisplayableExploreCards(cards: ExploreRecipeCard[]): ExploreRecipeCard[] {
  return cards.filter(
    (c) =>
      !c._firehallFallback &&
      c.id > 0 &&
      !isHardHeldExploreCard(c) &&
      (Boolean(c.image?.trim()) || isSoftHeldExploreCard(c)) &&
      !isExploreFeedBlocked(c.title),
  );
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
