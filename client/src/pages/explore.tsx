import { useRef, useMemo } from "react";
import { useRoute, Redirect } from "wouter";
import { ExploreRecipeCardRegistry } from "@/lib/explore-recipe";
import { ExploreDiscoveryPage } from "@/pages/explore-discovery-page";
import { ExploreRecipeDetailPage } from "@/pages/explore-recipe-detail-page";
import { resolveExploreLegacyRedirect } from "@/lib/explore-navigation";

export default function ExplorePage() {
  const registryRef = useRef(new ExploreRecipeCardRegistry());
  const [recipeRouteMatch, recipeRouteParams] = useRoute("/explore/recipe/:id");

  const legacyRedirect = useMemo(() => {
    if (!recipeRouteMatch) return null;
    const params = new URLSearchParams(window.location.search);
    return resolveExploreLegacyRedirect(params.get("slug"));
  }, [recipeRouteMatch, recipeRouteParams?.id]);

  if (legacyRedirect) {
    return <Redirect to={legacyRedirect} replace />;
  }

  if (recipeRouteMatch) {
    return <ExploreRecipeDetailPage registryRef={registryRef} />;
  }

  return <ExploreDiscoveryPage />;
}
