import type { ProteinDealMatchedRecipe, ProteinType } from "../../shared/protein-deals/types.js";
import {
  matchRecipesForProteinDeal as matchFromCatalog,
  resetProteinMatcherCatalogCache,
} from "../../deals_providers/protein-matcher.js";
import { proteinDealLabel } from "../../shared/protein-deals/types.js";
import type { ProteinDealRow } from "../../shared/protein-deals/types.js";

export function matchRecipesForProteinDeal(
  deal: ProteinDealRow,
  limit = 12,
): ProteinDealMatchedRecipe[] {
  const label = proteinDealLabel(deal);
  return matchFromCatalog(
    deal.protein_type,
    label,
    deal.protein_type,
    deal.protein_cut,
    limit,
  );
}

/** @deprecated */
export function matchRecipesForDeal(
  normalizedItem: ProteinType,
  itemName: string,
  proteinType: string | null = null,
  cut: string | null = null,
  limit = 12,
): ProteinDealMatchedRecipe[] {
  return matchFromCatalog(normalizedItem, itemName, proteinType, cut, limit);
}

export { resetProteinMatcherCatalogCache as resetRecipeMatchCatalogCache };
