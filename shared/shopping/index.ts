/**
 * Smart Shopping engine — public barrel.
 *
 * Recipe -> ShoppingService.addRecipeToSession() -> ShoppingSession (grouped,
 * normalized, deduplicated ShoppingList). See shared/shopping/README.md.
 */

export * from "./types";
export * from "./departments";
export * from "./units";
export * from "./quantity-parser";
export * from "./ingredient-normalizer";
export * from "./common-staples";
export * from "./staple-aliases";
export * from "./pantry-profile";
export * from "./shopping-service";
export * from "./persistence";
export * from "./recipe-inputs";
export { generateId } from "./id";
