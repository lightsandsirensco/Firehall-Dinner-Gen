/**
 * Editorial internal link clusters for Golden 100 recipe pages.
 * Builds topical groups (protein, method, meal type, hall themes) without keyword stuffing.
 */

import type { GoldenCatalogIndexEntry } from "./recipe-page-schema.js";

export type LinkClusterId =
  | "same_protein"
  | "same_method"
  | "same_meal_type"
  | "hall_favorites"
  | "quick_meals"
  | "healthy_meals"
  | "bbq_meals"
  | "comfort_meals";

export type CookingMethodId =
  | "grill_smoker"
  | "sheet_pan"
  | "skillet_stovetop"
  | "oven_bake"
  | "slow_cooker"
  | "one_pot";

export interface RecipeInternalLink {
  slug: string;
  title: string;
}

export interface RecipeLinkCluster {
  id: LinkClusterId;
  heading: string;
  links: RecipeInternalLink[];
}

export interface BuildLinkClustersOptions {
  maxPerCluster?: number;
  minPerCluster?: number;
  equipment?: string[];
}

const DEFAULT_MAX = 4;
const DEFAULT_MIN = 2;

const PROTEIN_HEADINGS: Record<string, string> = {
  chicken: "More chicken dinners for the crew",
  beef: "More beef nights at the hall",
  pork: "More pork meals crews love",
  turkey: "More turkey shift dinners",
  seafood: "More seafood nights",
  vegetarian: "More plant-forward hall meals",
  mixed: "More mixed-protein spreads",
  lamb: "More lamb & hearty plates",
};

const METHOD_HEADINGS: Record<CookingMethodId, string> = {
  grill_smoker: "More grill & smoker nights",
  sheet_pan: "More sheet-pan dinners",
  skillet_stovetop: "More skillet & stovetop meals",
  oven_bake: "More oven-baked hall spreads",
  slow_cooker: "More slow-cooker shift meals",
  one_pot: "More one-pot crew dinners",
};

const MEAL_FORMAT_HEADINGS: Record<string, string> = {
  pasta: "More pasta nights",
  bowl: "More bowl meals",
  burger: "More burger nights",
  tacos: "More taco spreads",
  sandwich: "More sandwich lines",
  pizza: "More pizza nights",
  soup_chili: "More chili & soup batches",
  grill: "More straight-off-the-grill plates",
  salad: "More salad-forward spreads",
  breakfast: "More breakfast & brunch",
  casserole: "More casserole bakes",
  rice: "More rice-based dinners",
  wrap: "More wrap nights",
};

function formatMealFormat(fmt: string): string {
  return fmt.replace(/_/g, " ");
}

export function inferCookingMethod(
  entry: GoldenCatalogIndexEntry,
  equipment: string[] = [],
): CookingMethodId {
  const eq = equipment.join(" ").toLowerCase();
  const fmt = entry.mealFormat.toLowerCase();
  const cat = entry.category;

  if (
    cat === "bbq_grill_nights" ||
    /grill|smoker|bbq|barbecue/.test(eq) ||
    fmt === "grill"
  ) {
    return "grill_smoker";
  }
  if (cat === "pizza_night" || fmt === "pizza" || /pizza stone|oven/.test(eq)) {
    return "oven_bake";
  }
  if (/sheet pan|sheet-pan/.test(eq) || fmt.includes("sheet")) {
    return "sheet_pan";
  }
  if (/slow cooker|crock|dutch oven.*low/i.test(eq) || cat === "meal_prep_leftovers") {
    return "slow_cooker";
  }
  if (
    fmt === "soup_chili" ||
    /dutch oven|stock pot|large pot/.test(eq) ||
    entry.tags.some((t) => t.includes("one_pot"))
  ) {
    return "one_pot";
  }
  if (cat === "quick_shift_meals" || /skillet|flat-top|wok/.test(eq)) {
    return "skillet_stovetop";
  }
  if (/oven|bake|roast/.test(eq) || fmt === "casserole") {
    return "oven_bake";
  }
  return "skillet_stovetop";
}

function isHallFavorite(entry: GoldenCatalogIndexEntry): boolean {
  return (
    entry.category === "firehall_classics" ||
    entry.popularityWeight >= 3.2 ||
    entry.tags.some((t) => t === "trending" || t.includes("classic"))
  );
}

function isQuickMeal(entry: GoldenCatalogIndexEntry): boolean {
  return (
    entry.category === "quick_shift_meals" ||
    entry.category === "rookie_friendly" ||
    entry.cookTime <= 40 ||
    entry.tags.some((t) => t.includes("quick"))
  );
}

function isHealthyMeal(entry: GoldenCatalogIndexEntry): boolean {
  return (
    entry.category === "healthy_performance" ||
    entry.tags.some((t) => t.includes("healthy") || t.includes("performance"))
  );
}

function isBbqMeal(entry: GoldenCatalogIndexEntry): boolean {
  return (
    entry.category === "bbq_grill_nights" ||
    entry.tags.some((t) => t.includes("bbq"))
  );
}

