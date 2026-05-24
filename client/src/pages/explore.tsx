import { useRef } from "react";
import { useRoute } from "wouter";
import { ExploreRecipeCardRegistry } from "@/lib/explore-recipe";
import { ExploreDiscoveryPage } from "@/pages/explore-discovery-page";
import { ExploreRecipeDetailPage } from "@/pages/explore-recipe-detail-page";

export default function ExplorePage() {
  const registryRef = useRef(new ExploreRecipeCardRegistry());
  const [recipeRouteMatch] = useRoute("/explore/recipe/:id");

  if (recipeRouteMatch) {
    return <ExploreRecipeDetailPage registryRef={registryRef} />;
  }

  return <ExploreDiscoveryPage registryRef={registryRef} />;
}
