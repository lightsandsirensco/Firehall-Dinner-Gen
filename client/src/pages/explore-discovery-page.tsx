import { Link, useLocation } from "wouter";
import { SiteHeader } from "@/components/site-header";
import { AppPageHeader } from "@/components/mobile/app-page-header";
import { SiteFooter } from "@/components/site-footer";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { ExploreCatalogBrowser } from "@/components/explore-catalog-browser";
import { ExploreErrorBoundary } from "@/components/explore-error-boundary";
import { getSavedCount } from "@/lib/saved-meals";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { buildExploreSeo } from "@shared/seo/metadata";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildBreadcrumbListSchema } from "@shared/seo/schema";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { approvedCatalogTotalQueryKey, fetchApprovedCatalogTotal } from "@/lib/approved-catalog-api";
import {
  APPROVED_CATALOG_TOTAL,
  formatMarketingRecipeCount,
} from "@shared/meal-catalog/curated-count";

export function ExploreDiscoveryPage() {
  const [, navigate] = useLocation();
  const favCount = getSavedCount();
  const origin = getSiteOrigin();

  const { data: recipeCount = APPROVED_CATALOG_TOTAL } = useQuery({
    queryKey: approvedCatalogTotalQueryKey,
    queryFn: fetchApprovedCatalogTotal,
    staleTime: 120_000,
  });

  const exploreSeo = useMemo(() => buildExploreSeo(recipeCount), [recipeCount]);
  const exploreJsonLd = useMemo(
    () => [
      buildBreadcrumbListSchema(origin, [
        { name: "Home", path: "/" },
        { name: "Explore", path: "/explore" },
      ]),
    ],
    [origin],
  );
  usePageSeo(exploreSeo, exploreJsonLd);

  return (
    <div className={cn(app.page, "pb-safe-nav")}>
      <SiteHeader activePage="explore" favCount={favCount} />

      <div className="hidden md:block border-b border-border/20 bg-muted/15">
        <div className={cn(app.main, "pt-2 pb-0")}>
          <SeoBreadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Explore", path: "/explore" },
            ]}
          />
        </div>
        <div className={cn(app.main, "py-4 pt-2")}>
          <AppPageHeader
            variant="feed"
            title="Explore"
            subtitle="Tap a meal when you want to browse — or pick tonight in under a minute."
          />
        </div>
      </div>

      <div className="md:hidden border-b border-border/20 bg-muted/15">
        <div className={cn(app.main, "pt-2")}>
          <SeoBreadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Explore", path: "/explore" },
            ]}
          />
        </div>
        <div className={cn(app.main, "py-4 px-page")}>
          <h1 className={app.titlePage}>Explore</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Browse hall-tested recipes. Can&apos;t decide?{" "}
            <Link href="/generator" className="font-semibold text-primary hover:underline">
              Pick Tonight&apos;s Meal
            </Link>
            .
          </p>
        </div>
      </div>

      <main className={cn(app.mainFeed, "pb-10 pt-3 md:pt-2 sm:pb-14")}>
        {/* Single page <h1> lives in the responsive header above (mobile block
            or AppPageHeader on desktop) — do not add another one here. */}
        <ExploreErrorBoundary>
          <ExploreCatalogBrowser
            totalRecipeCount={recipeCount}
            onRecipeClick={(slug) => navigate(approvedCatalogRecipePath(slug))}
          />
        </ExploreErrorBoundary>
      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