function isComfortMeal(entry: GoldenCatalogIndexEntry): boolean {
  return (
    entry.category === "comfort_food" ||
    entry.tags.some((t) => t.includes("comfort") || t.includes("hearty"))
  );
}

function pickTop(
  candidates: GoldenCatalogIndexEntry[],
  scoreFn: (c: GoldenCatalogIndexEntry) => number,
  excludeSlug: string,
  max: number,
): RecipeInternalLink[] {
  return candidates
    .filter((c) => c.slug !== excludeSlug)
    .map((c) => ({ entry: c, score: scoreFn(c) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, max)
    .map(({ entry }) => ({ slug: entry.slug, title: entry.title }));
}

function cluster(
  id: LinkClusterId,
  heading: string,
  links: RecipeInternalLink[],
  min: number,
): RecipeLinkCluster | null {
  if (links.length < min) return null;
  return { id, heading, links };
}

export function buildRecipeLinkClusters(
  current: GoldenCatalogIndexEntry,
  catalog: GoldenCatalogIndexEntry[],
  options: BuildLinkClustersOptions = {},
): RecipeLinkCluster[] {
  const max = options.maxPerCluster ?? DEFAULT_MAX;
  const min = options.minPerCluster ?? DEFAULT_MIN;
  const equipment = options.equipment ?? [];
  const method = inferCookingMethod(current, equipment);

  const others = catalog.filter((c) => c.slug !== current.slug);

  const clusters: Array<RecipeLinkCluster | null> = [
    cluster(
      "same_protein",
      PROTEIN_HEADINGS[current.protein] ??
        `More ${current.protein.replace(/_/g, " ")} meals for the hall`,
      pickTop(
        others.filter((c) => c.protein === current.protein),
        (c) =>
          10 +
          (c.mealFormat === current.mealFormat ? 4 : 0) +
          (c.category === current.category ? 3 : 0) +
          c.popularityWeight,
        current.slug,
        max,
      ),
      min,
    ),
    cluster(
      "same_method",
      METHOD_HEADINGS[method],
      pickTop(
        others.filter((c) => inferCookingMethod(c) === method),
        (c) =>
          8 +
          (c.protein === current.protein ? 5 : 0) +
          (Math.abs(c.cookTime - current.cookTime) <= 20 ? 4 : 0) +
          c.firefighterScore * 0.02,
        current.slug,
        max,
      ),
      min,
    ),
    cluster(
      "same_meal_type",
      MEAL_FORMAT_HEADINGS[current.mealFormat] ??
        `More ${formatMealFormat(current.mealFormat)} meals`,
      pickTop(
        others.filter((c) => c.mealFormat === current.mealFormat),
        (c) =>
          10 +
          (c.cuisine === current.cuisine ? 4 : 0) +
          (c.protein === current.protein ? 3 : 0) +
          c.popularityWeight,
        current.slug,
        max,
      ),
      min,
    ),
    cluster(
      "hall_favorites",
      "Hall favorites crews ask for again",
      pickTop(
        others.filter(isHallFavorite),
        (c) => c.popularityWeight * 10 + c.firefighterScore * 0.05,
        current.slug,
        max,
      ),
      min,
    ),
    cluster(
      "quick_meals",
      "Quick shift dinners",
      pickTop(
        others.filter(isQuickMeal),
        (c) => 50 - c.cookTime + (c.difficulty === "easy" ? 8 : 0),
        current.slug,
        max,
      ),
      min,
    ),
    cluster(
      "healthy_meals",
      "Lighter performance meals",
      pickTop(
        others.filter(isHealthyMeal),
        (c) => c.firefighterScore * 0.1 + (c.cookTime <= 45 ? 5 : 0),
        current.slug,
        max,
      ),
      min,
    ),
    cluster(
      "bbq_meals",
      "BBQ & grill nights",
      pickTop(
        others.filter(isBbqMeal),
        (c) =>
          c.popularityWeight * 8 +
          (inferCookingMethod(c) === "grill_smoker" ? 6 : 0),
        current.slug,
        max,
      ),
      min,
    ),
    cluster(
      "comfort_meals",
      "Comfort food after a long call",
      pickTop(
        others.filter(isComfortMeal),
        (c) =>
          c.popularityWeight * 6 +
          (c.tags.some((t) => t.includes("comfort")) ? 5 : 0),
        current.slug,
        max,
      ),
      min,
    ),
  ];

  const merged = clusters.filter((c): c is RecipeLinkCluster => c !== null);

  // Avoid repeating the same recipe across clusters on one page.
  const usedSlugs = new Set<string>([current.slug]);
  const deduped: RecipeLinkCluster[] = [];
  for (const c of merged) {
    const links = c.links.filter((l) => {
      if (usedSlugs.has(l.slug)) return false;
      usedSlugs.add(l.slug);
      return true;
    });
    if (links.length >= min) {
      deduped.push({ ...c, links });
    }
  }

  return deduped;
}
