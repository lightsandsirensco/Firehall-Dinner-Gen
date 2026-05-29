/**
 * Editorial content strategy — balanced mix across the guide catalog.
 */

import { z } from "zod";

/** Target mix: ~40% recipes, ~30% nutrition, ~20% lifestyle, ~10% operations */
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
  nutrition_performance: 30,
  station_lifestyle: 20,
  operations_how_to: 10,
};
