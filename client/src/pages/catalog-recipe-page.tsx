import { getSmoothieCatalogItem } from "@shared/fuel-catalog/smoothies/catalog-data";
import GoldenRecipePage from "@/pages/golden-recipe-page";
import SmoothieRecipePage from "@/pages/smoothie-recipe-page";
import { useRoute } from "wouter";

/** Route approved catalog slugs — meals and smoothies share `/recipes/:slug`. */
export default function CatalogRecipePage() {
  const [, params] = useRoute("/recipes/:slug");
  const slug = params?.slug?.trim().toLowerCase() ?? "";

  if (slug && getSmoothieCatalogItem(slug)) {
    return <SmoothieRecipePage />;
  }

  return <GoldenRecipePage />;
}
