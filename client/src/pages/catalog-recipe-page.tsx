import { getSmoothieCatalogItem } from "@shared/fuel-catalog/smoothies/catalog-data";
import { isBreakfastCatalogSlug } from "@shared/hall-catalog/gate";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import GoldenRecipePage from "@/pages/golden-recipe-page";
import SmoothieRecipePage from "@/pages/smoothie-recipe-page";
import { Redirect, useRoute } from "wouter";

/** Route approved catalog slugs — meals and smoothies share `/recipes/:slug`. */
export default function CatalogRecipePage() {
  const [, params] = useRoute("/recipes/:slug");
  const slug = params?.slug?.trim().toLowerCase() ?? "";

  if (slug && isBreakfastCatalogSlug(slug)) {
    return <Redirect to={approvedCatalogRecipePath(slug)} />;
  }

  if (slug && getSmoothieCatalogItem(slug)) {
    return <SmoothieRecipePage />;
  }

  return <GoldenRecipePage />;
}
