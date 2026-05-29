/**
 * Fuel catalog — smoothies, breakfast, performance drinks.
 * NEVER mix into Golden 100 or dinner recommendation pools.
 */

export const FUEL_SET_TAG_SMOOTHIE = "fuel_smoothie" as const;
export const FUEL_SET_TAG_BREAKFAST = "fuel_breakfast" as const;
export const FUEL_SET_TAG_PERFORMANCE_DRINK = "fuel_performance_drink" as const;

export const FUEL_CATALOG_TAGS = [
  FUEL_SET_TAG_SMOOTHIE,
  FUEL_SET_TAG_BREAKFAST,
  FUEL_SET_TAG_PERFORMANCE_DRINK,
] as const;

export type FuelCatalogTag = (typeof FUEL_CATALOG_TAGS)[number];

export const SMOOTHIE_TAXONOMY = [
  "protein_smoothie",
  "recovery_smoothie",
  "breakfast_smoothie",
  "green_smoothie",
  "fruit_smoothie",
  "coffee_smoothie",
] as const;

export type SmoothieTaxonomy = (typeof SMOOTHIE_TAXONOMY)[number];

export const SMOOTHIE_TAXONOMY_LABELS: Record<SmoothieTaxonomy, string> = {
  protein_smoothie: "Protein",
  recovery_smoothie: "Recovery",
  breakfast_smoothie: "Breakfast",
  green_smoothie: "Green",
  fruit_smoothie: "Fruit",
  coffee_smoothie: "Coffee",
};

export const BREAKFAST_TAXONOMY = [
  "high_protein_breakfast",
  "firehall_breakfast",
  "shift_breakfast",
  "quick_breakfast",
] as const;

export type BreakfastTaxonomy = (typeof BREAKFAST_TAXONOMY)[number];
