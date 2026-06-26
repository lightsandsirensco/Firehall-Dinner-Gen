import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { getSavedCount } from "@/lib/saved-meals";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildTopRatedRecipesSeo } from "@shared/seo/metadata";
import { buildBreadcrumbListSchema, buildWebSiteSchema } from "@shared/seo/schema";
import {
  fetchTopRatedRecipes,
  recipePathForRatingSlug,
  topRatedRecipesQueryKey,
} from "@/lib/recipe-crew-ratings-api";
import { approvedCatalogQueryKey, fetchApprovedCatalog } from "@/lib/approved-catalog-api";
import { RecipeCrewRatingBadges } from "@/components/recipe-crew-rating/recipe-crew-rating-badges";
import { CREW_RATING_MIN_VOTES_TO_SHOW_COUNT } from "@shared/recipe-crew-ratings/constants";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

export default function TopRatedRecipesPage() {
  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();
  const seoConfig = useMemo(() => buildTopRatedRecipesSeo(), []);
  const seoJsonLd = useMemo(
    () => [
      buildWebSiteSchema(origin),
      buildBreadcrumbListSchema(origin, [
        { name: "Home", path: "/" },
        { name: "Explore", path: "/explore" },
        { name: "Top Rated Recipes", path: "/top-rated-recipes" },
      ]),
    ],
    [origin],
  );
  usePageSeo(seoConfig, seoJsonLd);

  const { data: topRated = [], isLoading } = useQuery({
    queryKey: topRatedRecipesQueryKey,
    queryFn: () => fetchTopRatedRecipes(48),
    staleTime: 60_000,
  });

  const { data: catalog } = useQuery({
    queryKey: approvedCatalogQueryKey,
    queryFn: fetchApprovedCatalog,
    staleTime: 10 * 60 * 1000,
  });

  const titleBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const recipe of catalog?.recipes ?? []) {
      map.set(recipe.slug, recipe.title);
    }
    map.set("firefighter-red-lead-recipe", "Firefighter Red Lead Recipe");
    return map;
  }, [catalog?.recipes]);

  return (
    <div className={cn(app.page, "flex flex-col min-h-screen min-h-[100dvh]")}>
      <SiteHeader activePage="explore" favCount={favCount} />

      <main className={cn(app.main, "flex-1 py-8 sm:py-12")}>
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Explore", path: "/explore" },
            { name: "Top Rated Recipes", path: "/top-rated-recipes" },
          ]}
        />

        <h1 className={cn(app.titlePage, "mt-6")}>Top Rated Recipes</h1>
        <p className={cn(app.lead, "mt-4 max-w-2xl")}>
          Crew-tested firehall meals ranked by Would Cook Again approval. Only recipes with{" "}
          {CREW_RATING_MIN_VOTES_TO_SHOW_COUNT}+ firefighter ratings appear here.
        </p>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading crew ratings…</p>
        ) : topRated.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">
            No recipes have enough crew ratings yet. Be the first to vote on crew favorites.
          </p>
        ) : (
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="top-rated-recipes-list">
            {topRated.map((entry, index) => {
              const title =
                titleBySlug.get(entry.recipeSlug) ??
                entry.recipeSlug.replace(/-/g, " ").replace(/^explore /, "Explore #");
              return (
                <li key={entry.recipeSlug}>
                  <Link
                    href={recipePathForRatingSlug(entry.recipeSlug)}
                    className="block h-full rounded-2xl border border-border/25 bg-card/30 p-5 hover:border-primary/30 transition-colors touch-manipulation"
                  >
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      #{index + 1} crew pick
                    </p>
                    <h2 className="mt-2 font-heading text-lg text-foreground line-clamp-2">{title}</h2>
                    <p className="mt-2 text-sm font-medium text-primary">{entry.approvalLabel}</p>
                    {entry.badges.length > 0 && (
                      <RecipeCrewRatingBadges badges={entry.badges} className="mt-3" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
