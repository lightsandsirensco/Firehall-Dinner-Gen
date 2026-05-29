/**
 * Explore full-catalog browse — approved hall catalog entries with filter metadata.
 */

import type { CatalogPublicBadge } from "./hall-catalog/gate.js";

export type ExploreCatalogTraitFilter =
  | "healthy_performance"
  | "comfort_food"
  | "bbq_grill"
  | "quick_shift"
  | "feed_a_crowd"
  | "hall_classic"
  | "high_protein"
  | "low_cleanup";

export type ExploreCatalogCookTimeBucket = "under_30" | "30_to_60" | "over_60";

export interface ExploreCatalogBrowseEntry {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  cuisine: string;
  protein: string;
  mealFormat: string;
  cookTime: number;
  cookTimeBucket: ExploreCatalogCookTimeBucket;
  heroImage: string;
  thumbImage: string;
  tags: string[];
  keyTags: string[];
  /** Lowercase haystack for title, tags, cuisine, protein, meal type search */
  searchText: string;
  catalogBadge: CatalogPublicBadge;
  traitBadges: CatalogPublicBadge[];
  traits: ExploreCatalogTraitFilter[];
  isHallClassic: boolean;
}

export interface ExploreCatalogBrowseResponse {
  version: 1;
  recipeCount: number;
  recipes: ExploreCatalogBrowseEntry[];
  _source: "hall_catalog";
}

export const EXPLORE_CATALOG_TRAIT_LABELS: Record<ExploreCatalogTraitFilter, string> = {
  healthy_performance: "Healthy / Performance",
  comfort_food: "Comfort Food",
  bbq_grill: "BBQ & Grill",
  quick_shift: "Quick Shift Meal",
  feed_a_crowd: "Feed a Crowd",
  hall_classic: "Hall Classic",
  high_protein: "High Protein",
  low_cleanup: "Low Cleanup",
};

export const EXPLORE_CATALOG_COOK_TIME_LABELS: Record<ExploreCatalogCookTimeBucket, string> = {
  under_30: "Under 30 min",
  "30_to_60": "30–60 min",
  over_60: "Over 60 min",
};

export function formatExploreCatalogCategory(id: string): string {
  return id.replace(/_/g, " ");
}

export function exploreCatalogCookTimeBucket(minutes: number): ExploreCatalogCookTimeBucket {
  if (minutes < 30) return "under_30";
  if (minutes <= 60) return "30_to_60";
  return "over_60";
}
