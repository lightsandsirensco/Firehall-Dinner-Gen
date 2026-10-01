/**
 * Editorial content strategy — balanced mix across the guide catalog.
 */

import { z } from "zod";

/**
 * Target mix for new guides. The Guides section is a cooking resource: recipes and
 * cooking how-to (quantities, technique, holding, storage) make up most of it, and
 * nutrition stays a small supporting pillar.
 */
export const editorialPillarSchema = z.enum([
  "recipes_meals",
  "nutrition_performance",
  "station_lifestyle",
  "operations_how_to",
]);

export type EditorialPillar = z.infer<typeof editorialPillarSchema>;

export const PILLAR_LABELS: Record<EditorialPillar, string> = {
  recipes_meals: "Meals & recipes",
  nutrition_performance: "Nutrition & performance",
  station_lifestyle: "Station life",
  operations_how_to: "How-to",
};

export const CONTENT_STRATEGY_TARGETS: Record<EditorialPillar, number> = {
  recipes_meals: 40,
  operations_how_to: 40,
  station_lifestyle: 10,
  nutrition_performance: 10,
};
