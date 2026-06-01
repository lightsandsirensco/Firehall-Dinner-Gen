import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { getSavedCount } from "@/lib/saved-meals";
import { fetchGoldenCatalogIndex } from "@/lib/golden-recipe-api";
import { approvedCatalogTotalQueryKey, fetchApprovedCatalogTotal } from "@/lib/approved-catalog-api";
import { APPROVED_CATALOG_TOTAL } from "@shared/meal-catalog/curated-count";
import { golden100HeroPath } from "@/lib/golden-100-hero";
import { FoodImage } from "@/components/mobile/food-image";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { buildRecipesIndexSeo } from "@shared/seo/metadata";
import { buildRecipeCardAlt } from "@shared/seo/recipe-image-seo";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildBreadcrumbListSchema, buildWebSiteSchema } from "@shared/seo/schema";
import { trackSearch } from "@/lib/analytics";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { InternalLinkHub } from "@/components/seo/internal-link-hub";
import { SiteFooter } from "@/components/site-footer";
import { LightsAndSirensCredit } from "@/components/brand/lights-and-sirens-credit";
import { isBreakfastMeal } from "@shared/hall-catalog/isolation";
import { MealTrustBadges } from "@/components/trust/meal-trust-badges";
import { RecipeGridSkeleton } from "@/components/mobile/loading-skeletons";
import { Button } from "@/components/ui/button";

function formatCategory(id: string): string {
  return id.replace(/_/g, " ");
}

export default function RecipesIndexPage() {
  const favCount = useMemo(() => getSavedCount(), []);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const lastTrackedSearch = useRef("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data: catalog, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["golden-catalog-index"],
    queryFn: fetchGoldenCatalogIndex,
    staleTime: Infinity,
  });

  const { data: approvedTotal = APPROVED_CATALOG_TOTAL } = useQuery({
    queryKey: approvedCatalogTotalQueryKey,
    queryFn: fetchApprovedCatalogTotal,
    staleTime: 120_000,
  });

  const recipeCount = approvedTotal;
  const origin = getSiteOrigin();

  const seoConfig = useMemo(() => buildRecipesIndexSeo(recipeCount), [recipeCount]);
  const seoJsonLd = useMemo(
    () => [
      buildWebSiteSchema(origin),
      buildBreadcrumbListSchema(origin, [
        { name: "Home", path: "/" },
        { name: "Recipes", path: "/recipes" },
      ]),
    ],
    [origin],
  );
  usePageSeo(seoConfig, seoJsonLd);

  const recipes = useMemo(() => {
    // Dinner catalog boundary: breakfast lives at /breakfast.
    const list = [...(catalog?.recipes ?? [])]
      .filter((r) => !isBreakfastMeal({ category: r.category, mealFormat: r.mealFormat, tags: r.tags }))
      .sort((a, b) => a.title.localeCompare(b.title));
    const q = debouncedQuery;
    if (!q) return list;
    return list.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.slug.includes(q) ||
        r.cuisine?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q),
    );
  }, [catalog?.recipes, debouncedQuery]);

  useEffect(() => {
    if (!debouncedQuery) {
      lastTrackedSearch.current = "";
      return;
    }
    if (lastTrackedSearch.current === debouncedQuery) return;
    lastTrackedSearch.current = debouncedQuery;
    trackSearch(debouncedQuery, recipes.length, "recipes_index");
  }, [debouncedQuery, recipes.length]);

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <SiteHeader activePage="explore" favCount={favCount} />
      <main className="max-w-[1100px] mx-auto px-page py-10 sm:py-14 flex-1" id="main-content">
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Recipes", path: "/recipes" },
          ]}
          className="mb-4"
        />

        <h1 className="font-heading tracking-tight text-3xl sm:text-4xl">
          Firefighter Meals &amp; Firehall Recipes
        </h1>
        <LightsAndSirensCredit variant="block" className="mt-4 max-w-lg" showFirefighterOwned />

        <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl">
          Browse firefighter dinners — classics, comfort food, BBQ, and lighter high-protein plates. Breakfast is
          separate from dinner — by design.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/explore"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            Explore tonight
          </Link>
        </div>

        <div className="mt-8 relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search firehall meals…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border/40 text-sm min-h-11"
            aria-label="Search firefighter meals"
          />
        </div>

        {isLoading && (
          <div className="mt-8" aria-busy="true">
            <RecipeGridSkeleton count={8} />
          </div>
        )}

        {isError && !isLoading && (
          <div className="mt-8 py-16 text-center" data-testid="recipes-index-error" role="alert">
            <p className="text-sm text-destructive">
              {(error as Error)?.message || "Could not load the recipe catalog."}
            </p>
            <Button variant="outline" className="mt-4 min-h-11" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && recipes.length > 0 && (
          <section aria-labelledby="recipe-grid-heading" className="mt-8">
            <h2 id="recipe-grid-heading" className="sr-only">
              All recipes
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {recipes.map((r) => (
                <li key={r.slug}>
                  <Link href={`/recipes/${r.slug}`}>
                    <article
                      className={cn(
                        "group rounded-2xl overflow-hidden bg-card/40 ring-1 ring-border/20",
                        "hover:ring-primary/30 transition-all h-full flex flex-col",
                      )}
                    >
                      <div className="aspect-[4/5] bg-zinc-950 overflow-hidden">
                        <FoodImage
                          src={r.thumbImage || golden100HeroPath(r.slug)}
                          alt={buildRecipeCardAlt(r.title)}
                          layout="card-fill"
                          fit="cover"
                          focal="center"
                          overlay="none"
                          cinematicGrade
                          rounded="none"
                          debugId={{ context: "recipes-index", slug: r.slug, title: r.title }}
                        />
                      </div>
                      <div className="p-3 flex-1 flex flex-col gap-2">
                        <h3 className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {r.title}
                        </h3>
                        <MealTrustBadges
                          input={{
                            category: r.category,
                            tags: r.tags,
                            cookTime: r.cookTime,
                            cuisine: r.cuisine,
                          }}
                          max={2}
                        />
                        <p className="text-xs text-muted-foreground capitalize">
                          {formatCategory(r.category)} · {r.cookTime} min
                        </p>
                      </div>
                    </article>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!isLoading && !isError && recipes.length === 0 && (
          <p className="mt-8 text-sm text-muted-foreground">No recipes match &ldquo;{query}&rdquo;.</p>
        )}

        <InternalLinkHub className="mt-12" showPopular={false} />
      </main>
      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
