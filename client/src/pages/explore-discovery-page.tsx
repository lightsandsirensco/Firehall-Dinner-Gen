import { useLocation } from "wouter";
import { SiteHeader } from "@/components/site-header";
import { AppPageHeader } from "@/components/mobile/app-page-header";
import { SiteFooter } from "@/components/site-footer";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { ExploreCatalogBrowser } from "@/components/explore-catalog-browser";
import { getSavedCount } from "@/lib/saved-meals";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { buildExploreSeo } from "@shared/seo/metadata";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildBreadcrumbListSchema } from "@shared/seo/schema";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { useMemo } from "react";

export function ExploreDiscoveryPage() {
  const [, navigate] = useLocation();
  const favCount = getSavedCount();
  const origin = getSiteOrigin();
  const exploreSeo = buildExploreSeo();
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

      <div className={cn(app.main, "pt-2")}>
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Explore", path: "/explore" },
          ]}
        />
      </div>

      <AppPageHeader
        variant="feed"
        title="Full Catalog"
        subtitle="Browse every approved Firehall Meals recipe."
      />

      <main className={cn(app.mainFeed, "pb-10 pt-2 sm:pb-14")}>
        <ExploreCatalogBrowser
          onRecipeClick={(slug) => navigate(`/recipes/${encodeURIComponent(slug)}`)}
        />
      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
