import { HALL_EXPANSION_COUNT } from "../types.js";
import { HALL_EXPANSION_ADAPTED_RECIPES } from "./all-expansion-recipes.js";

export { HALL_EXPANSION_ADAPTED_RECIPES };

export function getHallExpansionRecipeBySlug(slug: string) {
  return HALL_EXPANSION_ADAPTED_RECIPES.find((r) => r.slug === slug);
}

if (HALL_EXPANSION_ADAPTED_RECIPES.length !== HALL_EXPANSION_COUNT) {
  throw new Error(
    `Expected ${HALL_EXPANSION_COUNT} hall expansion recipes, got ${HALL_EXPANSION_ADAPTED_RECIPES.length}`,
  );
}
