/** @deprecated Use @shared/protein-deals/types — legacy re-exports */
export type {
  ProteinType,
  ProteinDealsMode,
  ProteinDealRow,
  ProteinDealMatchedRecipe,
  ProteinDealsTeaser,
  ProteinDealsResponse,
} from "../protein-deals/types.js";

export {
  PROTEIN_TYPES,
  proteinDealLabel,
  formatProteinPrice,
} from "../protein-deals/types.js";

// Legacy aliases for gradual migration
export type { ProteinType as GroceryNormalizedItem } from "../protein-deals/types.js";
export type { ProteinDealRow as GroceryDealRow } from "../protein-deals/types.js";
export type { ProteinDealMatchedRecipe as GroceryDealMatchedRecipe } from "../protein-deals/types.js";
export type { ProteinDealsTeaser as GroceryDealsTeaser } from "../protein-deals/types.js";
export type { ProteinDealsResponse as GroceryDealsResponse } from "../protein-deals/types.js";
export type { ProteinDealsMode as GroceryDealsMode } from "../protein-deals/types.js";

export interface GroceryDealsHighlight {
  message: string | null;
  deal: import("../protein-deals/types.js").ProteinDealRow | null;
}
