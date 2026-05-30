import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { useHomeSeo } from "@/lib/seo/use-home-seo";
import { fetchCuratedRecipeTotal, fetchGoldenCatalogIndex } from "@/lib/golden-recipe-api";
import { APPROVED_CATALOG_TOTAL } from "@shared/meal-catalog/curated-count";
import type { GoldenCatalogIndexEntry } from "@shared/golden-100/recipe-page-schema";
import { HomeHero } from "@/components/home/home-hero";
import { HomeSeoIntro } from "@/components/home/home-seo-intro";
import { HomeTrustStrip } from "@/components/home/home-trust-strip";
import { HomeHowItWorks } from "@/components/home/home-how-it-works";
import { HomeFeaturedMeals } from "@/components/home/home-featured-meals";
import { HomeWhyCrews } from "@/components/home/home-why-crews";
import { HomeSeoEditorial } from "@/components/home/home-seo-editorial";
import { HomeCtaBand } from "@/components/home/home-cta-band";
import { HomeFaqSection } from "@/components/home/home-faq-section";
import { HomeFooter } from "@/components/home/home-footer";
import { HomeLightsAuthenticity } from "@/components/brand/home-lights-authenticity";
import { HOME_FEATURED_SLUGS } from "@/components/home/home-constants";

function pickFeaturedMeals(recipes: GoldenCatalogIndexEntry[]): GoldenCatalogIndexEntry[] {
  const bySlug = new Map(recipes.map((r) => [r.slug, r]));
  return HOME_FEATURED_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (r): r is GoldenCatalogIndexEntry => Boolean(r),
  );
}

const GOLDEN_CATEGORY_COUNT = 12;

export default function Home() {
  const { data: catalog } = useQuery({
    queryKey: ["golden-catalog-home"],
    queryFn: fetchGoldenCatalogIndex,
    staleTime: 120_000,
  });

  const { data: recipeCount = APPROVED_CATALOG_TOTAL } = useQuery({
    queryKey: ["curated-recipe-total-home"],
    queryFn: fetchCuratedRecipeTotal,
    staleTime: 120_000,
  });

  useHomeSeo(recipeCount);

  const featured = useMemo(
    () => (catalog?.recipes?.length ? pickFeaturedMeals(catalog.recipes) : []),
    [catalog],
  );

  return (
    <div className="home-page page-shell min-h-screen min-h-[100dvh] bg-background overflow-x-hidden">
      <SiteHeader activePage="home" />

      <HomeHero recipeCount={recipeCount} />
      <HomeSeoIntro recipeCount={recipeCount} />

      <main>
        <HomeLightsAuthenticity />
        <HomeTrustStrip recipeCount={recipeCount} categoryCount={GOLDEN_CATEGORY_COUNT} />
        <HomeHowItWorks />
        <HomeFeaturedMeals meals={featured} />
        <HomeWhyCrews />
        <HomeSeoEditorial />
        <HomeCtaBand />
        <HomeFaqSection />
      </main>

      <HomeFooter />
    </div>
  );
}
