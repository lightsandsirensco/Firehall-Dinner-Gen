/**
 * Smart Shopping engine — public barrel.
 *
 * Recipe -> ShoppingService.addRecipeToSession() -> ShoppingSession (grouped,
 * normalized, deduplicated ShoppingList). See shared/shopping/README.md.
 */

export * from "./types";
export * from "./departments";
export * from "./ingredient-normalizer";
export * from "./common-staples";
export * from "./pantry-profile";
export * from "./shopping-service";
export { generateId } from "./id";
