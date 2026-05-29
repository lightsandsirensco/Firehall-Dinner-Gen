/**
 * Smoothie / fuel recipe page schema (re-export).
 * Canonical definitions live in fuel-catalog/schema.ts.
 */

export {
  fuelRecipePageSchema as smoothieRecipePageSchema,
  fuelCatalogIndexSchema as smoothieCatalogIndexSchema,
  fuelIngredientSchema as smoothieIngredientSchema,
  fuelStepSchema as smoothieStepSchema,
  fuelNutritionSchema as smoothieNutritionSchema,
  FUEL_RECIPE_CONTENT_VERSION as SMOOTHIE_RECIPE_CONTENT_VERSION,
  type FuelRecipePage as SmoothieRecipePage,
  type FuelCatalogIndex as SmoothieCatalogIndex,
  type FuelIngredient as SmoothieIngredient,
} from "./fuel-catalog/schema.js";
